-- V17__launchpad.sql
-- Launchpad: admin-curated prep resources + community interview experiences.
-- companies/questions stored as TEXT (JSON array strings) — no jsonb extension needed.
-- Full-text search via tsvector + GIN index on experiences.

-- ── Resources (admin-curated, bounded) ───────────────────────────────────────
CREATE TABLE launchpad_resources (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR(20)  NOT NULL CHECK (type IN ('CODING','SYSTEM_DESIGN','ARTICLE')),
    title       VARCHAR(300) NOT NULL,
    difficulty  VARCHAR(10)  CHECK (difficulty IN ('EASY','MEDIUM','HARD')),
    topic       VARCHAR(100),
    companies   TEXT         NOT NULL DEFAULT '[]',
    link        TEXT,
    description VARCHAR(1000),
    active      BOOLEAN      NOT NULL DEFAULT true,
    sort_order  INTEGER      NOT NULL DEFAULT 0,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP
);

CREATE INDEX idx_lp_res_type_active ON launchpad_resources(type, active, sort_order);
CREATE INDEX idx_lp_res_difficulty  ON launchpad_resources(type, difficulty, active);

-- ── Experiences (community-generated, unbounded) ──────────────────────────────
CREATE TABLE launchpad_experiences (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    submitted_by_id UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id      UUID        REFERENCES companies(id) ON DELETE SET NULL,
    company_name    VARCHAR(255),
    round_type      VARCHAR(30) NOT NULL CHECK (round_type IN ('DSA','SYSTEM_DESIGN','HR','MANAGERIAL','FULL_LOOP')),
    year            INTEGER,
    got_offer       BOOLEAN,
    experience      TEXT        NOT NULL,
    questions       TEXT        NOT NULL DEFAULT '[]',
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
    admin_note      VARCHAR(500),
    active          BOOLEAN     NOT NULL DEFAULT true,
    search_vector   TSVECTOR,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP
);

-- Partial indexes — only rows that will be queried on the public board.
-- These stay lean at 50,000+ rows because of the WHERE clause filters.
CREATE INDEX idx_lp_exp_board
    ON launchpad_experiences(created_at DESC)
    WHERE status = 'ACCEPTED' AND active = true;

CREATE INDEX idx_lp_exp_company
    ON launchpad_experiences(company_id, created_at DESC)
    WHERE status = 'ACCEPTED' AND active = true;

CREATE INDEX idx_lp_exp_round
    ON launchpad_experiences(round_type, created_at DESC)
    WHERE status = 'ACCEPTED' AND active = true;

CREATE INDEX idx_lp_exp_admin  ON launchpad_experiences(status, created_at DESC);
CREATE INDEX idx_lp_exp_search ON launchpad_experiences USING gin(search_vector);

-- Auto-maintain search_vector on insert/update
CREATE OR REPLACE FUNCTION lp_exp_search_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        to_tsvector('english',
            coalesce(NEW.company_name, '') || ' ' ||
            coalesce(NEW.experience,   '') || ' ' ||
            coalesce(NEW.round_type,   '') || ' ' ||
            coalesce(NEW.questions,    '')
        );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lp_exp_search_trigger
    BEFORE INSERT OR UPDATE ON launchpad_experiences
    FOR EACH ROW EXECUTE FUNCTION lp_exp_search_update();
