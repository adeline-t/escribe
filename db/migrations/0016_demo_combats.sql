ALTER TABLE combats ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0;

UPDATE combats
SET is_demo = 1
WHERE description LIKE 'Saluts - source %CARLIEZ%'
   OR description LIKE 'Enchaînements - source %CARLIEZ%'
   OR name LIKE 'Enchaînements Carliez';
