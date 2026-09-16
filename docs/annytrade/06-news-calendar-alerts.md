# AnnyTrade Phase 6 — News, Calendar, Alerts & Notifications

## Status

**Market intelligence complete.** News and economic calendar use independent
provider abstractions (demo or Finnhub). Price alerts persist server-side with
anti-spam arming/cooldown and write into the existing notifications table.

## Providers (independent of market-data)

| Domain | Env | Credential fallback |
|--------|-----|---------------------|
| News | `ANNYTRADE_NEWS_PROVIDER` | `ANNYTRADE_NEWS_API_KEY` → market key |
| Calendar | `ANNYTRADE_CALENDAR_PROVIDER` | calendar → news → market key |

Modes: `demo` (default) · `test` · `finnhub` / `live` · `auto`.

Keys stay server-only (never `NEXT_PUBLIC_*`).

## News

- API: `GET /api/annytrade/news?symbol=&category=&from=&to=`
- Fields: headline, source, publishedAt, url, relatedSymbols, optional short summary
- Full article bodies are **not** scraped/stored — UI links out
- Trade desk **News** tab filters by symbol

## Economic calendar

- API: `GET /api/annytrade/calendar?from=&to=&country=&importance=`
- Fields as supplied: event, country/region, UTC time, importance, actual/forecast/previous
- UI formats times in the user profile timezone

## Alerts

- Migration `004_alerts_notifications.sql` → `annytrade.price_alerts`
- Conditions: `PRICE_ABOVE`, `PRICE_BELOW`, `PCT_MOVE` (baseline captured at create)
- Evaluate: `POST /api/annytrade/alerts/process` (session-scoped)
- Anti-spam: `armed` clears on trigger; re-arms when condition clears; `cooldown_seconds` blocks repeats
- Creates `notifications` rows (`type: price`) when prefs allow

## Notifications / delivery

- In-app list + mark-read (Phase 1) unchanged
- Preferences: `notify_price_alerts`, `notify_email_alerts` (+ existing notify_*)
- Email only if Resend env configured **and** user opts into email alerts
- Realtime: `GET /api/annytrade/notifications/stream` (SSE) updates unread badge

## Tests

- Alert condition + cooldown unit tests
- Demo/Finnhub news & calendar malformed-input tests

## Limitations

- No SMS; email optional behind Resend + preference
- Alert process is on-demand (user/session), not a global cron yet
- Demo news/calendar when credentials missing
- Finnhub calendar currency field often absent — shown as —
