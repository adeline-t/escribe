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
      <div className="card notice-card stack-2">
        <h3 className="subtitle">Note d’atelier</h3>
        <p className="meta text-muted">
          L’application est <strong>en cours de création</strong> : <em>épées
          démontées, crayons élimés, costumes en boule dans le placard</em>…
          et un stagiaire coincé entre deux feuilles A4. Bref, l’atelier tourne.
        </p>
        <p className="meta text-md">
          C’est une <strong>bêta</strong> : des évolutions et ajustements
          arrivent (
          <em>
            promis, pas de duel au sabre laser pour valider une mise à jour
          </em>
          ).
        </p>
        <p className="meta text-md">
          Le <strong>lexique de base</strong> va évoluer :
        </p>
        <p className="meta text-md">
          • Si des termes changent ou disparaissent, tes combats déjà écrits
          restent <strong>identiques</strong> : rien ne se perd, rien ne
          s’efface.
        </p>
        <p className="meta text-md">
          • Des escrimeurs planchent sur une notation{" "}
          <strong>plus efficace</strong> et <strong>plus précise</strong>.
        </p>
        <div className="text-md notice-join">
          <div>Pour rejoindre le groupe, envoie une demande à :</div>
          <div>
            •{" "}
            <a href="mailto:touze.adeline@gamil.com" className="text-link">
              touze.adeline@gamil.com
            </a>
          </div>
          <div>
            • <strong>Blaise LAPORTE</strong>{" "}
            <span className="meta">
              (par n’importe quel moyen — il est plus connu qu’il ne veut
              l’admettre.)
            </span>
          </div>
        </div>
        <p className="text-md">
          <strong>Dépôt GitHub</strong> :{" "}
          <a
            href="https://github.com/adeline-t/escribe"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            github.com/adeline-t/escribe
          </a>
        </p>
        <p className="subtitle">
          <br />
          Tes retours sont précieux, même les <em>“ça marche pas”</em> en
          majuscules.
        </p>
        <p className="text-sm text-muted">
          Et pour ceux qui sont intéressés par la notation en compétition, voici la grande sœur :{" "}
          <a
            href="https://balestra-bkf.pages.dev"
            target="_blank"
            rel="noreferrer"
            className="text-link"
          >
            Balestra
          </a>
        </p>
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
