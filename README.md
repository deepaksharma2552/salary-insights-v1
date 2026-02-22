# 💼 Salary Insights Portal

A full-stack salary management and analytics platform built with **Spring Boot 3.2**, **React 18**, **PostgreSQL**, and **JWT authentication**.

---

## 🏗️ Architecture Overview

```
salary-insights-portal/
├── backend/                          # Spring Boot 3.2 application
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/salaryinsights/
│       │   ├── SalaryInsightsApplication.java
│       │   ├── config/
│       │   │   └── SecurityConfig.java        # JWT + CORS + Method Security
│       │   ├── controller/
│       │   │   ├── AuthController.java        # POST /auth/register, /auth/login
│       │   │   ├── PublicSalaryController.java # GET /public/salaries + analytics
│       │   │   ├── PublicCompanyController.java
│       │   │   ├── SalaryController.java       # POST /salaries/submit (authenticated)
│       │   │   ├── AdminCompanyController.java # /admin/companies (ADMIN only)
│       │   │   ├── AdminSalaryController.java  # /admin/salaries (approve/reject)
│       │   │   └── AdminLevelController.java   # /admin/levels (mapping system)
│       │   ├── dto/
│       │   │   ├── request/  (LoginRequest, RegisterRequest, CompanyRequest, SalaryRequest...)
│       │   │   └── response/ (ApiResponse, PagedResponse, CompanyResponse, SalaryResponse...)
│       │   ├── entity/
│       │   │   ├── BaseEntity.java             # UUID PK + audit timestamps
│       │   │   ├── User.java
│       │   │   ├── Company.java
│       │   │   ├── SalaryEntry.java            # auto-calculates totalCompensation
│       │   │   ├── StandardizedLevel.java      # Junior, Mid, Senior, Lead...
│       │   │   ├── CompanyLevel.java           # L1, SDE-II, Associate...
│       │   │   ├── LevelMapping.java           # CompanyLevel → StandardizedLevel
│       │   │   └── AuditLog.java
│       │   ├── enums/ (Role, ExperienceLevel, ReviewStatus, CompanyStatus, EmploymentType...)
│       │   ├── exception/
│       │   │   ├── GlobalExceptionHandler.java # @ControllerAdvice
│       │   │   ├── ResourceNotFoundException.java
│       │   │   └── BadRequestException.java
│       │   ├── mapper/  (CompanyMapper, SalaryMapper, LevelMapper via MapStruct)
│       │   ├── repository/ (JPA repositories with JPQL analytics queries)
│       │   ├── security/
│       │   │   ├── JwtTokenProvider.java
│       │   │   ├── JwtAuthenticationFilter.java
│       │   │   └── UserDetailsServiceImpl.java
│       │   └── service/impl/
│       │       ├── AuthService.java
│       │       ├── CompanyService.java
│       │       ├── SalaryService.java
│       │       ├── LevelMappingService.java    # Core: auto-resolves standardized levels
│       │       └── AuditLogService.java
│       └── resources/
│           ├── application.yml
│           └── db/migration/
│               ├── V1__initial_schema.sql     # Full schema with indexes
│               └── V2__seed_data.sql          # Sample companies, levels, mappings, salaries
│
└── frontend/                         # React 18 + MUI + Recharts
    ├── package.json
    ├── vite.config.js                # proxies /api → :8080
    └── src/
        ├── App.jsx                   # React Router setup
        ├── main.jsx                  # MUI dark theme
        ├── context/AuthContext.jsx   # JWT auth state
        ├── services/api.js           # Axios client (auto-attaches JWT)
        ├── components/
        │   ├── shared/Navbar.jsx
        │   └── admin/AdminSidebar.jsx
        └── pages/
            ├── public/
            │   ├── HomePage.jsx
            │   ├── SalariesPage.jsx    # Filter, search, paginate
            │   ├── CompaniesPage.jsx
            │   ├── DashboardPage.jsx   # Recharts analytics
            │   ├── LoginPage.jsx
            │   ├── RegisterPage.jsx
            │   └── SubmitSalaryPage.jsx
            └── admin/
                ├── AdminDashboard.jsx      # Stats + trend chart
                ├── AdminCompanies.jsx      # CRUD companies
                ├── AdminPendingSalaries.jsx # Approve/reject
                ├── AdminLevelMappings.jsx  # Core: level mapping UI
                └── AdminAuditLogs.jsx
```

---

## ⚡ Quick Start

### Prerequisites
- Java 21+
- Maven 3.9+
- Node.js 18+
- PostgreSQL 15+

---

### 1. Database Setup

```bash
# Create database
psql -U postgres -c "CREATE DATABASE salary_insights_db;"
```

Or via psql prompt:
```sql
CREATE DATABASE salary_insights_db;
```

---

### 2. Backend Setup

```bash
cd backend

# Configure DB credentials (or set env vars)
# Edit src/main/resources/application.yml OR set:
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
export JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970

# Build and run
mvn clean install -DskipTests
mvn spring-boot:run
```

Flyway will **automatically run** V1 and V2 migrations on startup, creating all tables and seed data.

Backend starts at: `http://localhost:8080/api`

---

### 3. Frontend Setup

```bash
cd frontend

npm install
npm run dev
```

Frontend starts at: `http://localhost:3000`

---

## 🔐 Default Credentials

| Role  | Email                         | Password   |
|-------|-------------------------------|------------|
| Admin | admin@salaryinsights.com      | Admin@123  |

Register new users via `/register` (they get USER role by default).

---

## 🌐 API Reference

### Authentication
```
POST /api/auth/register     # Register new user
POST /api/auth/login        # Login, returns JWT
```

### Public (No Auth Required)
```
GET  /api/public/salaries              # Paginated approved salaries
GET  /api/public/salaries/{id}         # Single salary
GET  /api/public/salaries/analytics/by-level      # Avg salary by standardized level
GET  /api/public/salaries/analytics/by-location   # Avg salary by location
GET  /api/public/salaries/analytics/by-company    # Avg salary by company
GET  /api/public/companies             # Browse companies
GET  /api/public/companies/{id}        # Company details
GET  /api/public/companies/industries  # All industry names
```

### Authenticated (USER role)
```
POST /api/salaries/submit   # Submit salary for review
```

### Admin Only
```
GET    /api/admin/salaries/dashboard     # Stats + trends
GET    /api/admin/salaries/pending       # Pending reviews
PATCH  /api/admin/salaries/{id}/approve  # Approve entry
PATCH  /api/admin/salaries/{id}/reject   # Reject with reason

GET    /api/admin/companies              # All companies
POST   /api/admin/companies              # Create
PUT    /api/admin/companies/{id}         # Update
PATCH  /api/admin/companies/{id}/toggle-status  # Activate/deactivate
DELETE /api/admin/companies/{id}         # Delete

GET    /api/admin/levels/standardized               # All standardized levels
POST   /api/admin/levels/standardized               # Create
PUT    /api/admin/levels/standardized/{id}          # Update
DELETE /api/admin/levels/standardized/{id}          # Delete
GET    /api/admin/levels/company/{companyId}        # Company's internal levels
POST   /api/admin/levels/company                    # Add internal level to company
DELETE /api/admin/levels/company/{id}               # Remove level
POST   /api/admin/levels/mappings                   # Map internal → standardized
DELETE /api/admin/levels/mappings/company-level/{id}  # Remove mapping

GET    /api/admin/levels/audit-logs      # Paginated audit trail
```

---

## 🔁 Level Mapping System

The core feature: map company-internal levels to standardized cross-company levels.

**Example:**
```
TechCorp:  SDE-I  → Junior   (rank 2)
TechCorp:  SDE-II → Mid      (rank 3)
TechCorp:  SDE-III → Senior  (rank 4)

StartupXYZ: "Junior Engineer" → Junior (rank 2)
StartupXYZ: "Engineer" → Mid (rank 3)

MegaCorp: L3 → Junior (rank 2)
MegaCorp: L4 → Mid    (rank 3)
MegaCorp: L5 → Senior (rank 4)
```

When a salary is submitted with `companyInternalLevel = "SDE-II"`:
1. System looks up `CompanyLevel` for that company + level name
2. Resolves the `LevelMapping` → `StandardizedLevel`
3. Automatically sets `standardizedLevel = "Mid"` on the salary entry
4. Analytics queries use standardized levels for cross-company comparisons

---

## 🔐 Security Design

- **JWT tokens** (24h expiry) signed with HS256
- **BCrypt** password hashing (strength 12)
- **@PreAuthorize** method-level security
- **CORS** restricted to `localhost:3000` and `:5173`
- Stateless sessions (no server-side sessions)
- All admin routes require `ROLE_ADMIN`
- Public analytics endpoints are unauthenticated

---

## 📊 Database Schema

```sql
users                 -- Authentication + roles
companies             -- Company registry
standardized_levels   -- Junior, Mid, Senior, Lead, Director, VP, C-Level
company_levels        -- SDE-I, L4, Associate (company-specific)
level_mappings        -- company_level → standardized_level
salary_entries        -- Core data with auto-resolved standardized level
audit_logs            -- All admin actions with timestamps
```

**Key indexes for query performance:**
- `salary_entries(company_id, review_status, job_title, location, experience_level)`
- `companies(name, status)`
- `audit_logs(entity_type + entity_id, performed_by, created_at)`

---

## 🛠️ Technology Stack

| Layer      | Technology |
|------------|------------|
| Runtime    | Java 21 |
| Framework  | Spring Boot 3.2 |
| ORM        | Hibernate / Spring Data JPA |
| Security   | Spring Security + JWT (jjwt 0.12) |
| DB         | PostgreSQL 15 |
| Migrations | Flyway |
| Mapping    | MapStruct |
| Boilerplate| Lombok |
| Build      | Maven |
| Frontend   | React 18 + Vite |
| UI         | Material UI (MUI) v5 |
| Charts     | Recharts |
| HTTP       | Axios |
| Routing    | React Router v6 |

---

## 🧪 Running Tests

```bash
cd backend
mvn test
```

---

## 🚀 Production Build

```bash
# Frontend
cd frontend && npm run build   # outputs to dist/

# Backend (embed frontend or run separately)
cd backend && mvn clean package
java -jar target/salary-insights-portal-1.0.0.jar
```

---

## 🤖 AI-Powered Data Refresh (Core Feature 2)

### Overview

The **AI Refresh** feature uses **Anthropic Claude** to automatically fetch, parse, and import the latest publicly available salary data for all active companies.

### Architecture

```
Admin clicks "Refresh Latest Data (AI)"
        ↓
AdminAiController  POST /api/admin/ai/refresh  (or /refresh/{companyId})
        ↓
AiRefreshService  (orchestrates per-company pipeline)
        ↓
  ┌─────────────────────────────────────────────┐
  │  For each Company:                          │
  │                                             │
  │  LlmPromptBuilder → builds structured prompt│
  │  AnthropicClient  → calls Claude API        │
  │  WebDataFetcherService → parses JSON        │
  │  SalaryNormalizationService → persists data │
  │                                             │
  │  Detected new internal level?               │
  │   → Ask Claude for mapping suggestion       │
  └─────────────────────────────────────────────┘
        ↓
AuditLogService → logs the refresh event
        ↓
AiRefreshResult returned to frontend
```

### Setup: API Key

Set your Anthropic API key before running:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or in `application.yml`:
```yaml
app:
  ai:
    anthropic-api-key: sk-ant-...
```

### Endpoints

```
POST /api/admin/ai/refresh             # Refresh ALL active companies
POST /api/admin/ai/refresh/{companyId} # Refresh one specific company
```

### Response Shape

```json
{
  "status": "SUCCESS",
  "companiesProcessed": 5,
  "newSalariesAdded": 27,
  "levelsDetected": 3,
  "mappingSuggestions": 2,
  "durationMs": 8423,
  "companyResults": [
    {
      "companyName": "TechCorp Inc.",
      "status": "SUCCESS",
      "newSalaries": 8,
      "newLevels": 1
    }
  ],
  "mappingSuggestionList": [
    {
      "companyName": "StartupXYZ",
      "internalLevelName": "L5",
      "suggestedStandardizedLevel": "Senior",
      "confidence": 0.88,
      "reasoning": "L5 at tech startups typically maps to Senior (4-7 years)"
    }
  ]
}
```

### LLM Prompt Design

The system uses two prompt types:

**1. Salary Fetch Prompt** — sent per company:
> "Fetch the latest publicly available salary ranges for [Company] in [Location] for roles from Junior to Director. Return structured JSON with jobTitle, level, baseSalary, bonus, equity."

**2. Level Mapping Suggestion Prompt** — sent per new internal level:
> "Map internal level '[SDE-III]' at '[TechCorp]' to one of: Junior, Mid, Senior, Lead... Return JSON with suggestedStandardizedLevel, confidence, reasoning."

### Frontend UI

- **Admin Dashboard** — "Refresh Latest Data (AI)" button in top-right opens a live-progress modal
- **Company Management** — Each company row has an "AI" button for single-company refresh
- **Result Modal** — Shows animated loading state, then breakdown by company, stat badges, and collapsible mapping suggestions with confidence bars

---

## 📝 Environment Variables

| Variable                | Default    | Description |
|-------------------------|------------|-------------|
| `DB_USERNAME`           | postgres   | PostgreSQL username |
| `DB_PASSWORD`           | postgres   | PostgreSQL password |
| `JWT_SECRET`            | (base64)   | JWT signing secret |
| `ANTHROPIC_API_KEY`     | (empty)    | **Required for AI Refresh** |
| `AI_REFRESH_ENABLED`    | true       | Toggle AI refresh feature |

