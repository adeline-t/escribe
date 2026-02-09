ALTER TABLE combats RENAME TO performances;
ALTER TABLE combat_phrases RENAME TO performance_sequences;
ALTER TABLE combat_shares RENAME TO performance_shares;

ALTER TABLE performances RENAME COLUMN draft TO form_draft;
ALTER TABLE performance_sequences RENAME COLUMN combat_id TO performance_id;
ALTER TABLE performance_shares RENAME COLUMN combat_id TO performance_id;
