import { useEffect, useState } from "react";
import {
  DEFAULT_LEXICON,
  DEFAULT_SABRE_LEXICON,
} from "../lib/lexicon.js";
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
  const [lexiconData, setLexiconData] = useState(() => DEFAULT_LEXICON);
  const [newLexiconData, setNewLexiconData] = useState(() => ({}));
  const [sabreLexiconData, setSabreLexiconData] = useState(
    () => DEFAULT_SABRE_LEXICON,
  );
  const [favorites, setFavorites] = useState({});
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

  useEffect(() => {
    let isMounted = true;
    async function loadLexiconsAndFavorites() {
      try {
        const [classicLexiconResult, sabreLexiconResult, newLexiconResult] =
          await Promise.all([
            lexicon.getLexicon(),
            lexicon.getLexicon({ lexicon: "sabre-laser" }),
            lexicon.getLexicon({ lexicon: "classic-v2" }),
          ]);

        if (isMounted && classicLexiconResult.ok && classicLexiconResult.lexicon) {
          setLexiconData(classicLexiconResult.lexicon);
        }
        if (isMounted && sabreLexiconResult.ok && sabreLexiconResult.lexicon) {
          setSabreLexiconData(sabreLexiconResult.lexicon);
        }
        if (isMounted && newLexiconResult.ok && newLexiconResult.lexicon) {
          setNewLexiconData(newLexiconResult.lexicon);
        }

        if (!authUser) return;
        const [favoritesResult, sabreFavoritesResult, newFavoritesResult] =
          await Promise.all([
            lexicon.getFavorites(),
            lexicon.getFavorites({ lexicon: "sabre-laser" }),
            lexicon.getFavorites({ lexicon: "classic-v2" }),
          ]);

        if (isMounted && favoritesResult.ok) {
          setFavorites(favoritesResult.favorites);
        }
        if (isMounted && sabreFavoritesResult.ok) {
          setSabreFavorites(sabreFavoritesResult.favorites);
        }
        if (isMounted && newFavoritesResult.ok) {
          setNewFavorites(newFavoritesResult.favorites);
        }
      } catch (error) {
        console.warn("Bootstrap load skipped:", error);
      }
    }

    loadLexiconsAndFavorites();
    return () => {
      isMounted = false;
    };
  }, [authUser, lexicon]);

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
    lexiconData,
    newLexiconData,
    sabreLexiconData,
    favorites,
    newFavorites,
    sabreFavorites,
    setNewFavorites,
    setSabreFavorites,
    backendVersion,
    login,
    register,
    logout,
  };
}
