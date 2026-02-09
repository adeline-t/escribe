ALTER TABLE cible RENAME TO target;
ALTER TABLE deplacement RENAME TO movement;
ALTER TABLE parade_numero RENAME TO guard_number;
ALTER TABLE parade_attribut RENAME TO guard_attribute;
ALTER TABLE attaque_attribut RENAME TO attack_attribute;

ALTER TABLE user_cible RENAME TO user_target;
ALTER TABLE user_deplacement RENAME TO user_movement;
ALTER TABLE user_parade_numero RENAME TO user_guard_number;
ALTER TABLE user_parade_attribut RENAME TO user_guard_attribute;
ALTER TABLE user_attaque_attribut RENAME TO user_attack_attribute;

ALTER TABLE nl_cible RENAME TO nl_target;
ALTER TABLE nl_deplacement RENAME TO nl_movement;
ALTER TABLE nl_deplacement_complement RENAME TO nl_movement_complement;
ALTER TABLE nl_parade_numero RENAME TO nl_guard_number;
ALTER TABLE nl_parade_attribut RENAME TO nl_guard_attribute;
ALTER TABLE nl_attaque_attribut RENAME TO nl_attack_attribute;

ALTER TABLE user_nl_cible RENAME TO user_nl_target;
ALTER TABLE user_nl_deplacement RENAME TO user_nl_movement;
ALTER TABLE user_nl_deplacement_complement RENAME TO user_nl_movement_complement;
ALTER TABLE user_nl_parade_numero RENAME TO user_nl_guard_number;
ALTER TABLE user_nl_parade_attribut RENAME TO user_nl_guard_attribute;
ALTER TABLE user_nl_attaque_attribut RENAME TO user_nl_attack_attribute;

ALTER TABLE sl_armes RENAME TO sl_weapons;
ALTER TABLE sl_phases_choregraphie RENAME TO sl_choreography_phases;
ALTER TABLE sl_cibles RENAME TO sl_targets;
ALTER TABLE sl_techniques_offensives RENAME TO sl_offensive_techniques;
ALTER TABLE sl_attributs_offensifs RENAME TO sl_offensive_attributes;
ALTER TABLE sl_techniques_defensives RENAME TO sl_defensive_techniques;
ALTER TABLE sl_attributs_defensifs RENAME TO sl_defensive_attributes;
ALTER TABLE sl_deplacements RENAME TO sl_movements;

ALTER TABLE user_sl_armes RENAME TO user_sl_weapons;
ALTER TABLE user_sl_phases_choregraphie RENAME TO user_sl_choreography_phases;
ALTER TABLE user_sl_cibles RENAME TO user_sl_targets;
ALTER TABLE user_sl_techniques_offensives RENAME TO user_sl_offensive_techniques;
ALTER TABLE user_sl_attributs_offensifs RENAME TO user_sl_offensive_attributes;
ALTER TABLE user_sl_techniques_defensives RENAME TO user_sl_defensive_techniques;
ALTER TABLE user_sl_attributs_defensifs RENAME TO user_sl_defensive_attributes;
ALTER TABLE user_sl_deplacements RENAME TO user_sl_movements;
