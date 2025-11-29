-- Add resolved_at timestamp to track when complaints are resolved
ALTER TABLE public.complaints 
ADD COLUMN resolved_at TIMESTAMP WITH TIME ZONE;

-- Create an index on resolved_at for faster queries
CREATE INDEX idx_complaints_resolved_at ON public.complaints(resolved_at);

-- Create an index on created_at for faster time-based queries
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at);

-- Create an index on status for faster filtering
CREATE INDEX idx_complaints_status ON public.complaints(status);

-- Create a trigger to automatically set resolved_at when status changes to 'resolved'
CREATE OR REPLACE FUNCTION update_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
    NEW.resolved_at = now();
  ELSIF NEW.status != 'resolved' AND OLD.status = 'resolved' THEN
    NEW.resolved_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_resolved_at
BEFORE UPDATE ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION update_resolved_at();