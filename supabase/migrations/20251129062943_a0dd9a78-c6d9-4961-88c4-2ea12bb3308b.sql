-- Add duplicate tracking fields to complaints table
ALTER TABLE public.complaints 
ADD COLUMN is_duplicate BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN duplicate_of UUID REFERENCES public.complaints(id) ON DELETE SET NULL;

-- Create index for faster queries on duplicate relationships
CREATE INDEX idx_complaints_duplicate_of ON public.complaints(duplicate_of) WHERE duplicate_of IS NOT NULL;

-- Add constraint to prevent self-referencing duplicates
ALTER TABLE public.complaints 
ADD CONSTRAINT check_not_self_duplicate CHECK (id != duplicate_of OR duplicate_of IS NULL);

-- Create function to prevent circular duplicate references
CREATE OR REPLACE FUNCTION public.check_circular_duplicate()
RETURNS TRIGGER AS $$
DECLARE
  original_id UUID;
  current_id UUID;
  max_depth INT := 10;
  depth INT := 0;
BEGIN
  IF NEW.duplicate_of IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Start checking from the duplicate_of complaint
  current_id := NEW.duplicate_of;
  
  WHILE current_id IS NOT NULL AND depth < max_depth LOOP
    -- Check if we've circled back to the original complaint
    IF current_id = NEW.id THEN
      RAISE EXCEPTION 'Circular duplicate reference detected';
    END IF;
    
    -- Get the next level
    SELECT duplicate_of INTO original_id 
    FROM public.complaints 
    WHERE id = current_id;
    
    current_id := original_id;
    depth := depth + 1;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to check for circular duplicates
CREATE TRIGGER check_circular_duplicate_trigger
BEFORE INSERT OR UPDATE OF duplicate_of ON public.complaints
FOR EACH ROW
EXECUTE FUNCTION public.check_circular_duplicate();