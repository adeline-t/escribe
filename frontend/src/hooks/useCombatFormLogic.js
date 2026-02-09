import { useEffect, useMemo, useState } from "react";

/**
 * Hook layer pour les formulaires de passe (création + édition inline).
 *
 * Architecture:
 * - Utilitaires purs: parsing des champs "tokenisés", normalisation des détails.
 * - useLexiconOptions: construit toutes les options de select à partir du lexique.
 * - useSharedCombatStepLogic: moteur métier commun (mutations + helpers UI).
 * - useStepFormCore: adapte le moteur au contexte multi-items ou single-item.
 * - Wrappers publics:
 *   - useClassicCombatStepFormLogic / useSabreCombatStepFormLogic (création)
 *   - useClassicInlineStepFormLogic / useSabreInlineStepFormLogic (édition)
 *
 * Objectif:
 * - Une seule logique métier pour réduire les divergences entre création et édition.
 * - API stable côté composants (CombatStepForm / StepInlineEditorModal).
 */
const INLINE_INDEX = 0;

/**
 * @typedef {Object} StepItem
 * @property {string} [mode]
 * @property {string} [role]
 * @property {string} [offensive]
 * @property {string} [action]
 * @property {Array<{action?: string, attribute?: string}>} [actionDetails]
 * @property {string} [target]
 * @property {string} [attackMove]
 * @property {string[]} [attackAttribute]
 * @property {string} [defense]
 * @property {Array<{defense?: string, position?: string, attribute?: string}>} [defenseDetails]
 * @property {string} [paradeNumber]
 * @property {string} [paradeAttribute]
 * @property {string} [defendMove]
 * @property {boolean} [noteOverrides]
 */

/**
 * @typedef {Object} BuilderSelection
 * @property {string} attackMove
 * @property {string} defendMove
 * @property {string} paradeAttribute
 * @property {string} attackComplement
 * @property {string} attackMoveComplement
 * @property {string} defendMoveComplement
 * @property {string} paradeComplement
 * @property {string} defenseType
 * @property {string} prepType
 * @property {string} prepTargetMode
 * @property {string} prepPositionComplement
 */

/**
 * @typedef {Object} OptionItem
 * @property {string} value
 * @property {string} label
 */

// État UI local utilisé par les sélecteurs "constructeurs" (base + compléments).
// Ce n'est pas stocké tel quel en base; il sert uniquement à piloter le formulaire.
const EMPTY_BUILDER_SELECTION = {
  attackMove: "",
  defendMove: "",
  paradeAttribute: "",
  attackComplement: "",
  attackMoveComplement: "",
  defendMoveComplement: "",
  paradeComplement: "",
  defenseType: "",
  prepType: "",
  prepTargetMode: "position",
  prepPositionComplement: "",
};

/**
 * Crée une copie d'un état UI de sélection "builder".
 *
 * @returns {BuilderSelection}
 */
function createBuilderSelection() {
  return { ...EMPTY_BUILDER_SELECTION };
}

/**
 * Convertit une chaine "a · b · c" en tableau de tokens nettoyés.
 *
 * @param {string} value
 * @returns {string[]}
 */
function splitTokens(value) {
  if (!value) return [];
  return value
    .split(" · ")
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * Convertit une liste de tokens en chaine persistable "a · b · c".
 *
 * @param {string[]} values
 * @returns {string}
 */
function joinTokens(values) {
  return values.join(" · ");
}

/**
 * Découpe un mouvement en:
 * - base (premier token présent dans baseOptions)
 * - compléments (autres tokens)
 *
 * @param {string} value
 * @param {string[]} baseOptions
 * @returns {{base: string, complements: string[]}}
 */
function getMoveParts(value, baseOptions) {
  const tokens = splitTokens(value);
  const base = tokens.find((token) => baseOptions.includes(token)) ?? "";
  const complements = tokens.filter((token) => token !== base);
  return { base, complements };
}

/**
 * Retourne des actionDetails normalisés, avec fallback legacy.
 *
 * @param {StepItem} item
 * @returns {Array<{action: string, attribute: string}>}
 */
function getActionDetails(item) {
  if (Array.isArray(item.actionDetails) && item.actionDetails.length) {
    return item.actionDetails.map((detail) => ({
      action: detail?.action ?? "",
      attribute: detail?.attribute ?? "",
    }));
  }
  if (item.action || (item.attackAttribute && item.attackAttribute.length)) {
    return [
      {
        action: item.action ?? "",
        attribute: item.attackAttribute?.[0] ?? "",
      },
    ];
  }
  return [];
}

/**
 * Retourne des defenseDetails normalisés, avec fallback legacy.
 *
 * @param {StepItem} item
 * @returns {Array<{defense: string, position: string, attribute: string}>}
 */
function getDefenseDetails(item) {
  if (Array.isArray(item.defenseDetails) && item.defenseDetails.length) {
    return item.defenseDetails.map((detail) => ({
      defense: detail?.defense ?? "",
      position: detail?.position ?? "",
      attribute: detail?.attribute ?? "",
    }));
  }
  if (item.defense || item.paradeNumber || item.paradeAttribute) {
    return [
      {
        defense: item.defense ?? "",
        position: item.paradeNumber ?? "",
        attribute: item.paradeAttribute ?? "",
      },
    ];
  }
  return [];
}

/**
 * Déduit le "mode v2" (attack/defense/preparation/note) à partir du role
 * et des champs métiers, pour rester compatible avec les anciennes données.
 *
 * @param {StepItem} item
 * @returns {"attack"|"defense"|"preparation"|"note"}
 */
function getV2Mode(item) {
  // Le rôle explicite reste prioritaire.
  if (item.role === "defense") return "defense";
  if (item.role === "none") return "note";
  if (item.role === "preparation") return "preparation";
  const hasAttackBits =
    Boolean(item.offensive) ||
    Boolean(item.target) ||
    Boolean(item.attackMove) ||
    (Array.isArray(item.attackAttribute) && item.attackAttribute.length > 0);
  const actionDetails = getActionDetails(item);
  const hasPrepBits = actionDetails.some((detail) => detail.action);
  if (!hasAttackBits && (hasPrepBits || actionDetails.length > 0)) {
    // Compat legacy: un ancien enregistrement peut ne pas avoir role=preparation.
    return "preparation";
  }
  return "attack";
}

/**
 * Déduit le type de défense ("parade" / "esquive") depuis un détail.
 *
 * @param {{defense?: string, position?: string, attribute?: string}} defenseDetail
 * @returns {"parade"|"esquive"|""}
 */
function getDefenseTypeFromDetail(defenseDetail) {
  const defenseLabel = String(defenseDetail?.defense ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  const looksLikeParade =
    defenseLabel === "parade" || defenseLabel.includes("parade");
  return looksLikeParade || defenseDetail?.position || defenseDetail?.attribute
    ? "parade"
    : defenseDetail?.defense
      ? "esquive"
      : "";
}

/**
 * Normalise une valeur textuelle pour comparaison souple
 * (accents/casse/espace/punctuations légères).
 *
 * @param {string} value
 * @returns {string}
 */
function normalizeLooseLabel(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const GENERIC_ATTACK_MARKERS = new Set([
  "attaque",
  "attack",
  "preparation",
  "préparation",
]);

function isGenericAttackMarker(value) {
  const normalized = normalizeLooseLabel(value);
  return GENERIC_ATTACK_MARKERS.has(normalized);
}

/**
 * Normalise et mémorise toutes les options d'affichage du formulaire
 * (tri favoris + fallback de listes), communes à création et édition.
 *
 * @param {{
 *   normalizedLexicon: any,
 *   favoriteKeys: any,
 *   orderOptions: (values: string[], key: string) => OptionItem[]
 * }} params
 * @returns {{
 *   offensiveOptions: OptionItem[],
 *   attackAttributeOptions: OptionItem[],
 *   targetOptions: OptionItem[],
 *   defensiveOptions: OptionItem[],
 *   paradeNumberOptions: OptionItem[],
 *   attackMoveBaseOptions: OptionItem[],
 *   attackMoveComplementOptions: string[],
 *   paradeComplementOptions: string[],
 *   preparationTypeOptions: string[],
 *   prepTypeList: string[],
 *   attackMoveBaseValues: string[],
 * }}
 */
function useLexiconOptions({ normalizedLexicon, favoriteKeys, orderOptions }) {
  // Toutes les listes d'options sont normalisées et ordonnées au même endroit,
  // pour garantir le même comportement entre formulaire principal et édition inline.
  const offensiveOptions = useMemo(
    () =>
      orderOptions(normalizedLexicon.offensive ?? [], favoriteKeys.offensive),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const attackAttributeOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.attackAttribute ?? [],
        favoriteKeys.attackAttribute,
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const targetOptions = useMemo(
    () => orderOptions(normalizedLexicon.cible ?? [], favoriteKeys.target),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const defensiveOptions = useMemo(
    () =>
      orderOptions(normalizedLexicon.defensive ?? [], favoriteKeys.defensive),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const paradeNumberOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.paradeNumber ?? [],
        favoriteKeys.paradeNumber,
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const attackMoveBaseOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.attackMoveBase ?? normalizedLexicon.attackMove ?? [],
        favoriteKeys.attackMove,
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const attackMoveComplementOptions = useMemo(
    () => normalizedLexicon.attackMoveComplement ?? [],
    [normalizedLexicon],
  );
  const paradeComplementOptions = useMemo(
    () => normalizedLexicon.paradeAttribute ?? [],
    [normalizedLexicon],
  );
  const preparationTypeOptions = useMemo(
    () => normalizedLexicon.preparationTypes ?? [],
    [normalizedLexicon],
  );
  const prepTypeList = useMemo(
    () =>
      preparationTypeOptions.length
        ? preparationTypeOptions
        : (normalizedLexicon.action ?? []),
    [preparationTypeOptions, normalizedLexicon],
  );
  const attackMoveBaseValues = useMemo(
    () => attackMoveBaseOptions.map((option) => option.value),
    [attackMoveBaseOptions],
  );

  return {
    offensiveOptions,
    attackAttributeOptions,
    targetOptions,
    defensiveOptions,
    paradeNumberOptions,
    attackMoveBaseOptions,
    attackMoveComplementOptions,
    paradeComplementOptions,
    preparationTypeOptions,
    prepTypeList,
    attackMoveBaseValues,
  };
}

/**
 * Moteur métier commun, indépendant du contexte d'affichage.
 *
 * Le moteur ne sait pas s'il est utilisé en:
 * - création (multi participants), ou
 * - édition inline (single item).
 *
 * Ce comportement est injecté via les callbacks:
 * - `getItem(index)` pour lire la donnée,
 * - `patchItem(index, patch)` pour écrire la donnée,
 * - `getBuilderSelection(index)` / `patchBuilderSelection(index, patch)` pour l'UI locale.
 *
 * @param {{
 *   normalizedLexicon: any,
 *   favoriteKeys: any,
 *   orderOptions: (values: string[], key: string) => OptionItem[],
 *   getItem: (index: number) => StepItem | undefined,
 *   patchItem: (index: number, patch: Partial<StepItem>) => void,
 *   getBuilderSelection: (index: number) => BuilderSelection | undefined,
 *   patchBuilderSelection: (index: number, patch: Partial<BuilderSelection>) => void,
 * }} params
 */
function useSharedCombatStepLogic({
  normalizedLexicon,
  favoriteKeys,
  orderOptions,
  getItem,
  patchItem,
  getBuilderSelection,
  patchBuilderSelection,
}) {
  // Core unique: toute la logique métier commune passe ici.
  // Le contexte (multi participants ou inline) est injecté via les adaptateurs.
  const options = useLexiconOptions({
    normalizedLexicon,
    favoriteKeys,
    orderOptions,
  });

  function readItem(index) {
    return getItem(index) ?? {};
  }

  /**
   * Écrit une liste tokenisée dans un champ string du modèle.
   */
  function updateTokenList(index, key, nextList) {
    patchItem(index, { [key]: joinTokens(nextList) });
  }

  /**
   * Met à jour l'état local de sélection d'un bloc builder.
   */
  function updateBuilderSelection(index, patch) {
    // Met à jour uniquement l'état UI temporaire des sélecteurs.
    patchBuilderSelection(index, patch);
  }

  /**
   * Remplace la base du mouvement tout en conservant les compléments existants.
   */
  function updateMoveBase(index, key, base, baseOptions) {
    const { complements } = getMoveParts(readItem(index)[key], baseOptions);
    const next = base
      ? [base, ...complements.filter((item) => item !== base)]
      : complements;
    updateTokenList(index, key, next);
  }

  /**
   * Ajoute un complément de mouvement (sans duplication).
   */
  function addMoveComplement(index, key, value, baseOptions) {
    if (!value) return;
    const { base, complements } = getMoveParts(readItem(index)[key], baseOptions);
    if (complements.includes(value)) return;
    const next = base ? [base, ...complements, value] : [...complements, value];
    updateTokenList(index, key, next);
  }

  /**
   * Retire un complément de mouvement.
   */
  function removeMoveComplement(index, key, value, baseOptions) {
    const { base, complements } = getMoveParts(readItem(index)[key], baseOptions);
    const nextComplements = complements.filter((item) => item !== value);
    const next = base ? [base, ...nextComplements] : nextComplements;
    updateTokenList(index, key, next);
  }

  /**
   * Lit les attributs de défense (tokenisés) depuis defenseDetails[0].
   * Accepte un index (cas multi) ou un item (cas inline wrapper).
   */
  function getDefenseAttributeTokens(itemOrIndex) {
    const item =
      typeof itemOrIndex === "number" ? readItem(itemOrIndex) : itemOrIndex;
    const detail = getDefenseDetails(item)[0];
    return splitTokens(detail?.attribute ?? "");
  }

  /**
   * Écrit defenseDetails et synchronise les champs racine legacy.
   */
  function updateDefenseDetails(index, nextDetails) {
    // Défense legacy + v2: on garde les champs racine synchronisés avec defenseDetails[0]
    // pour préserver la compatibilité de lecture/écriture existante.
    patchItem(index, {
      defenseDetails: nextDetails,
      defense: nextDetails[0]?.defense ?? "",
      paradeNumber: nextDetails[0]?.position ?? "",
      paradeAttribute: nextDetails[0]?.attribute ?? "",
    });
  }

  /**
   * Réécrit les attributs de défense tokenisés dans defenseDetails[0].
   */
  function setDefenseAttributeTokens(index, tokens) {
    const list = getDefenseDetails(readItem(index));
    const first = list[0] ?? { defense: "", position: "", attribute: "" };
    const next = [
      { ...first, attribute: joinTokens(tokens) },
      ...list.slice(1),
    ];
    updateDefenseDetails(index, next);
  }

  /**
   * Ajoute une ligne vide dans defenseDetails.
   */
  function addDefenseDetail(index) {
    const list = getDefenseDetails(readItem(index));
    updateDefenseDetails(index, [
      ...list,
      { defense: "", position: "", attribute: "" },
    ]);
  }

  /**
   * Modifie une ligne précise de defenseDetails.
   */
  function updateDefenseDetail(index, detailIndex, patch) {
    const list = getDefenseDetails(readItem(index));
    const next = list.map((detail, idx) =>
      idx === detailIndex ? { ...detail, ...patch } : detail,
    );
    updateDefenseDetails(index, next);
  }

  /**
   * Supprime une ligne précise de defenseDetails.
   */
  function removeDefenseDetail(index, detailIndex) {
    const list = getDefenseDetails(readItem(index));
    updateDefenseDetails(
      index,
      list.filter((_, idx) => idx !== detailIndex),
    );
  }

  /**
   * Met à jour les infos de préparation via actionDetails[0] + action racine.
   */
  function updatePrepDetails(index, action, attribute) {
    patchItem(index, {
      role: "preparation",
      actionDetails: [{ action, attribute }],
      action,
    });
  }

  /**
   * Ajoute un attribut d'attaque (liste sans doublons).
   */
  function addAttackComplement(index, value) {
    if (!value) return;
    const list = Array.isArray(readItem(index).attackAttribute)
      ? readItem(index).attackAttribute
      : [];
    if (list.includes(value)) return;
    patchItem(index, { attackAttribute: [...list, value] });
  }

  /**
   * Retire un attribut d'attaque.
   */
  function removeAttackComplement(index, value) {
    const list = Array.isArray(readItem(index).attackAttribute)
      ? readItem(index).attackAttribute
      : [];
    patchItem(index, {
      attackAttribute: list.filter((item) => item !== value),
    });
  }

  /**
   * Résout le type de défense: priorité au builder UI, fallback données persistées.
   */
  function resolveDefenseType(item, index) {
    const defenseDetail = getDefenseDetails(item ?? readItem(index))[0] ?? {};
    const builderDefenseType = getBuilderSelection(index)?.defenseType;
    return (
      builderDefenseType && String(builderDefenseType).trim()
        ? builderDefenseType
        : getDefenseTypeFromDetail(defenseDetail)
    );
  }

  /**
   * Résout la valeur "action d'attaque" affichée dans le select.
   *
   * Compat:
   * - ancien format: offensive="attaque", action="coup de pointe"
   * - nouveau format: offensive="coup de pointe"
   *
   * @param {StepItem|number} itemOrIndex
   * @returns {string}
   */
  function getAttackActionValue(itemOrIndex) {
    const item =
      typeof itemOrIndex === "number" ? readItem(itemOrIndex) : itemOrIndex;
    const offensive = String(item?.offensive ?? "").trim();
    const detailAction = String(getActionDetails(item ?? {})[0]?.action ?? "").trim();
    const legacyAction = String(item?.action ?? "").trim();

    const optionByNormalized = new Map(
      options.offensiveOptions.map((option) => [
        normalizeLooseLabel(option.value),
        option.value,
      ]),
    );

    const preferred = [];
    if (offensive && !isGenericAttackMarker(offensive)) preferred.push(offensive);
    if (detailAction) preferred.push(detailAction);
    if (legacyAction) preferred.push(legacyAction);
    if (offensive) preferred.push(offensive);

    for (const candidate of preferred) {
      const canonical = optionByNormalized.get(normalizeLooseLabel(candidate));
      if (canonical) return canonical;
    }
    return preferred[0] ?? "";
  }

  /**
   * Résout la valeur "action de défense" affichée dans le select esquive.
   *
   * Compat:
   * - accepte des labels legacy (casse/accents différents)
   * - conserve une valeur hors lexique pour éviter un select visuellement vide
   *
   * @param {StepItem|number} itemOrIndex
   * @returns {string}
   */
  function getDefenseActionValue(itemOrIndex) {
    const item =
      typeof itemOrIndex === "number" ? readItem(itemOrIndex) : itemOrIndex;
    const defenseDetail = getDefenseDetails(item ?? {})[0] ?? {};
    const detailDefense = String(defenseDetail?.defense ?? "").trim();
    const legacyDefense = String(item?.defense ?? "").trim();

    const optionByNormalized = new Map(
      options.defensiveOptions.map((option) => [
        normalizeLooseLabel(option.value),
        option.value,
      ]),
    );

    const preferred = [];
    if (detailDefense && !normalizeLooseLabel(detailDefense).includes("parade")) {
      preferred.push(detailDefense);
    }
    if (legacyDefense && !normalizeLooseLabel(legacyDefense).includes("parade")) {
      preferred.push(legacyDefense);
    }
    if (detailDefense) preferred.push(detailDefense);
    if (legacyDefense) preferred.push(legacyDefense);

    for (const candidate of preferred) {
      const canonical = optionByNormalized.get(normalizeLooseLabel(candidate));
      if (canonical) return canonical;
    }
    return preferred[0] ?? "";
  }

  /**
   * Injecte la valeur courante d'un select si elle n'est pas dans les options
   * (cas données legacy / import hors lexique), pour éviter un affichage vide.
   *
   * @param {OptionItem[]} optionsList
   * @param {string} currentValue
   * @returns {OptionItem[]}
   */
  function withCurrentOption(optionsList, currentValue) {
    const value = String(currentValue ?? "").trim();
    if (!value) return optionsList;
    if (optionsList.some((option) => option.value === value)) return optionsList;
    return [{ value, label: value }, ...optionsList];
  }

  return {
    splitTokens,
    joinTokens,
    getMoveParts,
    getActionDetails,
    getDefenseDetails,
    getV2Mode,
    updateBuilderSelection,
    updateMoveBase,
    addMoveComplement,
    removeMoveComplement,
    getDefenseAttributeTokens,
    setDefenseAttributeTokens,
    updateDefenseDetails,
    addDefenseDetail,
    updateDefenseDetail,
    removeDefenseDetail,
    updatePrepDetails,
    addAttackComplement,
    removeAttackComplement,
    resolveDefenseType,
    getAttackActionValue,
    getDefenseActionValue,
    withCurrentOption,
    ...options,
  };
}

/**
 * Core de contexte (multi-items ou single-item).
 * Ce hook instancie l'état builder et branche le moteur partagé.
 *
 * @param {{
 *   itemCount: number,
 *   getItem: (index: number) => StepItem | undefined,
 *   patchItem: (index: number, patch: Partial<StepItem>) => void,
 *   resetBuilderSelectionKey: string | null,
 *   normalizedLexicon: any,
 *   favoriteKeys: any,
 *   orderOptions: (values: string[], key: string) => OptionItem[],
 * }} params
 */
function useStepFormCore({
  itemCount,
  getItem,
  patchItem,
  resetBuilderSelectionKey,
  normalizedLexicon,
  favoriteKeys,
  orderOptions,
}) {
  // Un builderSelection par item affiché.
  const [builderSelections, setBuilderSelections] = useState(() =>
    Array.from({ length: itemCount }, createBuilderSelection),
  );

  useEffect(() => {
    // Redimensionnement "non destructif": on conserve l'existant quand possible.
    setBuilderSelections((prev) =>
      Array.from(
        { length: itemCount },
        (_, index) => prev[index] ?? createBuilderSelection(),
      ),
    );
  }, [itemCount]);

  useEffect(() => {
    // Reset explicite (ex: changement d'item inline à éditer).
    if (resetBuilderSelectionKey == null) return;
    setBuilderSelections(
      Array.from({ length: itemCount }, createBuilderSelection),
    );
  }, [resetBuilderSelectionKey, itemCount]);

  const shared = useSharedCombatStepLogic({
    normalizedLexicon,
    favoriteKeys,
    orderOptions,
    getItem,
    patchItem,
    getBuilderSelection: (index) => builderSelections[index],
    patchBuilderSelection: (index, patch) =>
      setBuilderSelections((prev) =>
        prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)),
      ),
  });

  return {
    builderSelections,
    ...shared,
  };
}

/**
 * Alias explicite côté UI "escrime classique".
 * La logique est identique au sabre: seule la configuration d'options change.
 */
export function useClassicCombatStepFormLogic(params) {
  // Wrapper explicite: même core, API nommée selon le mode pour la lisibilité.
  return useCombatStepFormLogic(params);
}

/**
 * Alias explicite côté UI "sabre laser".
 * La logique est identique au classique: seule la configuration d'options change.
 */
export function useSabreCombatStepFormLogic(params) {
  // Wrapper explicite: même core, API nommée selon le mode pour la lisibilité.
  return useCombatStepFormLogic(params);
}

/**
 * Hook "création/édition de passe" côté formulaire principal (multi participants).
 *
 * Particularités:
 * - expose `builderSelections[index]` pour chaque participant.
 * - calcule `summaryLines` et `hasAnySummary` pour l'entête UI.
 *
 * @param {{
 *   form: StepItem[],
 *   participants: any[],
 *   participantLabels: string[],
 *   buildSummaryLine: (item: StepItem, participant: any, index: number) => string,
 *   normalizedLexicon: any,
 *   favoriteKeys: any,
 *   orderOptions: (values: string[], key: string) => OptionItem[],
 *   onFormChange: (index: number, patch: Partial<StepItem>) => void,
 * }} params
 */
function useCombatStepFormLogic({
  form,
  participants,
  participantLabels,
  buildSummaryLine,
  normalizedLexicon,
  favoriteKeys,
  orderOptions,
  onFormChange,
}) {
  const core = useStepFormCore({
    itemCount: participants.length,
    getItem: (index) => form[index],
    patchItem: (index, patch) => onFormChange(index, patch),
    resetBuilderSelectionKey: null,
    normalizedLexicon,
    favoriteKeys,
    orderOptions,
  });

  const summaryLines = useMemo(
    () =>
      form.map((item, index) => ({
        name: participantLabels?.[index] ?? participants?.[index],
        text: buildSummaryLine?.(item, participants?.[index], index),
      })),
    [form, participantLabels, participants, buildSummaryLine],
  );
  const hasAnySummary = useMemo(
    () => summaryLines.some((line) => line.text && line.text !== "inactif"),
    [summaryLines],
  );

  return {
    // Alias explicite conservé pour les composants existants.
    builderSelections: core.builderSelections,
    summaryLines,
    hasAnySummary,
    ...core,
  };
}

/**
 * Alias inline explicite côté UI "escrime classique".
 */
export function useClassicInlineStepFormLogic(params) {
  // Wrapper explicite: même core, API nommée selon le mode pour la lisibilité.
  return useInlineStepFormLogic(params);
}

/**
 * Alias inline explicite côté UI "sabre laser".
 */
export function useSabreInlineStepFormLogic(params) {
  // Wrapper explicite: même core, API nommée selon le mode pour la lisibilité.
  return useInlineStepFormLogic(params);
}

/**
 * Hook "édition inline" (single participant / single item).
 *
 * Particularités:
 * - adapte les API indexées du core vers des API directes.
 * - expose `builderSelection` (single) + `updateBuilderSelection(patch)`.
 * - conserve les mêmes primitives métier que le formulaire principal.
 *
 * @param {{
 *   inlineItem: StepItem,
 *   inlineEdit: {stepId?: string | number, participantIndex?: number} | null,
 *   normalizedLexicon: any,
 *   favoriteKeys: any,
 *   orderOptions: (values: string[], key: string) => OptionItem[],
 *   onUpdateInlineItem: (patch: Partial<StepItem>) => void,
 * }} params
 */
function useInlineStepFormLogic({
  inlineItem,
  inlineEdit,
  normalizedLexicon,
  favoriteKeys,
  orderOptions,
  onUpdateInlineItem,
}) {
  const core = useStepFormCore({
    itemCount: 1,
    getItem: () => inlineItem,
    patchItem: (_, patch) => onUpdateInlineItem?.(patch),
    resetBuilderSelectionKey: `${inlineEdit?.stepId ?? "step"}:${inlineEdit?.participantIndex ?? "participant"}`,
    normalizedLexicon,
    favoriteKeys,
    orderOptions,
  });

  function updateInlineItem(patch) {
    onUpdateInlineItem?.(patch);
  }

  const v2Mode = getV2Mode(inlineItem);
  const defenseDetail = getDefenseDetails(inlineItem)[0] ?? {};
  const defenseType = core.resolveDefenseType(inlineItem, INLINE_INDEX);
  const builderSelection =
    core.builderSelections[INLINE_INDEX] ?? createBuilderSelection();
  // Wrapper single-item pour aligner l'API avec StepInlineEditorModal.
  const updateBuilderSelection = (patch) =>
    core.updateBuilderSelection(INLINE_INDEX, patch);

  return {
    ...core,
    builderSelection,
    updateBuilderSelection,
    updateInlineItem,
    splitTokens,
    joinTokens,
    getMoveParts,
    getActionDetails,
    getDefenseDetails,
    getV2Mode,
    // Adapte les APIs indexées du core vers des APIs "single item"
    // attendues par StepInlineEditorModal.
    updateMoveBase: (key, base, baseOptions) =>
      core.updateMoveBase(INLINE_INDEX, key, base, baseOptions),
    addMoveComplement: (key, value, baseOptions) =>
      core.addMoveComplement(INLINE_INDEX, key, value, baseOptions),
    removeMoveComplement: (key, value, baseOptions) =>
      core.removeMoveComplement(INLINE_INDEX, key, value, baseOptions),
    getDefenseAttributeTokens: () =>
      core.getDefenseAttributeTokens(inlineItem),
    setDefenseAttributeTokens: (tokens) =>
      core.setDefenseAttributeTokens(INLINE_INDEX, tokens),
    updateDefenseDetails: (nextDetails) =>
      core.updateDefenseDetails(INLINE_INDEX, nextDetails),
    addDefenseDetail: () => core.addDefenseDetail(INLINE_INDEX),
    updateDefenseDetail: (detailIndex, patch) =>
      core.updateDefenseDetail(INLINE_INDEX, detailIndex, patch),
    removeDefenseDetail: (detailIndex) =>
      core.removeDefenseDetail(INLINE_INDEX, detailIndex),
    updatePrepDetails: (action, attribute) =>
      core.updatePrepDetails(INLINE_INDEX, action, attribute),
    addAttackComplement: (value) =>
      core.addAttackComplement(INLINE_INDEX, value),
    removeAttackComplement: (value) =>
      core.removeAttackComplement(INLINE_INDEX, value),
    v2Mode,
    defenseDetail,
    defenseType,
  };
}
