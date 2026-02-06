import { useEffect, useRef, useState } from "react";

const formatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short"
});

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return formatter.format(date);
}

function envTone(value) {
  const label = String(value || "").toLowerCase();
  if (label.includes("prod")) return "env-dot--prod";
  if (label.includes("dev")) return "env-dot--dev";
  if (label.includes("local") || label.includes("test")) return "env-dot--local";
  return "env-dot--neutral";
}

export default function VersionFooter({ frontend, backend, frontendEnv }) {
  const [copied, setCopied] = useState(false);
  const longPressTimer = useRef(null);

  const frontVersion = frontend?.version ? `v${frontend.version}` : "v—";
  const frontBuiltAt = formatDate(frontend?.builtAt);
  const frontEnv = frontendEnv || "—";

  const backVersion = backend?.version ? `v${backend.version}` : "v—";
  const backDeployedAt = formatDate(backend?.deployedAt);
  const backEnv = backend?.environment || "—";

  const infoText = `Front: ${frontVersion} · ${frontBuiltAt} · ${frontEnv}\nBack: ${backVersion} · ${backDeployedAt} · ${backEnv}`;

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  function clearLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handlePointerDown() {
    clearLongPress();
    longPressTimer.current = setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(infoText);
        setCopied(true);
      } catch {
        setCopied(false);
      } finally {
        longPressTimer.current = null;
      }
    }, 600);
  }

  return (
    <div
      className="version-footer"
      aria-live="polite"
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
      title="Appui long pour copier"
    >
      <div className="version-footer__line">
        <span className={`env-dot ${envTone(frontEnv)}`} aria-hidden="true" />
        Front&nbsp;: {frontVersion} · {frontBuiltAt} · {frontEnv}
      </div>
      <div className="version-footer__line">
        <span className={`env-dot ${envTone(backEnv)}`} aria-hidden="true" />
        Back&nbsp;: {backVersion} · {backDeployedAt} · {backEnv}
      </div>
      {copied ? <div className="version-footer__copied">Copié</div> : null}
    </div>
  );
}
