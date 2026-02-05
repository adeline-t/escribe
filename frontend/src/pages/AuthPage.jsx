export default function AuthPage({
  authLoading,
  authError,
  onLogin,
  onRegister,
}) {
  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="kicker"></p>
          <h1>Escribe</h1>
          <p className="lead">
            Archive des phrases d'armes. Décrivez chaque étape avec précision,
            sans perdre la lecture globale.
          </p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Compte</h2>
        </div>
        {authLoading ? (
          <div className="muted">Chargement...</div>
        ) : (
          <>
            <div className="empty">
              Connecte-toi pour accéder aux phrases et au lexique.
            </div>
            <div className="auth-grid">
              <form className="auth-form" onSubmit={onLogin}>
                <h3>Connexion</h3>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Mot de passe
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                  />
                </label>
                <button type="submit">Se connecter</button>
              </form>
              <form className="auth-form" onSubmit={onRegister}>
                <h3>Inscription</h3>
                <label>
                  Prénom
                  <input name="firstName" type="text" />
                </label>
                <label>
                  Nom
                  <input name="lastName" type="text" />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Mot de passe
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={12}
                  />
                </label>
                <button type="submit">Créer un compte</button>
              </form>
            </div>
          </>
        )}
        {authError ? <div className="lexicon-error">{authError}</div> : null}
      </section>
    </div>
  );
}
