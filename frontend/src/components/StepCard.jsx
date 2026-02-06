import { useRef } from "react";
import { FaPen } from "react-icons/fa6";

export default function StepCard({
  type,
  lines,
  onEdit,
  onLongPress,
  editLabel,
  disabled,
  longPressMs = 500,
}) {
  const longPressTimer = useRef(null);

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerDown() {
    if (!onLongPress || disabled) return;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      onLongPress();
      longPressTimer.current = null;
    }, longPressMs);
  }

  return (
    <div
      className={`card-mini ${type}`}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
    >
      {onEdit ? (
        <button
          type="button"
          className="card-mini__edit button-small"
          onClick={onEdit}
          aria-label={editLabel || "Modifier la passe"}
          title={editLabel || "Modifier"}
          disabled={disabled}
        >
          <FaPen />
        </button>
      ) : null}
      <div className="card-mini__lines">
        {lines.filter(Boolean).map((line, index) => (
          <div key={index} className="card-mini__line">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
