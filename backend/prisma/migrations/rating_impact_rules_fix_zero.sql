-- Prevent zero-rating (no reviews yet) from matching SUSPEND rule band 0.00–1.99
UPDATE public.rating_impact_rules
SET min_rating = 0.01,
    updated_at = now()
WHERE action_type = 'SUSPEND'
  AND min_rating = 0.00;
