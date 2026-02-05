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
    <section className="panel home">
      <div className="panel-header">
        <div>
          <div className="home-title">
            <img src="/icon.png" alt="Escribe" />
            <h2>Accueil</h2>
          </div>
          <p className="muted">
            Bonjour {name}. Vous avez {participantsCount} combattant
            {participantsCount > 1 ? "s" : ""} configuré
            {participantsCount > 1 ? "s" : ""} et {stepsCount} passe
            {stepsCount > 1 ? "s" : ""} en cours.
          </p>
          <div className="muted" style={{ marginTop: "6px" }}>
            Combat: {combatName || "Combat sans nom"}
          </div>
          {combatDescription ? (
            <div className="muted">{combatDescription}</div>
          ) : null}
        </div>
      </div>
      <div className="home-grid">
        <div className="home-card home-card--highlight">
          <h3>Dernier combat</h3>
          <p className="muted">{combatName || "Combat sans nom"}</p>
          {combatDescription ? (
            <p className="muted">{combatDescription}</p>
          ) : null}
          <button
            type="button"
            onClick={() => onOpenCombat?.(combatId)}
            disabled={!combatId}
          >
            Ouvrir le dernier combat
          </button>
        </div>
        <div className="home-card">
          <h3>Créer un combat</h3>
          <p className="muted">
            Commencez un nouveau combat pour y ajouter vos phrases d'armes.
          </p>
          <button type="button" onClick={() => onNavigate("combats-new")}>
            Créer un combat
          </button>
        </div>
        <div className="home-card">
          <h3>Mes combats</h3>
          <p className="muted">Créez, sélectionnez et archivez vos combats.</p>
          <button type="button" onClick={() => onNavigate("combats")}>
            Gérer les combats
          </button>
        </div>
        <div className="home-card">
          <h3>Lexique</h3>
          <p className="muted">
            Mettez à jour le vocabulaire partagé et vos éléments personnels.
          </p>
          <button type="button" onClick={() => onNavigate("lexicon")}>
            Gérer le lexique
          </button>
        </div>
        <div className="home-card">
          <h3>Mon compte</h3>
          <p className="muted">
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
