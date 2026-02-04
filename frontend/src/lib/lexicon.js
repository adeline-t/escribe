import lexiconJson from "../data/lexicon.json";

export const DEFAULT_PARTICIPANTS = ["Portrait", "Fou", "Reflet"];

export const LEXICON_TYPES = [
  { key: "offensive", label: "Offensive" },
  { key: "action", label: "Action d'arme" },
  { key: "attaque-attribut", label: "Attribut attaque" },
  { key: "cible", label: "Cible" },
  { key: "deplacement-attaque", label: "Déplacement attaque" },
  { key: "defensive", label: "Défensive" },
  { key: "parade-numero", label: "Numéro de parade" },
  { key: "parade-attribut", label: "Attribut parade" },
  { key: "deplacement-defense", label: "Déplacement défense" }
];

export function normalizeLexicon(data) {
  return {
    offensive: data.offensive ?? [],
    action: data.action ?? [],
    defensive: data.defensive ?? [],
    cible: data.cible ?? [],
    attackMove: data["deplacement-attaque"] ?? data.deplacementAttaque ?? [],
    defendMove: data["deplacement-defense"] ?? data.deplacementDefense ?? [],
    paradeNumber: data["parade-numero"] ?? data.paradeNumero ?? [],
    paradeAttribute: data["parade-attribut"] ?? data.paradeAttribut ?? [],
    attackAttribute: data["attaque-attribut"] ?? data.attaqueAttribut ?? []
  };
}

export const DEFAULT_LEXICON = normalizeLexicon(lexiconJson);
