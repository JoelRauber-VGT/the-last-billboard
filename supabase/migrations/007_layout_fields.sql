-- Migration: Add layout and positioning fields to slots table
-- Adds support for custom layout dimensions and pan/zoom positioning

-- Add new columns to slots table
ALTER TABLE public.slots
  ADD COLUMN layout_width integer,
  ADD COLUMN layout_height integer,
  ADD COLUMN pan_x real DEFAULT 0.5,
  ADD COLUMN pan_y real DEFAULT 0.5,
  ADD COLUMN zoom real DEFAULT 1.0;

-- Add check constraints
ALTER TABLE public.slots
  ADD CONSTRAINT pan_x_range CHECK (pan_x >= 0.0 AND pan_x <= 1.0),
  ADD CONSTRAINT pan_y_range CHECK (pan_y >= 0.0 AND pan_y <= 1.0),
  ADD CONSTRAINT zoom_range CHECK (zoom >= 1.0 AND zoom <= 3.0),
  ADD CONSTRAINT layout_positive CHECK (layout_width > 0 AND layout_height > 0);

-- Add comment for documentation
COMMENT ON COLUMN public.slots.layout_width IS 'Width of the chosen layout in pixels';
COMMENT ON COLUMN public.slots.layout_height IS 'Height of the chosen layout in pixels';
COMMENT ON COLUMN public.slots.pan_x IS 'Horizontal image position (0.0-1.0, 0.5 = centered)';
COMMENT ON COLUMN public.slots.pan_y IS 'Vertical image position (0.0-1.0, 0.5 = centered)';
COMMENT ON COLUMN public.slots.zoom IS 'Zoom factor for the image (1.0-3.0, 1.0 = cover minimum)';

-- Migrate existing slots with default values
-- For existing slots without layout dimensions, calculate best fit based on current_bid_eur
-- Assuming 1 EUR = 1 pixel (this can be adjusted based on actual rate)
UPDATE public.slots
SET
  layout_width = CASE
    -- Try to find a layout close to 16:9 (most common image ratio)
    WHEN current_bid_eur >= 20 THEN GREATEST(1, FLOOR(SQRT(current_bid_eur * 16.0 / 9.0)))
    WHEN current_bid_eur >= 10 THEN GREATEST(1, FLOOR(SQRT(current_bid_eur * 2.0)))
    ELSE GREATEST(1, current_bid_eur)
  END,
  layout_height = CASE
    WHEN current_bid_eur >= 20 THEN GREATEST(1, FLOOR(current_bid_eur / FLOOR(SQRT(current_bid_eur * 16.0 / 9.0))))
    WHEN current_bid_eur >= 10 THEN GREATEST(1, FLOOR(current_bid_eur / FLOOR(SQRT(current_bid_eur * 2.0))))
    ELSE 1
  END,
  pan_x = 0.5,
  pan_y = 0.5,
  zoom = 1.0
WHERE layout_width IS NULL OR layout_height IS NULL;

-- Make layout fields required for future inserts
ALTER TABLE public.slots
  ALTER COLUMN layout_width SET NOT NULL,
  ALTER COLUMN layout_height SET NOT NULL;
