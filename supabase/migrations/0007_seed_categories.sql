-- 0007_seed_categories.sql
-- Phase 3 — seed the object taxonomy (implementation plan §3.1, blueprint §6).
-- Top-level categories + a first set of subcategories. Subcategory slugs are
-- parent-prefixed so the global unique(slug) holds (e.g. jewelry vs luxury watches).
-- Idempotent: on conflict (slug) do nothing.

-- Top-level (§3.1).
insert into public.categories (slug, name, sort_order) values
  ('fashion',      'Fashion',      1),
  ('electronics',  'Electronics',  2),
  ('jewelry',      'Jewelry',      3),
  ('luxury',       'Luxury',       4),
  ('home',         'Home',         5),
  ('gaming',       'Gaming',       6),
  ('wedding',      'Wedding',      7),
  ('travel',       'Travel',       8),
  ('collectibles', 'Collectibles', 9),
  ('other',        'Other',        10)
on conflict (slug) do nothing;

-- Subcategories. parent_id resolved by slug so this survives identity renumbering.
insert into public.categories (parent_id, slug, name, sort_order)
select p.id, v.slug, v.name, v.sort_order
from (values
  ('fashion',      'fashion-bags',            'Bags',          1),
  ('fashion',      'fashion-shoes',           'Shoes',         2),
  ('fashion',      'fashion-clothing',        'Clothing',      3),
  ('fashion',      'fashion-accessories',     'Accessories',   4),

  ('electronics',  'electronics-smartphones', 'Smartphones',   1),
  ('electronics',  'electronics-computers',   'Computers',     2),
  ('electronics',  'electronics-audio',       'Audio',         3),
  ('electronics',  'electronics-cameras',     'Cameras',       4),

  ('jewelry',      'jewelry-rings',           'Rings',         1),
  ('jewelry',      'jewelry-watches',         'Watches',       2),
  ('jewelry',      'jewelry-necklaces',       'Necklaces',     3),

  ('luxury',       'luxury-handbags',         'Handbags',      1),
  ('luxury',       'luxury-watches',          'Watches',       2),
  ('luxury',       'luxury-apparel',          'Apparel',       3),

  ('home',         'home-furniture',          'Furniture',     1),
  ('home',         'home-decor',              'Decor',         2),
  ('home',         'home-kitchen',            'Kitchen',       3),

  ('gaming',       'gaming-consoles',         'Consoles',      1),
  ('gaming',       'gaming-games',            'Games',         2),
  ('gaming',       'gaming-accessories',      'Accessories',   3),

  ('wedding',      'wedding-dresses',         'Dresses',       1),
  ('wedding',      'wedding-decor',           'Decor',         2),
  ('wedding',      'wedding-rings',           'Rings',         3),

  ('travel',       'travel-luggage',          'Luggage',       1),
  ('travel',       'travel-gear',             'Gear',          2),

  ('collectibles', 'collectibles-art',        'Art',           1),
  ('collectibles', 'collectibles-vinyl',      'Vinyl',         2),
  ('collectibles', 'collectibles-cards',      'Trading Cards', 3)
) as v(parent_slug, slug, name, sort_order)
join public.categories p on p.slug = v.parent_slug
on conflict (slug) do nothing;
