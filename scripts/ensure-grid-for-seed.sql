-- Campus locations seed expects grid indexes up to row/col 9 (grid_n ≥ 10).
-- If admins saved a smaller grid_n in app_config before running 20250518, bump it minimally.
UPDATE public.app_config SET grid_n = GREATEST(grid_n, 10) WHERE id = 1;
