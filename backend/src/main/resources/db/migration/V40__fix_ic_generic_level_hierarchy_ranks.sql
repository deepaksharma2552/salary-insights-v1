-- V40__fix_ic_generic_level_hierarchy_ranks.sql
--
-- PROBLEM
-- -------
-- V38 corrected hierarchy_rank for Intern (1→5), Director (8→80), VP (9→100),
-- and C-Level (10→110), but intentionally skipped the six IC-ladder generic names:
--
--   Junior    rank=2   (SDE-tier equivalent: SDE 1,              rank=10)
--   Mid       rank=3   (SDE-tier equivalent: SDE 2,              rank=20)
--   Senior    rank=4   (SDE-tier equivalent: SDE 3,              rank=30)
--   Lead      rank=5   (SDE-tier equivalent: Staff Engineer,      rank=40)
--   Principal rank=6   (SDE-tier equivalent: Principal Engineer,  rank=50)
--   Manager   rank=7   (SDE-tier equivalent: Engineering Manager, rank=60)
--
-- V38 rationale was "V37 remapped all salary_entries off them so they won't
-- appear in analytics". This was incorrect: V2 seed data inserts entries
-- directly onto these generic rows, and any entries submitted via paths that
-- bypass the AI enrichment (e.g. admin bulk imports, test data) also land here.
-- The result: Senior (rank=4) sorts BEFORE SDE 1 (rank=10) in every analytics
-- chart that uses ORDER BY hierarchy_rank.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- Assigns each generic IC-ladder name a hierarchy_rank that slots it between
-- its nearest SDE-tier neighbours, making the ordering correct even if entries
-- still point to the old rows:
--
--   Junior    → 10  (same rank as SDE 1 — treated as equivalent)
--   Mid       → 20  (same rank as SDE 2)
--   Senior    → 30  (same rank as SDE 3)
--   Lead      → 40  (same rank as Staff Engineer)
--   Principal → 50  (same rank as Principal Engineer)
--   Manager   → 60  (same rank as Engineering Manager)
--
-- Using the same rank value as the SDE-tier row means both names sort together,
-- which is correct — they represent the same career level.
--
-- SAFETY
-- ------
-- Every UPDATE is scoped by both name AND the old rank value so it is fully
-- idempotent: re-running after the ranks are already correct produces 0 rows
-- updated and no errors.
-- No salary figures, company associations, dates, or other columns are touched.

UPDATE standardized_levels SET hierarchy_rank = 10 WHERE name = 'Junior'    AND hierarchy_rank = 2;
UPDATE standardized_levels SET hierarchy_rank = 20 WHERE name = 'Mid'       AND hierarchy_rank = 3;
UPDATE standardized_levels SET hierarchy_rank = 30 WHERE name = 'Senior'    AND hierarchy_rank = 4;
UPDATE standardized_levels SET hierarchy_rank = 40 WHERE name = 'Lead'      AND hierarchy_rank = 5;
UPDATE standardized_levels SET hierarchy_rank = 50 WHERE name = 'Principal' AND hierarchy_rank = 6;
UPDATE standardized_levels SET hierarchy_rank = 60 WHERE name = 'Manager'   AND hierarchy_rank = 7;
