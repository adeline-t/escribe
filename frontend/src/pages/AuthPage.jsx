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
      <section className="panel stack-3">
        <header className="stack-2">
          <span className="kicker">Archive des phrases d'armes</span>
          <div className="inline-center">
            <img className="app-icon" src="/icon.png" alt="Escribe" />
            <h1 className="app-title">Escribe</h1>
          </div>
          <p className="text-md text-muted">
            Décrivez chaque passe avec précision, sans perdre la lecture
            globale.
          </p>
        </header>
        {authLoading ? (
          <div className="meta text-muted">Chargement...</div>
        ) : (
          <>
            <div className="divider" />
            {authError ? (
              <div className="banner banner--error">{authError}</div>
            ) : null}
            <div className="grid-auto">
              <form className="card stack-2" onSubmit={onLogin}>
                <div className="stack-1">
                  <h3 className="text-strong text-lg no-margin">
                    Connexion
                  </h3>
                  <p className="text-sm text-muted">
                    Accédez à vos combats et lexiques.
                  </p>
                </div>
                <div className="stack-2">
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
                        className="icon-button password-toggle"
                        onClick={() => setShowLoginPassword((prev) => !prev)}
                        aria-label={
                          showLoginPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                        title={
                          showLoginPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        {showLoginPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </label>
                </div>
                <button type="submit" className="button-block">
                  Se connecter
                </button>
              </form>
              <form className="card stack-2" onSubmit={onRegister}>
                <div className="stack-1">
                  <h3 className="text-strong text-lg no-margin">
                    Inscription
                  </h3>
                  <p className="text-sm text-muted">
                    Créez un compte pour partager vos combats.
                  </p>
                </div>
                <div className="stack-2">
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
                        className="icon-button password-toggle"
                        onClick={() => setShowRegisterPassword((prev) => !prev)}
                        aria-label={
                          showRegisterPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                        title={
                          showRegisterPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                      >
                        {showRegisterPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </label>
                </div>
                <button type="submit" className="button-block">
                  Créer un compte
                </button>
              </form>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
