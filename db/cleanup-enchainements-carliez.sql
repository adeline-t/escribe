DELETE FROM combat_phrases WHERE combat_id IN (
  SELECT id FROM combats WHERE description = 'Enchaînements - source Maître CARLIEZ'
);
DELETE FROM combats WHERE description = 'Enchaînements - source Maître CARLIEZ';
