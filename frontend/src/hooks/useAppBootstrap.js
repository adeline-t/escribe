import { useCallback, useEffect, useState } from "react";
import { useWorkerServices } from "./useWorkerServices.js";

export function useAppBootstrap({ apiBase, tokenKey }) {
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem(tokenKey);
    } catch {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [newLexiconData, setNewLexiconData] = useState(() => ({}));
  const [sabreLexiconData, setSabreLexiconData] = useState(() => ({}));
  const [newFavorites, setNewFavorites] = useState({});
  const [sabreFavorites, setSabreFavorites] = useState({});
  const [backendVersion, setBackendVersion] = useState(null);

  const services = useWorkerServices(apiBase, authToken);
  const { auth, lexicon, system } = services;

  function persistToken(nextToken) {
    try {
      if (nextToken) {
        localStorage.setItem(tokenKey, nextToken);
      } else {
        localStorage.removeItem(tokenKey);
      }
    } catch {
      // ignore storage failures
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function loadAuth() {
      if (!authToken) {
        setAuthLoading(false);
        setAuthUser(null);
        return;
      }
      try {
        const result = await auth.me();
        if (!result.ok) throw new Error("Auth failed");
        if (isMounted) {
          setAuthUser(result.user ?? null);
        }
      } catch {
        if (isMounted) {
          setAuthUser(null);
          setAuthToken(null);
          persistToken(null);
        }
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }
    loadAuth();
    return () => {
      isMounted = false;
    };
  }, [authToken, auth]);

  const refreshLexiconsAndFavorites = useCallback(async () => {
    try {
      const [sabreLexiconResult, newLexiconResult] = await Promise.all([
        lexicon.getFormLexicon({ lexicon: "sabre-laser" }),
        lexicon.getFormLexicon({ lexicon: "classic-v2" }),
      ]);

      if (sabreLexiconResult.ok && sabreLexiconResult.lexicon) {
        setSabreLexiconData(sabreLexiconResult.lexicon);
      }
      if (newLexiconResult.ok && newLexiconResult.lexicon) {
        setNewLexiconData(newLexiconResult.lexicon);
      }

      if (!authUser) return;
      const [sabreFavoritesResult, newFavoritesResult] = await Promise.all([
        lexicon.getFavorites({ lexicon: "sabre-laser" }),
        lexicon.getFavorites({ lexicon: "classic-v2" }),
      ]);
      if (sabreFavoritesResult.ok) {
        setSabreFavorites(sabreFavoritesResult.favorites);
      }
      if (newFavoritesResult.ok) {
        setNewFavorites(newFavoritesResult.favorites);
      }
    } catch (error) {
      console.warn("Bootstrap load skipped:", error);
    }
  }, [authUser, lexicon]);

  useEffect(() => {
    refreshLexiconsAndFavorites();
  }, [refreshLexiconsAndFavorites]);

  useEffect(() => {
    let isMounted = true;
    system
      .getVersion()
      .then((result) => {
        if (isMounted && result.ok && result.payload) {
          setBackendVersion(result.payload);
        }
      })
      .catch(() => null);
    return () => {
      isMounted = false;
    };
  }, [system]);

  async function login({ email, password }) {
    setAuthError("");
    try {
      const result = await auth.login({ email, password });
      if (!result.ok || !result.token) {
        setAuthError(result.error || "Identifiants invalides.");
        return { ok: false };
      }
      setAuthToken(result.token);
      persistToken(result.token);
      setAuthUser(result.user);
      return { ok: true };
    } catch {
      setAuthError("Impossible de se connecter. Vérifie ta connexion.");
      return { ok: false };
    }
  }

  async function register({ email, password, firstName, lastName }) {
    setAuthError("");
    try {
      const registerResult = await auth.register({
        email,
        password,
        firstName,
        lastName,
      });
      if (!registerResult.ok) {
        setAuthError(registerResult.error || "Inscription impossible.");
        return { ok: false };
      }

      const loginResult = await auth.login({ email, password });
      if (!loginResult.ok || !loginResult.token) {
        setAuthError(loginResult.error || "Connexion impossible.");
        return { ok: false };
      }

      setAuthToken(loginResult.token);
      persistToken(loginResult.token);
      setAuthUser(loginResult.user);
      return { ok: true };
    } catch {
      setAuthError("Impossible de créer le compte. Vérifie ta connexion.");
      return { ok: false };
    }
  }

  async function logout() {
    await auth.logout().catch(() => null);
    setAuthToken(null);
    setAuthUser(null);
    persistToken(null);
  }

  return {
    services,
    authUser,
    setAuthUser,
    authToken,
    authLoading,
    authError,
    setAuthError,
    // Keep this alias for backward compatibility in App, but it is now v2 only.
    lexiconData: newLexiconData,
    newLexiconData,
    sabreLexiconData,
    // Keep this alias for backward compatibility in App, but it is now v2 only.
    favorites: newFavorites,
    newFavorites,
    sabreFavorites,
    setNewFavorites,
    setSabreFavorites,
    backendVersion,
    refreshLexiconsAndFavorites,
    login,
    register,
    logout,
  };
}
