-- V38__fix_generic_level_hierarchy_ranks.sql
--
-- PROBLEM
-- -------
-- V2 seeded generic standardized_levels with small hierarchy_rank values:
--   Intern(1), Junior(2), Mid(3), Senior(4), Lead(5),
--   Principal(6), Manager(7), Director(8), VP(9), C-Level(10)
--
-- V27 later added SDE-tier rows with 10-step gaps:
--   SDE 1(10), SDE 2(20), SDE 3(30), ..., Director(80), VP(100)
-- BUT used ON CONFLICT DO NOTHING, so Director and VP were NOT updated —
-- the V2 rows (ranks 8, 9) survived.
--
-- V37 remapped salary_entries for Junior/Mid/Senior/Lead/Principal/Manager
-- to their SDE-tier equivalents, but intentionally left Director, VP, C-Level
-- alone because "they exist only in V2". This left Director at rank=8 and
-- VP at rank=9, both BELOW SDE 1's rank=10 — causing Director to sort
-- before SDE 1 in analytics charts.
--
-- WHAT THIS MIGRATION DOES
-- ------------------------
-- Corrects the hierarchy_rank of the stale V2 generic rows so they fall
-- AFTER all SDE-tier rows in sort order.
--
-- Intern:    1  → 5   (pre-entry; stays below SDE 1=10, consistent with V36)
-- Director:  8  → 80  (matches what V27 intended; after SDE 3=30, Staff=40, etc.)
-- VP:        9  → 100 (matches V27 intent)
-- C-Level:   10 → 110 (above VP, no SDE-tier equivalent)
--
-- Junior/Mid/Senior/Lead/Principal/Manager are left alone — V37 remapped all
-- salary_entries off them; these rows are now orphaned for analytics purposes
-- and will not appear in charts. Updating their ranks is safe but has no effect.
--
-- SAFETY
-- ------
-- Every UPDATE is scoped by name — idempotent and safe to re-run.
-- No salary figures or entry associations are modified.

UPDATE standardized_levels SET hierarchy_rank = 5   WHERE name = 'Intern'   AND hierarchy_rank = 1;
UPDATE standardized_levels SET hierarchy_rank = 80  WHERE name = 'Director' AND hierarchy_rank = 8;
UPDATE standardized_levels SET hierarchy_rank = 100 WHERE name = 'VP'       AND hierarchy_rank = 9;
UPDATE standardized_levels SET hierarchy_rank = 110 WHERE name = 'C-Level'  AND hierarchy_rank = 10;
