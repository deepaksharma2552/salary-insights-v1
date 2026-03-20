# Salary Insights Portal — Backend

Spring Boot REST API serving salary data, analytics, referrals, and a level-comparison guide for Indian tech professionals. Backed by PostgreSQL with Flyway migrations and Caffeine in-memory caching.

---

## Tech Stack

| Layer | Library / Tool |
|---|---|
| Framework | Spring Boot 3.x |
| Language | Java 17 |
| Database | PostgreSQL |
| Migrations | Flyway |
| ORM | Spring Data JPA / Hibernate |
| Security | Spring Security — JWT + Google OAuth 2.0 |
| Mapping | MapStruct |
| Caching | Caffeine (two named caches) |
| Boilerplate | Lombok |
| Build | Maven |
| AI | Anthropic Claude API (optional salary normalisation) |

---

## Project Structure

```
src/main/java/com/salaryinsights/
│
├── SalaryInsightsApplication.java        # Entry point — @SpringBootApplication
│
├── config/
│   ├── AppConfig.java                    # CORS, misc beans
│   ├── BeansConfig.java                  # PasswordEncoder, AuthenticationManager
│   ├── CacheConfig.java                  # Caffeine — "analytics" + "referenceData" caches
│   └── SecurityConfig.java               # JWT filter chain, OAuth2, public endpoints
│
├── controller/
│   ├── PublicSalaryController.java       # GET /public/salaries/** — browse + analytics
│   ├── PublicCompanyController.java      # GET /public/companies/**
│   ├── PublicReferralController.java     # GET /public/referrals — referral board
│   ├── PublicGuideLevelController.java   # GET /public/guide-levels/standard + /grid
│   ├── PublicJobFunctionController.java  # GET /public/job-functions
│   ├── SalaryController.java             # POST /salaries — authenticated submission
│   ├── ReferralController.java           # POST /referrals — authenticated submission
│   ├── AuthController.java               # POST /auth/login, /auth/register
│   ├── AdminSalaryController.java        # PATCH /admin/salaries/:id — approve/reject
│   ├── AdminCompanyController.java       # CRUD /admin/companies
│   ├── AdminReferralController.java      # PATCH /admin/referrals/:id
│   ├── AdminGuideLevelController.java    # CRUD /admin/guide-levels
│   ├── AdminJobFunctionController.java   # CRUD /admin/job-functions
│   ├── AdminAuditLogController.java      # GET /admin/audit
│   └── AdminAiController.java            # POST /admin/ai/refresh
│
├── entity/
│   ├── BaseEntity.java                   # id (UUID), createdAt, updatedAt
│   ├── User.java
│   ├── Company.java                      # name, industry, website, logoUrl, status
│   ├── CompanyLevel.java                 # internal level names per company
│   ├── SalaryEntry.java                  # core salary record
│   ├── Referral.java                     # referral link + expiry
│   ├── StandardizedLevel.java
│   ├── LevelMapping.java                 # company level → standard level
│   ├── JobFunction.java                  # Engineering, Product, Program…
│   ├── FunctionLevel.java                # SDE 1, SDE 2… within a function
│   ├── GuideStandardLevel.java           # Level Guide standard levels
│   ├── GuideCompanyLevel.java            # company-specific guide level
│   ├── GuideMapping.java                 # guide company level → standard level
│   └── AuditLog.java
│
├── enums/
│   ├── Location.java                     # BENGALURU, HYDERABAD, PUNE, DELHI_NCR…
│   ├── InternalLevel.java                # SDE_1, SDE_2… VP
│   ├── ExperienceLevel.java              # INTERN, ENTRY, MID, SENIOR, LEAD…
│   ├── EmploymentType.java
│   ├── ReviewStatus.java                 # PENDING, APPROVED, REJECTED
│   ├── ReferralStatus.java
│   ├── CompanyStatus.java
│   ├── CompanyLevelCategory.java
│   └── Role.java                         # USER, ADMIN
│
├── dto/
│   ├── request/                          # Inbound payloads (validation-annotated)
│   └── response/                         # Outbound shapes — always wrapped in ApiResponse<T>
│       ├── ApiResponse.java              # { success, message, data }
│       ├── PagedResponse.java            # { content, page, size, totalElements, totalPages }
│       ├── SalaryResponse.java           # includes logoUrl, website from company
│       ├── SalaryAggregationDTO.java     # analytics row — groupKey, avg*, count, confidence
│       ├── CompanyLevelSalaryDTO.java    # company × level analytics row
│       ├── LocationLevelSalaryDTO.java   # location × level analytics row
│       └── ...
│
├── repository/
│   ├── SalaryEntryRepository.java        # JpaRepository + JpaSpecificationExecutor + native CTEs
│   ├── CompanyRepository.java
│   ├── ReferralRepository.java
│   └── ...
│
├── service/impl/
│   ├── SalaryService.java                # Core business logic — submit, review, analytics
│   ├── CompanyService.java
│   ├── ReferralService.java
│   ├── GuideLevelService.java            # Level Guide grid builder
│   ├── JobFunctionService.java           # Job functions + levels (cached 24h)
│   ├── AuthService.java
│   ├── LevelMappingService.java
│   └── AuditLogService.java
│
├── service/ai/
│   ├── AiRefreshService.java             # Orchestrates AI salary normalisation
│   ├── AnthropicClient.java              # HTTP client for Claude API
│   ├── LlmPromptBuilder.java
│   ├── SalaryNormalizationService.java
│   └── WebDataFetcherService.java
│
├── security/
│   ├── JwtTokenProvider.java
│   ├── JwtAuthenticationFilter.java
│   ├── UserDetailsServiceImpl.java
│   └── oauth2/                           # Google OAuth2 handlers
│
├── mapper/
│   ├── SalaryMapper.java                 # MapStruct — SalaryEntry ↔ SalaryResponse/Request
│   ├── CompanyMapper.java
│   └── LevelMapper.java
│
└── exception/
    ├── GlobalExceptionHandler.java
    ├── BadRequestException.java
    └── ResourceNotFoundException.java
```

---

## Database Schema

Managed by Flyway. Migrations live in `src/main/resources/db/migration/`.

| Migration | Description |
|---|---|
| V1 | Initial schema — users, companies, salary_entries, levels, mappings |
| V2 | Seed data |
| V3 | AI refresh support columns |
| V4 | `years_of_experience` column |
| V5 | Internal level enum column |
| V6 | Location enum column |
| V7 | Analytics seed data |
| V8 | Analytics indexes |
| V9 | Referrals table |
| V10 | Referral expiry column |
| V11 | Guide levels tables |
| V12 | Job functions + function levels tables |

### Core Tables

```
users               — email, password, role (USER/ADMIN), OAuth provider
companies           — name, industry, website, logo_url, status
salary_entries      — company_id, job_title, base_salary, bonus, equity,
                      total_compensation, experience_level, internal_level,
                      location, years_of_experience, review_status,
                      job_function_id, function_level_id
referrals           — referred_by_id, company_id, referral_link,
                      status, expires_at
job_functions       — name, display_name, sort_order
function_levels     — job_function_id, name, sort_order
guide_standard_levels   — standard level definitions for the Level Guide
guide_company_levels    — company-specific level names
guide_mappings          — guide_company_level → guide_standard_level
audit_logs          — entity, action, performed_by, timestamp
```

**Key indexes on `salary_entries`:** `company_id`, `review_status`, `job_title`, `location`, `experience_level`, `job_function_id`, `function_level_id`

---

## API Endpoints

All responses follow `{ "success": true, "data": T }`. Paginated responses include `{ content, page, size, totalElements, totalPages, last }`.

### Public — no authentication required

```
GET  /api/public/salaries                         Paginated salary browse
                                                  ?companyName=&jobTitle=&location=&experienceLevel=&page=&size=
GET  /api/public/salaries/{id}                    Single salary entry
GET  /api/public/salaries/analytics/by-location   Avg salary per location
GET  /api/public/salaries/analytics/by-location-level  Avg salary per location × internal level (last 5 locations by recency)
GET  /api/public/salaries/analytics/by-company    Avg salary per company (top companies)
GET  /api/public/salaries/analytics/by-company-level   Avg salary per company × level (last 5 by recency)
GET  /api/public/salaries/analytics/by-internal-level  Avg salary per internal level

GET  /api/public/companies                        Paginated company list ?name=&industry=&page=&size=
GET  /api/public/companies/{id}
GET  /api/public/companies/{id}/salaries          Salary entries for one company
GET  /api/public/companies/industries             Distinct industry list

GET  /api/public/referrals                        Active approved referral board

GET  /api/public/guide-levels/standard            All standard levels (Level Guide)
GET  /api/public/guide-levels/grid?companyIds=… Level comparison grid (up to 5 companies)

GET  /api/public/job-functions                    All job functions with levels (24h cached)
```

### Authenticated — requires `Authorization: Bearer <token>`

```
POST /api/auth/login                              { email, password } → { accessToken, ... }
POST /api/auth/register                           { firstName, lastName, email, password }

POST /api/salaries                                Submit salary entry
POST /api/referrals                               Submit referral link
GET  /api/referrals/my-links                      User's own submitted referrals
GET  /api/referrals/my-referrals                  Referrals received by the user
```

### Admin — requires `ADMIN` role

```
GET    /api/admin/salaries/pending                Pending review queue
PATCH  /api/admin/salaries/{id}/review            Approve or reject a submission

GET    /api/admin/companies                       Full company list (unpaginated)
POST   /api/admin/companies                       Create company
PUT    /api/admin/companies/{id}                  Update company
DELETE /api/admin/companies/{id}                  Delete company

PATCH  /api/admin/referrals/{id}                  Approve/reject referral

GET    /api/admin/guide-levels                    All guide levels
POST   /api/admin/guide-levels/standard           Create standard level
POST   /api/admin/guide-levels/company            Create company-level mapping
DELETE /api/admin/guide-levels/{id}               Delete

GET    /api/admin/job-functions                   All job functions
POST   /api/admin/job-functions                   Create job function
PUT    /api/admin/job-functions/{id}              Update
DELETE /api/admin/job-functions/{id}              Delete

GET    /api/admin/audit                           Audit log (paginated)
POST   /api/admin/ai/refresh                      Trigger AI salary normalisation
```

---

## Getting Started

### Prerequisites

- Java 17
- Maven 3.8+
- PostgreSQL 14+

### Local Setup

**1. Create the database**

```sql
CREATE DATABASE salary_insights_db;
```

**2. Configure environment variables**

Copy and set the following (or set in your IDE run config):

```bash
DATABASE_URL=jdbc:postgresql://localhost:5432/salary_insights_db
DB_USERNAME=postgres
DB_PASSWORD=postgres
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APP_OAUTH2_REDIRECT_URI=http://localhost:3000/oauth2/redirect
JWT_SECRET=your-256-bit-hex-secret
ANTHROPIC_API_KEY=your-key          # optional — AI refresh only
AI_REFRESH_ENABLED=false            # set true to enable AI normalisation
```

**3. Run**

```bash
mvn spring-boot:run
```

Flyway will apply all migrations automatically on startup. API is available at `http://localhost:8080/api`.

### Production Profile

Set `SPRING_PROFILES_ACTIVE=production` to activate `application-production.yml`, which:
- Requires all datasource values via env vars (no defaults)
- Sets `ddl-auto: validate` (Flyway owns schema, Hibernate never alters it)
- Reduces logging to WARN / INFO
- Exposes only `health`, `info`, `metrics` actuator endpoints
- Increases HikariCP pool to 20 connections (min 10 idle)

---

## Caching

Two Caffeine caches configured in `CacheConfig.java`:

| Cache | TTL | Max Entries | What's cached |
|---|---|---|---|
| `analytics` | 1 hour | 1000 | All salary aggregation results — by-location, by-company, by-location-level, by-company-level |
| `referenceData` | 24 hours | 50 | Job functions + levels |

**Invalidation strategy:**
- `analytics` cache is fully evicted (`allEntries = true`) whenever a salary entry is approved or rejected via `reviewSalary()`. This ensures the charts always reflect the latest approved data.
- `referenceData` cache is evicted on any admin write to job functions or their levels.
- TTLs act as a safety net for missed evictions (e.g. direct DB edits, deployments).

Cache hit/miss metrics are available via `/actuator/metrics/cache.gets`.

---

## Analytics Queries

Analytics endpoints use PostgreSQL CTEs to compute aggregations once and reference aliases in the ORDER BY — no double aggregation.

**`by-company-level`** — `top_companies` CTE selects the 5 companies with the most recently approved salary entry (`ORDER BY MAX(created_at) DESC LIMIT 5`), then `level_agg` CTE joins and aggregates per company × internal level.

**`by-location-level`** — `loc_recency` CTE finds the 5 most recently updated locations, then `loc_lvl` CTE joins and aggregates per location × internal level.

**Confidence scoring** — `computeConfidence(count, mostRecentEntry)` computes a two-signal score:
```
score = log(count + 1) × e^(-0.05 × months_since_last_entry)
```
Maps to `HIGH` (≥ 1.5), `MEDIUM` (≥ 0.6), `LOW` (< 0.6), or `INSUFFICIENT` (< 2 entries). Mirrors the approach used by Glassdoor and Levels.fyi.

---

## Security

- **JWT** — HS256, configured secret via `JWT_SECRET` env var, 24h expiry (7d refresh)
- **Google OAuth 2.0** — Spring Security OAuth2 client. On success, backend issues a JWT and redirects to `APP_OAUTH2_REDIRECT_URI` with token as a query param
- **CORS** — allowed origins configured via `APP_CORS_ORIGIN` env var (defaults to `http://localhost:3000`)
- **Public endpoints** — all `/api/public/**` routes are unauthenticated. Everything else requires a valid JWT
- **Admin endpoints** — additionally require `role = ADMIN` enforced via `@PreAuthorize`
- **Stateless sessions** — `SessionCreationPolicy.STATELESS`, no server-side session

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes in prod | `jdbc:postgresql://localhost:5432/salary_insights_db` | JDBC URL |
| `DB_USERNAME` | Yes in prod | `postgres` | DB user |
| `DB_PASSWORD` | Yes in prod | `postgres` | DB password |
| `JWT_SECRET` | Recommended | dev fallback in yml | 256-bit hex secret for JWT signing |
| `GOOGLE_CLIENT_ID` | For OAuth | — | Google OAuth2 client ID |
| `GOOGLE_CLIENT_SECRET` | For OAuth | — | Google OAuth2 client secret |
| `APP_OAUTH2_REDIRECT_URI` | For OAuth | `http://localhost:3000/oauth2/redirect` | Frontend OAuth callback URL |
| `APP_CORS_ORIGIN` | Yes in prod | `http://localhost:3000` | Allowed CORS origin |
| `ANTHROPIC_API_KEY` | Optional | — | Claude API key for AI salary refresh |
| `AI_REFRESH_ENABLED` | Optional | `true` | Enable/disable AI refresh feature |
| `PORT` | Optional | `8080` | Server port |
| `SPRING_PROFILES_ACTIVE` | Recommended | — | Set to `production` for prod config |
| `SPRING_DATASOURCE_URL` | Prod only | — | Overrides DATABASE_URL in production profile |
| `SPRING_DATASOURCE_USERNAME` | Prod only | — | Overrides DB_USERNAME in production profile |
| `SPRING_DATASOURCE_PASSWORD` | Prod only | — | Overrides DB_PASSWORD in production profile |
