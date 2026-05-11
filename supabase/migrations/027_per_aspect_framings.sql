-- Per-aspect framings (portrait / square / landscape).
-- ----------------------------------------------------------------------------
-- The treemap layout assigns each slot an aspect ratio purely from its
-- (logarithmic) bid weight, so a slot can render as portrait, square, or
-- landscape and the aspect changes whenever a new bid arrives. With a single
-- pan/zoom triplet the user can only pre-frame for one of those shapes; the
-- other two end up however object-fit:cover happens to crop.
--
-- This migration adds a `framings` JSONB column that stores three
-- independent {pan_x, pan_y, zoom} triplets, one per aspect bucket. The
-- renderer picks the bucket from the slot's actual rendered aspect at draw
-- time. Existing pan_x/pan_y/zoom columns are kept as a back-compat fallback
-- (used by anything that hasn't been migrated to pickFraming yet) and are
-- backfilled into all three buckets so existing slots look identical after
-- the migration.

alter table public.slots
  add column if not exists framings jsonb not null default jsonb_build_object(
    'portrait',  jsonb_build_object('pan_x', 0.5, 'pan_y', 0.5, 'zoom', 1.0),
    'square',    jsonb_build_object('pan_x', 0.5, 'pan_y', 0.5, 'zoom', 1.0),
    'landscape', jsonb_build_object('pan_x', 0.5, 'pan_y', 0.5, 'zoom', 1.0)
  );

alter table public.slot_history
  add column if not exists framings jsonb;

-- Backfill existing rows: copy the legacy pan_x/pan_y/zoom into all three
-- buckets so nothing visually changes when the renderer starts consulting
-- framings. Only touches rows that still hold the default ({}, no buckets).
update public.slots
   set framings = jsonb_build_object(
       'portrait',  jsonb_build_object('pan_x', pan_x, 'pan_y', pan_y, 'zoom', zoom),
       'square',    jsonb_build_object('pan_x', pan_x, 'pan_y', pan_y, 'zoom', zoom),
       'landscape', jsonb_build_object('pan_x', pan_x, 'pan_y', pan_y, 'zoom', zoom)
     )
 where framings is null
    or not (framings ? 'portrait' and framings ? 'square' and framings ? 'landscape');

-- slot_history is informational; backfill in the same shape so any consumer
-- that looks at historical framings sees consistent data.
update public.slot_history sh
   set framings = jsonb_build_object(
       'portrait',  jsonb_build_object('pan_x', 0.5, 'pan_y', 0.5, 'zoom', 1.0),
       'square',    jsonb_build_object('pan_x', 0.5, 'pan_y', 0.5, 'zoom', 1.0),
       'landscape', jsonb_build_object('pan_x', 0.5, 'pan_y', 0.5, 'zoom', 1.0)
     )
 where framings is null;

comment on column public.slots.framings is
  'Per-aspect framings: { portrait, square, landscape } each { pan_x, pan_y, zoom }. Renderer picks bucket from rendered slot aspect. Falls back to top-level pan_x/pan_y/zoom if a bucket is missing.';
