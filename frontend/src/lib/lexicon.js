import lexiconJson from "../data/lexicon.json";
import sabreLexiconJson from "../data/lexicon-sabre-laser.json";

export const DEFAULT_PARTICIPANTS = [
  { name: "A", weapon: "" },
  { name: "B", weapon: "" },
];

export const LEXICON_TYPES = [
  { key: "offensive", label: "Offensive" },
  { key: "action", label: "Action d'arme" },
  { key: "attaque-attribut", label: "Attribut attaque" },
  { key: "cible", label: "Cible" },
  { key: "deplacement-attaque", label: "Déplacement attaque" },
  { key: "defensive", label: "Défensive" },
  { key: "parade-numero", label: "Position de parade" },
  { key: "parade-attribut", label: "Attribut parade" },
  { key: "deplacement-defense", label: "Déplacement défense" },
];

export const SABRE_LEXICON_TYPES = [
  { key: "armes", label: "Armes" },
  { key: "phases_choregraphie", label: "Phases chorégraphie" },
  { key: "cibles", label: "Cibles" },
  { key: "techniques_offensives", label: "Techniques offensives" },
  { key: "attributs_offensifs", label: "Attributs offensifs" },
  { key: "techniques_defensives", label: "Techniques défensives" },
  { key: "attributs_defensifs", label: "Attributs défensifs" },
  { key: "preparations", label: "Préparations" },
  { key: "deplacements", label: "Déplacements" },
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
    attackAttribute: data["attaque-attribut"] ?? data.attaqueAttribut ?? [],
  };
}

export const DEFAULT_LEXICON = normalizeLexicon(lexiconJson);

export const DEFAULT_SABRE_LEXICON = sabreLexiconJson;

export function normalizeSabreLexicon(data) {
  return {
    offensive: data.techniques_offensives ?? [],
    action: data.preparations ?? [],
    defensive: data.techniques_defensives ?? [],
    cible: data.cibles ?? [],
    attackMove: data.deplacements ?? [],
    defendMove: data.deplacements ?? [],
    paradeNumber: [],
    paradeAttribute: data.attributs_defensifs ?? [],
    attackAttribute: data.attributs_offensifs ?? [],
    phases: data.phases_choregraphie ?? [],
    armes: data.armes ?? [],
  };
}
