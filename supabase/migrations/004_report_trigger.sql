-- Function to check slot reports and auto-hide when threshold reached
CREATE OR REPLACE FUNCTION check_slot_reports()
RETURNS TRIGGER AS $$
DECLARE
  report_count INT;
BEGIN
  -- Count open reports for this slot
  SELECT COUNT(*) INTO report_count
  FROM public.reports
  WHERE slot_id = NEW.slot_id
    AND status = 'open';

  -- If >= 3 reports, set slot status to removed
  IF report_count >= 3 THEN
    UPDATE public.slots
    SET status = 'removed',
        updated_at = now()
    WHERE id = NEW.slot_id
      AND status != 'removed'; -- Only update if not already removed
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger after report insert
CREATE TRIGGER after_report_insert
AFTER INSERT ON public.reports
FOR EACH ROW
EXECUTE FUNCTION check_slot_reports();

-- Add index for better performance on report count queries
CREATE INDEX IF NOT EXISTS idx_reports_slot_status ON public.reports(slot_id, status);

-- Add comment for documentation
COMMENT ON FUNCTION check_slot_reports() IS 'Automatically sets slot status to removed when 3 or more open reports exist';
COMMENT ON TRIGGER after_report_insert ON public.reports IS 'Triggers automatic slot removal when report threshold is reached';
