# Salary Insights Portal — Frontend

React + Vite SPA for browsing, submitting, and analysing Indian tech salary data. Communicates exclusively with the Spring Boot backend via a proxied `/api` base URL.

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | React 18 |
| Build | Vite |
| Routing | React Router v6 |
| HTTP | Axios (singleton `src/services/api.js`) |
| Styling | Plain CSS (`src/styles/global.css`) + inline styles |
| State | React Context (Auth, AppData) + local `useState` |
| Auth | JWT (localStorage) + Google OAuth 2.0 |

---

## Project Structure

```
src/
├── App.jsx                        # Root router, route guards, AdminLayout
├── main.jsx                       # Vite entry point
│
├── context/
│   ├── AuthContext.jsx            # JWT session — login, logout, user state
│   └── AppDataContext.jsx         # Reference data — job functions + levels, loaded once on startup
│
├── services/
│   └── api.js                     # Axios instance — baseURL /api, JWT interceptor, 401 handler
│
├── styles/
│   └── global.css                 # All CSS — design tokens, component classes, dark mode
│
├── data/
│   └── salaryData.js              # Static badge/label maps (level, status)
│
├── components/
│   ├── shared/
│   │   ├── Navbar.jsx             # Top navigation bar
│   │   ├── CompanyLogo.jsx        # Logo resolver — DB → Clearbit → Google Favicon → initials
│   │   ├── SalaryTable.jsx        # Reusable paginated salary table
│   │   └── SalaryDetailDrawer.jsx # Slide-out drawer for a single salary entry
│   └── admin/
│       └── AdminSidebar.jsx       # Left sidebar for admin panel
│
├── pages/
│   ├── public/
│   │   ├── HomePage.jsx           # Hero + stats + Top 10 companies + recent submissions
│   │   ├── SalariesPage.jsx       # Browse all approved salaries — search, filter, paginate
│   │   ├── CompaniesPage.jsx      # Company directory — search, click for salary modal
│   │   ├── DashboardPage.jsx      # Analytics — stacked bar charts by location & company level
│   │   ├── LevelGuideView.jsx     # Level comparison grid across up to 5 companies
│   │   ├── SubmitSalaryPage.jsx   # Authenticated salary submission form
│   │   ├── SubmitReferralPage.jsx # Authenticated referral link submission
│   │   ├── ViewReferralsPage.jsx  # Public referral board (Referral Board)
│   │   ├── MyReferralLinksPage.jsx# Authenticated — user's own submitted referrals
│   │   ├── MyReferralsPage.jsx    # Authenticated — referrals received by the user
│   │   ├── LoginPage.jsx          # Email/password + Google OAuth login
│   │   ├── RegisterPage.jsx       # Email registration
│   │   └── OAuth2RedirectPage.jsx # OAuth2 callback handler
│   └── admin/
│       ├── AdminDashboard.jsx     # KPIs + submission trend chart
│       ├── AdminPendingSalaries.jsx # Review queue — approve / reject
│       ├── AdminCompanies.jsx     # Manage company records
│       ├── AdminReferrals.jsx     # Approve / reject referral links
│       ├── AdminGuideLevels.jsx   # Manage standard levels + company-level mappings
│       ├── AdminJobFunctions.jsx  # Manage job functions and their levels
│       └── AdminAuditLogs.jsx     # Read-only audit trail
```

---

## Routes

| Path | Access | Page |
|---|---|---|
| `/` | Public | HomePage |
| `/salaries` | Public | SalariesPage |
| `/companies` | Public | CompaniesPage |
| `/dashboard` | Public | DashboardPage |
| `/referrals` | Public | ViewReferralsPage (Referral Board) |
| `/login` | Public | LoginPage |
| `/register` | Public | RegisterPage |
| `/oauth2/redirect` | Public | OAuth2RedirectPage |
| `/submit` | Auth required | SubmitSalaryPage |
| `/refer` | Auth required | SubmitReferralPage |
| `/my-referral-links` | Auth required | MyReferralLinksPage |
| `/admin` | Admin only | AdminDashboard |
| `/admin/companies` | Admin only | AdminCompanies |
| `/admin/salaries` | Admin only | AdminPendingSalaries |
| `/admin/referrals` | Admin only | AdminReferrals |
| `/admin/guide-levels` | Admin only | AdminGuideLevels |
| `/admin/job-functions` | Admin only | AdminJobFunctions |
| `/admin/audit` | Admin only | AdminAuditLogs |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Backend running (see backend README)

### Install & Run

```bash
npm install
npm run dev
```

Vite dev server starts on `http://localhost:5173` and proxies all `/api` requests to `http://localhost:8080`.

### Build for Production

```bash
npm run build
```

Output is in `dist/`. Serve with any static host (Nginx, Vercel, etc). Ensure `/api` requests are reverse-proxied to the backend.

### Environment / Proxy

The Vite proxy is configured in `vite.config.js`. In production, configure your web server to proxy `/api/*` to the backend. No `.env` file is required on the frontend — all secrets live in the backend.

---

## Key Design Decisions

### Authentication

`AuthContext` stores `token` and `user` in `localStorage`. The Axios instance in `api.js` attaches the JWT to every request via a request interceptor. A response interceptor catches `401` responses, clears the session, and redirects to `/login`.

Google OAuth flow: clicking "Sign in with Google" redirects to `/api/oauth2/authorization/google`. After the backend completes the OAuth handshake, it redirects to `/oauth2/redirect?token=...&...`. `OAuth2RedirectPage` picks up the query params, writes them to `localStorage`, and navigates to `/`.

### AppDataContext

Job functions and their levels (Engineering → SDE 1, SDE 2…) are fetched once on app startup from `/public/job-functions` and shared via context. This avoids refetching the same reference data on every page navigation. The backend serves this from a 24-hour Caffeine cache.

### Search — 3-char minimum + 600ms debounce

Both `SalariesPage` and `CompaniesPage` use a two-state search pattern:
- `inputValue` — updates on every keystroke (controls the input display)
- `search` — the committed value that triggers the API call

Search fires when: the user types 3+ characters and pauses for 600ms, OR presses `Enter`. Clearing the input resets immediately. This reduces API calls by ~80–90% compared to searching on every keystroke.

### CompanyLogo Waterfall

`CompanyLogo.jsx` resolves logos through a 4-step waterfall with localStorage caching (7-day TTL):
1. `logoUrl` from the database (admin-set)
2. Clearbit by domain derived from `website`
3. Clearbit by guessed domain (`companyname.com`)
4. Google Favicon API
5. Initials avatar fallback (never fails)

### Analytics — DashboardPage

Two charts are rendered:
- **Avg Salary by Location & Level** — data from `GET /public/salaries/analytics/by-location-level`. Shows the 5 most recently updated locations. Each location section shows all its internal levels as stacked bars (Base / Bonus / Equity). Multiselect filter (up to 5 locations).
- **Avg Salary by Company & Level** — data from `GET /public/salaries/analytics/by-company-level`. Shows the 5 most recently updated companies. Each company section includes a confidence badge (High/Med/Low) derived from entry count and recency. Multiselect filter (up to 5 companies).

Both charts use a consistent colour palette: blue = Base, violet = Bonus, cyan = Equity. Per-bar tooltips show the full breakdown on hover.

### Viz Colour Palette

All decorative colours (charts, avatars, badges) use a unified jewel-tone palette defined in `global.css`:

```css
--viz-1: #3b82f6   /* blue        – Base salary  */
--viz-2: #8b5cf6   /* violet      – Bonus        */
--viz-3: #06b6d4   /* cyan        – Equity       */
--viz-4: #6366f1   /* indigo      – group accent */
--viz-5: #a78bfa   /* lavender    – group accent */
--viz-6: #22d3ee   /* sky-cyan    – group accent */
--viz-7: #818cf8   /* periwinkle  – group accent */
--viz-8: #c4b5fd   /* soft-violet – group accent */
```

Semantic status colours (green = approved, amber = pending, red = rejected) are kept separate and intentionally unchanged — they convey meaning that colour convention reinforces.

---

## Locations Supported

Bengaluru · Hyderabad · Pune · Delhi-NCR · Kochi · Coimbatore · Mysore · Mangaluru

## Internal Levels Supported

SDE 1 · SDE 2 · SDE 3 · Staff Engineer · Principal Engineer · Architect · Engineering Manager · Sr. Engineering Manager · Director · Sr. Director · VP
