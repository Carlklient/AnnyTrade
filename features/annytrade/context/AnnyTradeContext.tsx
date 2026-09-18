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
import { paperTradingClient } from "../services/paper-client";
import type { AccountMode, TradingAccount, User } from "../types";
import type {
  PaperAccountSummary,
  PublicProfile,
  PublicUser,
} from "../types/backend";
import { PaperJobTicker } from "../components/shell/PaperJobTicker";
import { PwaRegister } from "../components/shell/PwaRegister";
import { DeskTour } from "../components/shell/DeskTour";
import { WebVitalsReporter } from "../components/shell/WebVitalsReporter";
import {
  playDeskChime,
  pushBrowserNotification,
} from "../lib/notify-client";

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
  paperSummary: PaperAccountSummary | null;
  activeAccountId: string | null;
  setActiveAccountId: (id: string | null) => void;
  refreshPaperAccount: () => Promise<void>;
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

function summaryToAccount(
  summary: PaperAccountSummary | null,
  mode: AccountMode,
  fallback: TradingAccount,
): TradingAccount {
  if (!summary) {
    return {
      ...fallback,
      mode: "demo",
      balance: 0,
      available: 0,
      equity: 0,
      unrealizedPnl: 0,
      dailyPnl: 0,
      marginUsed: 0,
      freeMargin: 0,
      leverage: 1,
    };
  }
  // Cash long-only: reserved notional is buying-power lock, not CFD margin.
  const reserved = summary.reserved ?? 0;
  return {
    id: summary.accountId,
    mode: mode === "live" ? "live" : "demo",
    currency: summary.currency || "USD",
    leverage: 1,
    balance: summary.cashBalance,
    available: summary.availableCash,
    equity: summary.equity ?? summary.cashBalance + summary.unrealizedPnl,
    unrealizedPnl: summary.unrealizedPnl,
    dailyPnl: summary.dailyPnl ?? 0,
    marginUsed: reserved,
    freeMargin: summary.availableCash,
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
  const [paperSummary, setPaperSummary] = useState<PaperAccountSummary | null>(
    null,
  );
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);

  const refreshPaperAccount = useCallback(async () => {
    if (!auth.authenticated) {
      setPaperSummary(null);
      return;
    }
    try {
      const summary = await paperTradingClient.summary(
        activeAccountId ?? undefined,
      );
      setPaperSummary(summary);
      if (!activeAccountId) setActiveAccountId(summary.accountId);
    } catch {
      setPaperSummary(null);
    }
  }, [auth.authenticated, activeAccountId]);

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
        setPaperSummary(null);
      }
    } catch {
      setAuth({ authenticated: false, backendUser: null, profile: null });
      setUnread(annytradeApi.listNotifications().filter((n) => !n.read).length);
      setPaperSummary(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    void refreshPaperAccount();
  }, [refreshPaperAccount]);

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
        if (typeof data.unread === "number") {
          setUnread((prev) => {
            if (data.unread! > prev) {
              playDeskChime();
              pushBrowserNotification(
                "AnnyTrade",
                "You have new desk notifications",
              );
            }
            return data.unread!;
          });
        }
      } catch {
        /* ignore */
      }
    });
    es.onerror = () => {
      /* Browser will retry */
    };
    return () => es.close();
  }, [auth.authenticated]);

  const setMode = useCallback((next: AccountMode) => {
    // Live mode is UI preview only — paper ledger never switches.
    setModeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      if (typeof document !== "undefined") {
        document.documentElement.dataset.atTheme = next;
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.atTheme = theme;
  }, [theme]);

  const logout = useCallback(async () => {
    try {
      await annytradeFetch("/auth/logout", { method: "POST", body: "{}" });
    } finally {
      setActiveAccountId(null);
      setPaperSummary(null);
      await refreshAuth();
    }
  }, [refreshAuth]);

  const mockFallback = annytradeApi.getAccount("demo");
  const account = summaryToAccount(
    auth.authenticated ? paperSummary : null,
    mode,
    mockFallback,
  );
  const user = mapBackendUser(auth.backendUser, auth.profile);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      theme,
      toggleTheme,
      user,
      account,
      paperSummary,
      activeAccountId,
      setActiveAccountId,
      refreshPaperAccount,
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
      account,
      paperSummary,
      activeAccountId,
      refreshPaperAccount,
      unreadNotifications,
      auth,
      authLoading,
      refreshAuth,
      logout,
    ],
  );

  return (
    <AnnyTradeContext.Provider value={value}>
      <PwaRegister />
      <PaperJobTicker />
      <DeskTour />
      <WebVitalsReporter />
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
