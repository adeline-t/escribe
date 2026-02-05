import { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

export default function AuthPage({
  authLoading,
  authError,
  onLogin,
  onRegister,
}) {
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="kicker"></p>
          <h1>Escribe</h1>
          <p className="lead">
            Archive des phrases d'armes. Décrivez chaque passe avec précision,
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
            {authError ? <div className="auth-error">{authError}</div> : null}
            <div className="auth-grid">
              <form className="auth-form" onSubmit={onLogin}>
                <h3>Connexion</h3>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Mot de passe
                  <div className="password-input">
                    <input
                      name="password"
                      type={showLoginPassword ? "text" : "password"}
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowLoginPassword((prev) => !prev)}
                      aria-label={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      title={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
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
                  <div className="password-input">
                    <input
                      name="password"
                      type={showRegisterPassword ? "text" : "password"}
                      required
                      minLength={12}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowRegisterPassword((prev) => !prev)}
                      aria-label={showRegisterPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      title={showRegisterPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showRegisterPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </label>
                <button type="submit">Créer un compte</button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
