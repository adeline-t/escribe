import { useRef } from "react";
import { FaPen } from "react-icons/fa6";
import StepSummaryLine from "./StepSummaryLine.jsx";

export default function StepCard({
  type,
  lines,
  onEdit,
  onLongPress,
  editLabel,
  disabled,
  longPressMs = 800,
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
          className="card-mini-edit button-small"
          onClick={onEdit}
          aria-label={editLabel || "Modifier la passe"}
          title={editLabel || "Modifier"}
          disabled={disabled}
        >
          <FaPen />
        </button>
      ) : null}
      <div className="card-mini-lines">
        {lines.filter(Boolean).map((line, index) => (
          <div key={index} className="card-mini-line">
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StepSummaryCard({
  type,
  item,
  name,
  variant,
  inactiveLabel,
  onEdit,
  onLongPress,
  editLabel,
  disabled,
}) {
  return (
    <StepCard
      type={type}
      lines={[
        <StepSummaryLine
          key={`${name}-summary`}
          item={item}
          name={name}
          variant={variant}
          inactiveLabel={inactiveLabel}
        />,
      ]}
      onEdit={onEdit}
      onLongPress={onLongPress}
      editLabel={editLabel}
      disabled={disabled}
    />
  );
}
