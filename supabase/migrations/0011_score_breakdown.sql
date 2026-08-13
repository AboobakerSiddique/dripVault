-- Purely UI-driven: the generator already computes colorScore, styleScore,
-- occasionScore, weatherScore, formalityScore per outfit, but SAVE only
-- ever persisted the single overall `score`. The new dashboard needs the
-- breakdown to render (matches reference image), so it's stored now
-- instead of being silently discarded. No business logic changed - same
-- numbers the engine already produces, just not thrown away anymore.
alter table outfits add column if not exists score_breakdown jsonb;

