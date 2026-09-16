export const ANNYTRADE_BASE = "/annytrade";

export const annytradeRoutes = {
  root: ANNYTRADE_BASE,
  dashboard: `${ANNYTRADE_BASE}/dashboard`,
  markets: `${ANNYTRADE_BASE}/markets`,
  trade: (symbol = "EURUSD") => `${ANNYTRADE_BASE}/trade/${symbol}`,
  signals: `${ANNYTRADE_BASE}/signals`,
  signal: (id: string) => `${ANNYTRADE_BASE}/signals/${id}`,
  wallet: `${ANNYTRADE_BASE}/wallet`,
  analytics: `${ANNYTRADE_BASE}/analytics`,
  portfolio: `${ANNYTRADE_BASE}/portfolio`,
  calendar: `${ANNYTRADE_BASE}/calendar`,
  news: `${ANNYTRADE_BASE}/news`,
  notifications: `${ANNYTRADE_BASE}/notifications`,
  account: `${ANNYTRADE_BASE}/account`,
  admin: `${ANNYTRADE_BASE}/admin`,
  auth: {
    login: `${ANNYTRADE_BASE}/auth/login`,
    register: `${ANNYTRADE_BASE}/auth/register`,
    forgot: `${ANNYTRADE_BASE}/auth/forgot-password`,
    reset: `${ANNYTRADE_BASE}/auth/reset-password`,
    verify: `${ANNYTRADE_BASE}/auth/verify`,
    onboarding: `${ANNYTRADE_BASE}/auth/onboarding`,
  },
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon: string;
  match?: "exact" | "prefix";
};

export const primaryNav: NavItem[] = [
  {
    href: annytradeRoutes.dashboard,
    label: "Dashboard",
    icon: "LayoutDashboard",
    match: "exact",
  },
  { href: annytradeRoutes.markets, label: "Markets", icon: "CandlestickChart" },
  {
    href: annytradeRoutes.trade(),
    label: "Trade",
    icon: "LineChart",
    match: "prefix",
  },
  { href: annytradeRoutes.signals, label: "Signals", icon: "Radar" },
  { href: annytradeRoutes.portfolio, label: "Portfolio", icon: "Briefcase" },
  { href: annytradeRoutes.wallet, label: "Wallet", icon: "Wallet" },
  { href: annytradeRoutes.analytics, label: "Analytics", icon: "BarChart3" },
  { href: annytradeRoutes.calendar, label: "Calendar", icon: "CalendarDays" },
  { href: annytradeRoutes.news, label: "News", icon: "Newspaper" },
  { href: annytradeRoutes.account, label: "Account", icon: "UserRound" },
];

export const mobileNav: NavItem[] = [
  {
    href: annytradeRoutes.dashboard,
    label: "Home",
    icon: "LayoutDashboard",
    match: "exact",
  },
  { href: annytradeRoutes.markets, label: "Markets", icon: "CandlestickChart" },
  {
    href: annytradeRoutes.trade(),
    label: "Trade",
    icon: "LineChart",
    match: "prefix",
  },
  { href: annytradeRoutes.portfolio, label: "Positions", icon: "Briefcase" },
  { href: annytradeRoutes.wallet, label: "Wallet", icon: "Wallet" },
];
