-- V1__initial_schema.sql
-- Salary Insights Portal - Initial Database Schema

-- Users table
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'USER',
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP
);

CREATE INDEX idx_user_email ON users(email);

-- Companies table
CREATE TABLE companies (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                    VARCHAR(255) NOT NULL,
    industry                VARCHAR(100),
    location                VARCHAR(255),
    company_size            VARCHAR(50),
    company_level_category  VARCHAR(30),
    website                 VARCHAR(500),
    logo_url                VARCHAR(500),
    status                  VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at              TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP
);

CREATE INDEX idx_company_name   ON companies(name);
CREATE INDEX idx_company_status ON companies(status);

-- Standardized levels table
CREATE TABLE standardized_levels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    hierarchy_rank  INTEGER      NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP
);

-- Company-specific internal levels
CREATE TABLE company_levels (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID         NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    internal_level_name VARCHAR(100) NOT NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    UNIQUE (company_id, internal_level_name)
);

CREATE INDEX idx_company_level_company ON company_levels(company_id);

-- Level mappings: company internal → standardized
CREATE TABLE level_mappings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_level_id      UUID NOT NULL UNIQUE REFERENCES company_levels(id) ON DELETE CASCADE,
    standardized_level_id UUID NOT NULL REFERENCES standardized_levels(id),
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP
);

-- Salary entries table
CREATE TABLE salary_entries (
    id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id            UUID           NOT NULL REFERENCES companies(id),
    job_title             VARCHAR(200)   NOT NULL,
    department            VARCHAR(100),
    experience_level      VARCHAR(30)    NOT NULL,
    company_internal_level VARCHAR(100),
    standardized_level_id UUID           REFERENCES standardized_levels(id),
    location              VARCHAR(200),
    base_salary           NUMERIC(15,2)  NOT NULL,
    bonus                 NUMERIC(15,2),
    equity                NUMERIC(15,2),
    total_compensation    NUMERIC(15,2),
    employment_type       VARCHAR(30)    NOT NULL,
    review_status         VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    rejection_reason      VARCHAR(500),
    submitted_by_id       UUID           REFERENCES users(id),
    created_at            TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP
);

CREATE INDEX idx_salary_company        ON salary_entries(company_id);
CREATE INDEX idx_salary_review_status  ON salary_entries(review_status);
CREATE INDEX idx_salary_job_title      ON salary_entries(job_title);
CREATE INDEX idx_salary_location       ON salary_entries(location);
CREATE INDEX idx_salary_experience     ON salary_entries(experience_level);

-- Audit logs
CREATE TABLE audit_logs (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type  VARCHAR(100) NOT NULL,
    entity_id    VARCHAR(100),
    action       VARCHAR(50)  NOT NULL,
    performed_by VARCHAR(255),
    details      TEXT,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user   ON audit_logs(performed_by);
CREATE INDEX idx_audit_time   ON audit_logs(created_at DESC);
