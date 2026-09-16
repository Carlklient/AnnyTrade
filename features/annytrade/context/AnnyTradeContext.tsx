"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { annytradeApi } from "../services/api";
import { annytradeFetch } from "../services/client";
import type { AccountMode, TradingAccount, User } from "../types";
import type { PublicProfile, PublicUser } from "../types/backend";

type AuthState = {
  authenticated: boolean;
  backendUser: PublicUser | null;
  profile: PublicProfile | null;
};

type AnnyTradeContextValue = {
  mode: AccountMode;
  setMode: (mode: AccountMode) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  user: User;
  account: TradingAccount;
  unreadNotifications: number;
  auth: AuthState;
  authLoading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
};

const AnnyTradeContext = createContext<AnnyTradeContextValue | null>(null);

function mapBackendUser(
  backend: PublicUser | null,
  profile: PublicProfile | null,
): User {
  const mock = annytradeApi.getUser();
  if (!backend) return mock;
  return {
    ...mock,
    id: backend.id,
    name: profile?.displayName ?? backend.displayName,
    email: backend.email,
    avatarInitials: (profile?.displayName ?? backend.displayName)
      .split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };
}

export function AnnyTradeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AccountMode>("demo");
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [authLoading, setAuthLoading] = useState(true);
  const [auth, setAuth] = useState<AuthState>({
    authenticated: false,
    backendUser: null,
    profile: null,
  });
  const [unreadNotifications, setUnread] = useState(0);

  const refreshAuth = useCallback(async () => {
    try {
      const me = await annytradeFetch<{
        authenticated: boolean;
        user: PublicUser | null;
        profile: PublicProfile | null;
      }>("/auth/me", { method: "GET" });
      setAuth({
        authenticated: me.authenticated,
        backendUser: me.user,
        profile: me.profile,
      });
      if (me.profile?.themePreference === "light") setTheme("light");
      if (me.profile?.themePreference === "dark") setTheme("dark");
      if (me.authenticated) {
        try {
          const n = await annytradeFetch<{
            notifications: { read: boolean }[];
          }>("/notifications", { method: "GET" });
          setUnread(n.notifications.filter((x) => !x.read).length);
        } catch {
          setUnread(0);
        }
      } else {
        setUnread(
          annytradeApi.listNotifications().filter((n) => !n.read).length,
        );
      }
    } catch {
      setAuth({ authenticated: false, backendUser: null, profile: null });
      setUnread(annytradeApi.listNotifications().filter((n) => !n.read).length);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    // Session hydration from HTTP-only cookie
    // eslint-disable-next-line react-hooks/set-state-in-effect -- auth bootstrap
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (!auth.authenticated) return;
    const es = new EventSource("/api/annytrade/notifications/stream", {
      withCredentials: true,
    });
    es.addEventListener("snapshot", (ev) => {
      try {
        const data = JSON.parse((ev as MessageEvent).data) as {
          unread?: number;
        };
        if (typeof data.unread === "number") setUnread(data.unread);
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => {
      // Browser will retry; fall back unread stays last known
    };
    return () => es.close();
  }, [auth.authenticated]);

  const setMode = useCallback((next: AccountMode) => {
    setModeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const logout = useCallback(async () => {
    try {
      await annytradeFetch("/auth/logout", { method: "POST", body: "{}" });
    } finally {
      await refreshAuth();
    }
  }, [refreshAuth]);

  const mockAccount = annytradeApi.getAccount(mode);
  const user = mapBackendUser(auth.backendUser, auth.profile);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      theme,
      toggleTheme,
      user,
      account: mockAccount,
      unreadNotifications,
      auth,
      authLoading,
      refreshAuth,
      logout,
    }),
    [
      mode,
      setMode,
      theme,
      toggleTheme,
      user,
      mockAccount,
      unreadNotifications,
      auth,
      authLoading,
      refreshAuth,
      logout,
    ],
  );

  return (
    <AnnyTradeContext.Provider value={value}>
      {children}
    </AnnyTradeContext.Provider>
  );
}

export function useAnnyTrade() {
  const ctx = useContext(AnnyTradeContext);
  if (!ctx) {
    throw new Error("useAnnyTrade must be used within AnnyTradeProvider");
  }
  return ctx;
}
