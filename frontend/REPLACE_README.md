# SalaryInsights360 — Frontend Replacement Guide

---

## ⚠️  IMPORTANT — Files you must NOT replace

Keep these files from your original project untouched:

| File | Why |
|------|-----|
| `src/App.jsx` | Contains your routing — DO NOT replace |
| `src/context/AuthContext.jsx` | Auth state — DO NOT replace |
| `src/services/api.js` | Axios client — DO NOT replace |
| `src/pages/public/DashboardPage.jsx` | Keep original |
| `src/pages/public/SubmitSalaryPage.jsx` | Keep original |
| `src/pages/admin/*` | All admin pages — keep originals |
| `src/components/admin/AdminSidebar.jsx` | Keep original |

---

## Step 1 — Create new directories

```bash
cd frontend
mkdir -p src/styles src/data
```

---

## Step 2 — Copy ONLY these files

```bash
# Run from the root of salary-insights-v1/

cp frontend_redesign/frontend/index.html                                           frontend/index.html
cp frontend_redesign/frontend/src/main.jsx                                         frontend/src/main.jsx
cp frontend_redesign/frontend/src/styles/global.css                                frontend/src/styles/global.css
cp frontend_redesign/frontend/src/data/salaryData.js                               frontend/src/data/salaryData.js
cp frontend_redesign/frontend/src/components/shared/Navbar.jsx                     frontend/src/components/shared/Navbar.jsx
cp frontend_redesign/frontend/src/components/shared/SalaryTable.jsx                frontend/src/components/shared/SalaryTable.jsx
cp frontend_redesign/frontend/src/components/shared/SalaryDetailDrawer.jsx         frontend/src/components/shared/SalaryDetailDrawer.jsx
cp frontend_redesign/frontend/src/pages/public/HomePage.jsx                        frontend/src/pages/public/HomePage.jsx
cp frontend_redesign/frontend/src/pages/public/SalariesPage.jsx                    frontend/src/pages/public/SalariesPage.jsx
cp frontend_redesign/frontend/src/pages/public/CompaniesPage.jsx                   frontend/src/pages/public/CompaniesPage.jsx
cp frontend_redesign/frontend/src/pages/public/LoginPage.jsx                       frontend/src/pages/public/LoginPage.jsx
cp frontend_redesign/frontend/src/pages/public/RegisterPage.jsx                    frontend/src/pages/public/RegisterPage.jsx
```

---

## Step 3 — Run

```bash
cd frontend
npm install
npm run dev
```

---

## Troubleshooting

### ❌  Could not resolve "./App" or "./context/AuthContext"

This means App.jsx was accidentally replaced. Restore it from git:

```bash
cd frontend
git checkout HEAD -- src/App.jsx
```

Or if you don't have git history, just undo the copy — App.jsx was NOT
supposed to be in this package.

---

### ❌  Styles not applying

Open src/main.jsx and confirm this import exists before the App import:

```js
import './styles/global.css';  // ← must be here
import App from './App';
```

---

### ❌  Missing src/data or src/styles directory

```bash
mkdir -p frontend/src/styles frontend/src/data
```

Then re-copy from Step 2.

---

## Step 4 — Wire to live API (optional)

The redesigned pages use mock data from src/data/salaryData.js.
To connect to your Spring Boot backend:

**HomePage.jsx** — replace `getRecentSalaries(10)`:
```js
const [rows, setRows] = useState([]);
useEffect(() => {
  api.get('/public/salaries', { params: { size: 10, sort: 'createdAt,desc' } })
     .then(r => setRows(r.data.content));
}, []);
// then pass rows to <SalaryTable rows={rows} />
```

**SalariesPage.jsx** — replace the SALARIES filter:
```js
api.get('/public/salaries', { params: { page: page - 1, size: 10 } })
```

**CompaniesPage.jsx** — replace ALL_COMPANIES:
```js
api.get('/public/companies').then(r => setCompanies(r.data.content))
```

**SalaryDetailDrawer.jsx** — replace local lookup:
```js
useEffect(() => {
  if (!salaryId) return;
  api.get(`/public/salaries/${salaryId}`).then(r => setSalary(r.data));
}, [salaryId]);
```

---

## Step 5 — Commit

```bash
git checkout -b feat/salaryinsights360-redesign
git add .
git commit -m "feat: SalaryInsights360 redesign"
git push origin feat/salaryinsights360-redesign
```
