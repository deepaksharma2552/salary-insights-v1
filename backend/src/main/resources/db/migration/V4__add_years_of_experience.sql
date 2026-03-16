-- Add years_of_experience column to salary_entries
ALTER TABLE salary_entries
    ADD COLUMN years_of_experience INTEGER;

CREATE INDEX idx_salary_yoe ON salary_entries(years_of_experience);
