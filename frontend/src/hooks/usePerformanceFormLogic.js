import { useEffect, useMemo, useState } from "react";
import {
  resolveLexiconTermId,
  resolveLexiconTermLabel,
} from "../lib/lexicon.js";

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
 * @property {string} [mainGuard]
 * @property {string} [basePosture]
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
 * @property {string} defenseActionComplement
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

// Local UI state used by builder selectors (base + attributes).
// It is not stored as-is in DB; it only drives form behavior.
const EMPTY_BUILDER_SELECTION = {
  attackMove: "",
  defendMove: "",
  paradeAttribute: "",
  attackComplement: "",
  attackMoveComplement: "",
  defendMoveComplement: "",
  paradeComplement: "",
  defenseActionComplement: "",
  defenseType: "",
  prepType: "",
  prepTargetMode: "position",
  prepPositionComplement: "",
};

export const PREPARATION_TIMINGS = Object.freeze(["before", "after"]);

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
  const baseFromOptions = tokens.find((token) => baseOptions.includes(token));
  const base = baseFromOptions ?? tokens[0] ?? "";
  const complements = tokens.filter((token, index) =>
    index === 0 ? token !== base : true,
  );
  return { base, complements };
}

/**
 * Retourne des actionDetails normalisés, avec fallback legacy.
 *
 * @param {StepItem} item
 * @returns {Array<{action: string, attribute: string}>}
 */
function getActionDetails(item) {
  const hasLinkedPreparation =
    item?.role !== "movement" &&
    item?.role !== "preparation" &&
    Boolean(String(item?.preparationAction ?? "").trim());
  const allowMovementPreparationToken =
    item?.role === "movement" ||
    item?.role === "preparation" ||
    hasLinkedPreparation;

  if (Array.isArray(item.actionDetails) && item.actionDetails.length) {
    return item.actionDetails
      .map((detail) => ({
        action: detail?.action ?? "",
        attribute: detail?.attribute ?? "",
      }))
      .filter((detail) =>
        allowMovementPreparationToken
          ? true
          : !isDisplacementPreparationToken(detail.action),
      );
  }
  const fallbackAction = isDisplacementPreparationToken(item?.action)
    ? ""
    : (item?.action ?? "");
  if (fallbackAction || (item.attackAttribute && item.attackAttribute.length)) {
    return [
      {
        action: fallbackAction,
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
 * Déduit le "mode v2" (attack/defense/movement/note) à partir du role
 * et des champs métiers, pour rester compatible avec les anciennes données.
 *
 * @param {StepItem} item
 * @returns {"attack"|"defense"|"movement"|"note"}
 */
function getV2Mode(item) {
  // Le rôle explicite reste prioritaire.
  if (item.role === "attack") return "attack";
  if (item.role === "defense") return "defense";
  if (item.role === "none") return "note";
  if (item.role === "movement") return "movement";
  if (item.role === "preparation") return "movement";
  if (item.role === "inactive") return "note";
  const hasAttackBits =
    Boolean(item.offensive) ||
    Boolean(item.target) ||
    Boolean(item.attackMove) ||
    (Array.isArray(item.attackAttribute) && item.attackAttribute.length > 0);
  const actionDetails = getActionDetails(item);
  const hasPrepBits = actionDetails.some((detail) => detail.action);
  if (!hasAttackBits && (hasPrepBits || actionDetails.length > 0)) {
    // Legacy compatibility: old records may not define role=movement.
    return "movement";
  }
  return "attack";
}

function getPreparationAction(item) {
  const safe = item && typeof item === "object" ? item : {};
  const direct = String(safe.preparationAction ?? "").trim();
  if (direct) return direct;
  if (safe.role === "movement") {
    return String(safe.action ?? "").trim();
  }
  return "";
}

function getPreparationTiming(item) {
  const safe = item && typeof item === "object" ? item : {};
  const timing = String(safe.preparationTiming ?? "").trim().toLowerCase();
  return PREPARATION_TIMINGS.includes(timing) ? timing : "before";
}

function hasPreparationAction(item) {
  return Boolean(getPreparationAction(item));
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
const DISPLACEMENT_PREPARATION_MARKERS = new Set([
  "displacements prep",
  "deplacements prep",
]);

function isGenericAttackMarker(value) {
  const normalized = normalizeLooseLabel(value);
  return GENERIC_ATTACK_MARKERS.has(normalized);
}

function isDisplacementPreparationToken(value) {
  const normalized = normalizeLooseLabel(value).replace(/_/g, " ");
  return DISPLACEMENT_PREPARATION_MARKERS.has(normalized);
}

/**
 * Normalize and memoize all form option lists
 * (favorite ordering + fallback values) shared by create and edit flows.
 *
 * @param {{
 *   normalizedLexicon: any,
 *   favoriteKeys: any,
 *   orderOptions: (values: string[], key: string) => OptionItem[]
 * }} params
 * @returns {{
 *   offensiveOptions: OptionItem[],
 *   mainGuardOptions: OptionItem[],
 *   basePostureOptions: OptionItem[],
 *   attackAttributeOptions: OptionItem[],
 *   targetOptions: OptionItem[],
 *   defensiveOptions: OptionItem[],
 *   defenseAttributeOptions: string[],
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
  const resolveLabel = (type, value) =>
    resolveLexiconTermLabel(normalizedLexicon, value, type);
  const resolveId = (type, value) =>
    resolveLexiconTermId(normalizedLexicon, type, value);

  // Normalize and order all option lists in one place
  // to guarantee the same behavior in main form and inline editor.
  const offensiveOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.offensive ?? [],
        favoriteKeys.offensive,
        (value) => resolveLabel("offensive", value),
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const mainGuardOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.mainGuard ?? [],
        favoriteKeys.mainGuard,
        (value) => resolveLabel("garde_principale", value),
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const basePostureOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.basePosture ?? [],
        favoriteKeys.basePosture,
        (value) => resolveLabel("postures_base", value),
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const attackAttributeOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.attackAttribute ?? [],
        favoriteKeys.attackAttribute,
        (value) => resolveLabel("attaque_attribut", value),
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const targetOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.target ?? normalizedLexicon.cible ?? [],
        favoriteKeys.target,
        (value) => resolveLabel("target", value),
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const defensiveOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.defensive ?? [],
        favoriteKeys.defensive,
        (value) => resolveLabel("defensive", value),
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const defenseAttributeOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.defenseAttribute ?? [],
        favoriteKeys.defenseAttribute ?? favoriteKeys.paradeAttribute,
        (value) => resolveLabel("defense_attribut", value),
      ).map((entry) => entry.value),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const paradeNumberOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.paradeNumber ?? [],
        favoriteKeys.paradeNumber,
        (value) => resolveLabel("parade_numero", value),
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const attackMoveBaseOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.attackMoveBase ?? normalizedLexicon.attackMove ?? [],
        favoriteKeys.attackMove,
        (value) => resolveLabel("deplacement", value),
      ),
    [normalizedLexicon, favoriteKeys, orderOptions],
  );
  const attackMoveComplementOptions = useMemo(
    () => normalizedLexicon.attackMoveComplement ?? [],
    [normalizedLexicon],
  );
  const paradeComplementOptions = useMemo(
    () =>
      orderOptions(
        normalizedLexicon.paradeAttribute ?? [],
        favoriteKeys.paradeAttribute,
        (value) => resolveLabel("parade_attribut", value),
      ).map((entry) => entry.value),
    [normalizedLexicon, favoriteKeys, orderOptions],
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
    mainGuardOptions,
    basePostureOptions,
    attackAttributeOptions,
    targetOptions,
    defensiveOptions,
    defenseAttributeOptions,
    paradeNumberOptions,
    attackMoveBaseOptions,
    attackMoveComplementOptions,
    paradeComplementOptions,
    preparationTypeOptions,
    prepTypeList,
    attackMoveBaseValues,
    resolveLabel,
    resolveId,
  };
}

/**
 * Moteur métier commun, indépendant du contexte d'affichage.
 *
 * Le moteur ne sait pas s'il est utilisé en:
 * - création (multi performers), ou
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
  // Single core: all shared domain logic lives here.
  // Context (multi-performer or inline) is injected through adapters.
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
    const patch = { [key]: joinTokens(nextList) };
    if (key === "attackMove" || key === "defendMove") {
      patch.move = nextList[0] ?? "";
      patch.moveDetails = nextList.slice(1);
    }
    patchItem(index, patch);
  }

  /**
   * Met à jour l'état local de sélection d'un bloc builder.
   */
  function updateBuilderSelection(index, patch) {
    // Update only temporary UI state used by selector builders.
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
   * Lit les attributs de l'action de défense.
   * Convention: defenseDetails[1..n].defense contient un attribut.
   */
  function getDefenseActionAttributeTokens(itemOrIndex) {
    const item =
      typeof itemOrIndex === "number" ? readItem(itemOrIndex) : itemOrIndex;
    const details = getDefenseDetails(item);
    if (details.length <= 1) return [];
    const out = [];
    const seen = new Set();
    for (const detail of details.slice(1)) {
      const token = String(detail?.defense ?? "").trim();
      if (!token || seen.has(token)) continue;
      seen.add(token);
      out.push(token);
    }
    return out;
  }

  /**
   * Écrit defenseDetails et synchronise les champs racine legacy.
   */
  function updateDefenseDetails(index, nextDetails) {
    // Legacy + v2 defense: keep root fields synchronized with defenseDetails[0]
    // to preserve existing read/write compatibility.
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
   * Réécrit les attributs de l'action de défense.
   * Convention: defenseDetails[0] = action/position principale,
   * defenseDetails[1..n] = attributs d'action.
   */
  function setDefenseActionAttributeTokens(index, tokens) {
    const list = getDefenseDetails(readItem(index));
    const first = list[0] ?? { defense: "", position: "", attribute: "" };
    const cleaned = [];
    const seen = new Set();
    for (const token of tokens ?? []) {
      const value = String(token ?? "").trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      cleaned.push(value);
    }
    const next = [
      first,
      ...cleaned.map((value) => ({
        defense: value,
        position: "",
        attribute: "",
      })),
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
   * Met à jour la préparation liée (action dédiée) sans imposer un rôle.
   * Le rôle est injecté par le formulaire appelant (attack/defense).
   */
  function updatePrepDetails(index, action, { role = "attack" } = {}) {
    const nextAction = String(action ?? "").trim();
    const nextRole = role || "attack";
    // Linked preparation (inside attack/defense) must not override attack/defense action fields.
    patchItem(index, {
      role: nextRole,
      preparationAction: nextAction,
    });
  }

  function clearPrepDetails(index) {
    patchItem(index, {
      preparationAction: "",
      preparationTiming: "before",
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
    const hasLinkedPreparation =
      item?.role !== "movement" && hasPreparationAction(item);

    const preferred = [];
    if (offensive && !isGenericAttackMarker(offensive)) preferred.push(offensive);
    if (!hasLinkedPreparation && detailAction) preferred.push(detailAction);
    if (!hasLinkedPreparation && legacyAction) preferred.push(legacyAction);
    if (offensive) preferred.push(offensive);

    for (const candidate of preferred) {
      if (options.offensiveOptions.some((option) => option.value === candidate)) {
        return candidate;
      }
      const canonical = options.resolveId("offensive", candidate);
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
      if (options.defensiveOptions.some((option) => option.value === candidate)) {
        return candidate;
      }
      const canonical = options.resolveId("defensive", candidate);
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
  function withCurrentOption(optionsList, currentValue, type = "term") {
    const value = String(currentValue ?? "").trim();
    if (!value) return optionsList;
    if (optionsList.some((option) => option.value === value)) return optionsList;
    return [
      { value, label: options.resolveLabel(type, value) },
      ...optionsList,
    ];
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
    getDefenseActionAttributeTokens,
    setDefenseAttributeTokens,
    setDefenseActionAttributeTokens,
    updateDefenseDetails,
    addDefenseDetail,
    updateDefenseDetail,
    removeDefenseDetail,
    updatePrepDetails,
    clearPrepDetails,
    addAttackComplement,
    removeAttackComplement,
    resolveDefenseType,
    getAttackActionValue,
    getDefenseActionValue,
    getPreparationAction,
    getPreparationTiming,
    hasPreparationAction,
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
  // One builderSelection per displayed item.
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
    // Explicit reset (for example when switching inline edited item).
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
  // Explicit wrapper: same core, mode-specific API naming for readability.
  return useCombatStepFormLogic(params);
}

/**
 * Alias explicite côté UI "sabre laser".
 * La logique est identique au classique: seule la configuration d'options change.
 */
export function useSabreCombatStepFormLogic(params) {
  // Explicit wrapper: same core, mode-specific API naming for readability.
  return useCombatStepFormLogic(params);
}

/**
 * Hook "création/édition de passe" côté formulaire principal (multi performers).
 *
 * Particularités:
 * - expose `builderSelections[index]` pour chaque performer.
 * - calcule `summaryLines` et `hasAnySummary` pour l'entête UI.
 *
 * @param {{
 *   form: StepItem[],
 *   performers: any[],
 *   performerLabels: string[],
 *   buildSummaryLine: (item: StepItem, performer: any, index: number) => string,
 *   normalizedLexicon: any,
 *   favoriteKeys: any,
 *   orderOptions: (values: string[], key: string) => OptionItem[],
 *   onFormChange: (index: number, patch: Partial<StepItem>) => void,
 * }} params
 */
function useCombatStepFormLogic({
  form,
  performers,
  performerLabels,
  buildSummaryLine,
  normalizedLexicon,
  favoriteKeys,
  orderOptions,
  onFormChange,
}) {
  const core = useStepFormCore({
    itemCount: performers.length,
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
        name: performerLabels?.[index] ?? performers?.[index],
        text: buildSummaryLine?.(
          item,
          (type, value) => core.resolveLabel(type, value),
          performers?.[index],
          index,
        ),
      })),
    [form, performerLabels, performers, buildSummaryLine, core],
  );
  const hasAnySummary = useMemo(
    () => summaryLines.some((line) => line.text && line.text !== "inactif"),
    [summaryLines],
  );

  return {
    // Explicit alias kept for existing components.
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
  // Explicit wrapper: same core, mode-specific API naming for readability.
  return useInlineStepFormLogic(params);
}

/**
 * Alias inline explicite côté UI "sabre laser".
 */
export function useSabreInlineStepFormLogic(params) {
  // Explicit wrapper: same core, mode-specific API naming for readability.
  return useInlineStepFormLogic(params);
}

/**
 * Hook "édition inline" (single performer / single item).
 *
 * Particularités:
 * - adapte les API indexées du core vers des API directes.
 * - expose `builderSelection` (single) + `updateBuilderSelection(patch)`.
 * - conserve les mêmes primitives métier que le formulaire principal.
 *
 * @param {{
 *   inlineItem: StepItem,
 *   inlineEdit: {stepId?: string | number, performerIndex?: number} | null,
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
    resetBuilderSelectionKey: `${inlineEdit?.stepId ?? "step"}:${inlineEdit?.performerIndex ?? "performer"}`,
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
  // Single-item wrapper to align API with StepInlineEditorModal.
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
    // Adapt indexed core APIs into "single item" APIs
    // attendues par StepInlineEditorModal.
    updateMoveBase: (key, base, baseOptions) =>
      core.updateMoveBase(INLINE_INDEX, key, base, baseOptions),
    addMoveComplement: (key, value, baseOptions) =>
      core.addMoveComplement(INLINE_INDEX, key, value, baseOptions),
    removeMoveComplement: (key, value, baseOptions) =>
      core.removeMoveComplement(INLINE_INDEX, key, value, baseOptions),
    getDefenseAttributeTokens: () =>
      core.getDefenseAttributeTokens(inlineItem),
    getDefenseActionAttributeTokens: () =>
      core.getDefenseActionAttributeTokens(inlineItem),
    setDefenseAttributeTokens: (tokens) =>
      core.setDefenseAttributeTokens(INLINE_INDEX, tokens),
    setDefenseActionAttributeTokens: (tokens) =>
      core.setDefenseActionAttributeTokens(INLINE_INDEX, tokens),
    updateDefenseDetails: (nextDetails) =>
      core.updateDefenseDetails(INLINE_INDEX, nextDetails),
    addDefenseDetail: () => core.addDefenseDetail(INLINE_INDEX),
    updateDefenseDetail: (detailIndex, patch) =>
      core.updateDefenseDetail(INLINE_INDEX, detailIndex, patch),
    removeDefenseDetail: (detailIndex) =>
      core.removeDefenseDetail(INLINE_INDEX, detailIndex),
    updatePrepDetails: (action, options) =>
      core.updatePrepDetails(INLINE_INDEX, action, options),
    clearPrepDetails: () => core.clearPrepDetails(INLINE_INDEX),
    addAttackComplement: (value) =>
      core.addAttackComplement(INLINE_INDEX, value),
    removeAttackComplement: (value) =>
      core.removeAttackComplement(INLINE_INDEX, value),
    v2Mode,
    defenseDetail,
    defenseType,
  };
}
