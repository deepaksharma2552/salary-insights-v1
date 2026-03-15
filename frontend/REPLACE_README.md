# SalaryInsights360 — Frontend Replacement Guide

Drop the contents of this folder directly into your project repo to apply
all UI/branding changes without touching a single file manually.

---

## What's in this folder

```
frontend/
├── index.html                          ← replace (adds Google Fonts)
└── src/
    ├── main.jsx                        ← replace (removes MUI theme, imports global.css)
    ├── styles/
    │   └── global.css                  ← NEW — all design tokens + shared component styles
    ├── data/
    │   └── salaryData.js               ← NEW — salary & company data + helper functions
    ├── components/shared/
    │   ├── Navbar.jsx                  ← replace (SalaryInsights360 logo + React Router links)
    │   ├── SalaryTable.jsx             ← NEW — reusable table used on both Home & Salaries pages
    │   └── SalaryDetailDrawer.jsx      ← NEW — slide-in detail panel with full offer breakdown
    └── pages/public/
        ├── HomePage.jsx                ← replace (hero + last-10 recent submissions)
        ├── SalariesPage.jsx            ← replace (filter bar + paginated table)
        ├── CompaniesPage.jsx           ← replace (last-10-updated default + search + pagination)
        ├── LoginPage.jsx               ← replace (360 branding)
        └── RegisterPage.jsx            ← replace (360 branding)
```

Files NOT included (keep your originals):
- `App.jsx`              — routing unchanged
- `context/AuthContext.jsx` — auth logic unchanged
- `services/api.js`      — Axios client unchanged
- `pages/public/DashboardPage.jsx`    — keep yours, apply styles from global.css
- `pages/public/SubmitSalaryPage.jsx` — keep yours, apply styles from global.css
- `pages/admin/*`        — all admin pages unchanged

---

## Step-by-step

### 1 — Copy the files

```bash
# From the root of your cloned repo:
cp -r path/to/this-folder/frontend/index.html          ./frontend/index.html
cp -r path/to/this-folder/frontend/src/main.jsx        ./frontend/src/main.jsx
cp -r path/to/this-folder/frontend/src/styles          ./frontend/src/styles
cp -r path/to/this-folder/frontend/src/data            ./frontend/src/data
cp    path/to/this-folder/frontend/src/components/shared/Navbar.jsx          ./frontend/src/components/shared/Navbar.jsx
cp    path/to/this-folder/frontend/src/components/shared/SalaryTable.jsx     ./frontend/src/components/shared/SalaryTable.jsx
cp    path/to/this-folder/frontend/src/components/shared/SalaryDetailDrawer.jsx ./frontend/src/components/shared/SalaryDetailDrawer.jsx
cp    path/to/this-folder/frontend/src/pages/public/HomePage.jsx             ./frontend/src/pages/public/HomePage.jsx
cp    path/to/this-folder/frontend/src/pages/public/SalariesPage.jsx         ./frontend/src/pages/public/SalariesPage.jsx
cp    path/to/this-folder/frontend/src/pages/public/CompaniesPage.jsx        ./frontend/src/pages/public/CompaniesPage.jsx
cp    path/to/this-folder/frontend/src/pages/public/LoginPage.jsx            ./frontend/src/pages/public/LoginPage.jsx
cp    path/to/this-folder/frontend/src/pages/public/RegisterPage.jsx         ./frontend/src/pages/public/RegisterPage.jsx
```

Or simply replace the entire `frontend/` folder if you want a clean drop-in.

---

### 2 — Remove MUI (optional but recommended)

The new design uses pure CSS — no MUI dependency needed for the redesigned pages.

```bash
cd frontend
npm uninstall @mui/material @emotion/react @emotion/styled
```

If you're keeping MUI for admin pages, skip this step. The CSS variables in
`global.css` are scoped to class names and won't conflict with MUI.

---

### 3 — Install & run

```bash
cd frontend
npm install
npm run dev
```

---

### 4 — Connect to live API data

The new components use mock data from `src/data/salaryData.js`.
To wire them to your real Spring Boot backend, replace the data imports
with API calls in each page:

**SalariesPage.jsx** — replace `SALARIES` with:
```js
// GET /api/public/salaries?page=0&size=10&sort=createdAt,desc
const { data } = await api.get('/public/salaries', { params: { page, size: 10 } });
```

**HomePage.jsx** — replace `getRecentSalaries()` with:
```js
// GET /api/public/salaries?size=10&sort=createdAt,desc&status=APPROVED
const { data } = await api.get('/public/salaries', { params: { size: 10, sort: 'createdAt,desc' } });
```

**CompaniesPage.jsx** — replace `ALL_COMPANIES` with:
```js
// GET /api/public/companies
const { data } = await api.get('/public/companies');
```

**SalaryDetailDrawer.jsx** — replace the local lookup with:
```js
// GET /api/public/salaries/:id
useEffect(() => {
  if (!salaryId) return;
  api.get(`/public/salaries/${salaryId}`).then(r => setSalary(r.data));
}, [salaryId]);
```

---

### 5 — Commit

```bash
git checkout -b feat/salaryinsights360-redesign
git add .
git commit -m "feat: SalaryInsights360 redesign — global CSS, drawer, companies pagination, recent-10 home"
git push origin feat/salaryinsights360-redesign
```

Then open a Pull Request on GitHub to merge into `main`.
