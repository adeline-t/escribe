export default function HomePage({
  authUser,
  combatName,
  combatDescription,
  combatId,
  stepsCount,
  participantsCount,
  onNavigate,
  onOpenCombat,
}) {
  const name =
    authUser.firstName || authUser.lastName
      ? `${authUser.firstName || ""} ${authUser.lastName || ""}`.trim()
      : authUser.email;

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <div className="inline-center">
            <img className="app-icon" src="/icon.png" alt="Escribe" />
            <h2 className="title">Accueil</h2>
          </div>
          <p className="lead">
            Bonjour {name} ! Prêt·e à écrire la prochaine passe ?
          </p>
          {combatDescription ? (
            <div className="meta text-muted">{combatDescription}</div>
          ) : null}
        </div>
      </div>
      <div className="grid-auto-sm">
        <div className="card card--highlight stack-2">
          <h3 className="subtitle text-accent">Dernier combat</h3>
          <p className="meta text-muted">{combatName || "Combat sans nom"}</p>
          {combatDescription ? (
            <p className="meta text-muted">{combatDescription}</p>
          ) : null}
          <button
            type="button"
            className="button-light"
            onClick={() => onOpenCombat?.(combatId)}
            disabled={!combatId}
          >
            Ouvrir le dernier combat
          </button>
        </div>
        <div className="card stack-2">
          <h3 className="subtitle">Créer un combat</h3>
          <p className="meta text-muted">
            Commencez un nouveau combat pour y ajouter vos phrases d'armes.
          </p>
          <button type="button" onClick={() => onNavigate("combats-new")}>
            Créer un combat
          </button>
        </div>
        <div className="card stack-2">
          <h3 className="subtitle">Mes combats</h3>
          <p className="meta text-muted">
            Créez, sélectionnez et archivez vos combats.
          </p>
          <button type="button" onClick={() => onNavigate("combats")}>
            Gérer les combats
          </button>
        </div>
        <div className="card stack-2">
          <h3 className="subtitle">Lexique</h3>
          <p className="meta text-muted">
            Mettez à jour le vocabulaire partagé et vos éléments personnels.
          </p>
          <button type="button" onClick={() => onNavigate("lexicon")}>
            Gérer le lexique
          </button>
        </div>
        <div className="card stack-2">
          <h3 className="subtitle">Mon compte</h3>
          <p className="meta text-muted">
            Modifiez votre profil, votre mot de passe et votre session.
          </p>
          <button type="button" onClick={() => onNavigate("account")}>
            Gérer mon compte
          </button>
        </div>
      </div>
    </section>
  );
}
