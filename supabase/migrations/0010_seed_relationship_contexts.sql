-- 0010_seed_relationship_contexts.sql
-- Phase 4 — seed the relationship contexts (implementation plan §4.1, blueprint §10).
-- Sensitive ones are flagged so the UI/moderation can treat them with care.
-- Idempotent via on conflict (slug).

insert into public.relationship_contexts (slug, label, emoji, is_sensitive, sort_order) values
  ('cheated_on',              'Cheated On',            '💔', true,  1),
  ('ghosted',                 'Ghosted',               '👻', false, 2),
  ('wedding_cancelled',       'Wedding Cancelled',     '💍', true,  3),
  ('divorce',                 'Divorce',               '📄', true,  4),
  ('moving_out',              'Moving Out',            '📦', false, 5),
  ('terrible_gift',           'Terrible Gift',         '🎁', false, 6),
  ('what_was_i_thinking',     'What Was I Thinking?',  '🤦', false, 7),
  ('at_least_they_had_taste', 'At Least They Had Taste','🥂', false, 8),
  ('peaceful_goodbye',        'Peaceful Goodbye',      '🕊️', false, 9),
  ('other',                   'Other',                 '•',  false, 10)
on conflict (slug) do nothing;
