export default function CombatColumns({
  mode,
  editLeft,
  editRight,
  readLeft,
  readRight,
}) {
  return (
    <div className="option-grid">
      <div className="stack-3">{mode === "edit" ? editLeft : readLeft}</div>
      <div className="stack-3">{mode === "edit" ? editRight : readRight}</div>
    </div>
  );
}
