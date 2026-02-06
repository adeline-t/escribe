import { useState } from "react";

export default function ProfilePage({ apiBase, authToken, authUser, setAuthUser, onLogout }) {
  const [profileStatus, setProfileStatus] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function authFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return fetch(`${apiBase}${path}`, { ...options, headers });
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileStatus("");
    setProfileError("");
    const formData = new FormData(event.currentTarget);
    const firstName = formData.get("firstName");
    const lastName = formData.get("lastName");
    const response = await authFetch("/api/auth/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName })
    });
    if (!response.ok) {
      setProfileError("Impossible de mettre à jour le profil.");
      return;
    }
    setAuthUser((prev) => (prev ? { ...prev, firstName, lastName } : prev));
    setProfileStatus("Profil mis à jour avec succès.");
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordStatus("");
    setPasswordError("");
    const formData = new FormData(event.currentTarget);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const response = await authFetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setPasswordError(payload?.message || "Changement de mot de passe impossible.");
      return;
    }
    setPasswordStatus("Mot de passe mis à jour avec succès.");
    setAuthUser((prev) => (prev ? { ...prev, forceReset: false } : prev));
  }

  return (
    <section className="panel stack-3">
      <div className="panel-header">
        <div>
          <h2 className="title">Gestion de mon compte</h2>
          <p className="meta text-muted">Gérez vos informations et votre sécurité.</p>
        </div>
        <button type="button" className="chip chip--ghost" onClick={onLogout}>
          Déconnexion
        </button>
      </div>

      <div className="card stack-2">
        <h3 className="subtitle">Informations</h3>
        <div className="meta text-muted">Rôle: {authUser.role}</div>
        <div className="meta text-muted">Email: {authUser.email}</div>
      </div>

      <form className="card stack-2" onSubmit={saveProfile}>
        <label>
          Prénom
          <input name="firstName" defaultValue={authUser.firstName || ""} />
        </label>
        <label>
          Nom
          <input name="lastName" defaultValue={authUser.lastName || ""} />
        </label>
        <label>
          Email
          <input name="email" defaultValue={authUser.email} disabled />
        </label>
        <button type="submit">Enregistrer</button>
        {profileStatus ? (
          <div className="banner banner--success">{profileStatus}</div>
        ) : null}
        {profileError ? (
          <div className="banner banner--error">{profileError}</div>
        ) : null}
      </form>

      <form className="card stack-2" onSubmit={changePassword}>
        <h3 className="subtitle">Mot de passe</h3>
        {authUser.forceReset ? (
          <div className="banner banner--error text-sm">
            Vous devez définir un nouveau mot de passe.
          </div>
        ) : (
          <label>
            Mot de passe actuel
            <input name="currentPassword" type="password" />
          </label>
        )}
        <label>
          Nouveau mot de passe
          <input name="newPassword" type="password" required minLength={12} />
        </label>
        <button type="submit">Changer le mot de passe</button>
        {passwordStatus ? (
          <div className="banner banner--success">{passwordStatus}</div>
        ) : null}
        {passwordError ? (
          <div className="banner banner--error">{passwordError}</div>
        ) : null}
      </form>

    </section>
  );
}
