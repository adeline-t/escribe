export default function HomePage({ authUser, stepsCount, participantsCount, onNavigate }) {
  const name = authUser.firstName || authUser.lastName
    ? `${authUser.firstName || ""} ${authUser.lastName || ""}`.trim()
    : authUser.email;

  return (
    <section className="panel home">
      <div className="panel-header">
        <div>
          <h2>Accueil</h2>
          <p className="muted">Bonjour {name}. Vous avez {participantsCount} combattant{participantsCount > 1 ? "s" : ""} configuré{participantsCount > 1 ? "s" : ""} et {stepsCount} étape{stepsCount > 1 ? "s" : ""} en cours.</p>
        </div>
      </div>
      <div className="home-grid">
        <div className="home-card">
          <h3>Créer une phrase</h3>
          <p className="muted">Saisissez une nouvelle étape et construisez la phrase d'armes.</p>
          <button type="button" onClick={() => onNavigate("create")}>Aller à la création</button>
        </div>
        <div className="home-card">
          <h3>Phrases créées</h3>
          <p className="muted">Consultez la phrase en cours, vérifiez la lecture et supprimez des étapes.</p>
          <button type="button" onClick={() => onNavigate("phrases")}>Voir la liste</button>
        </div>
        <div className="home-card">
          <h3>Lexique</h3>
          <p className="muted">Mettez à jour le vocabulaire partagé et vos éléments personnels.</p>
          <button type="button" onClick={() => onNavigate("lexicon")}>Gérer le lexique</button>
        </div>
        <div className="home-card">
          <h3>Mon compte</h3>
          <p className="muted">Modifiez votre profil, votre mot de passe et votre session.</p>
          <button type="button" onClick={() => onNavigate("account")}>Gérer mon compte</button>
        </div>
      </div>
    </section>
  );
}
