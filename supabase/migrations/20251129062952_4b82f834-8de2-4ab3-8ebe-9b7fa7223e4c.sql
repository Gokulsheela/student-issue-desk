-- Fix search_path for check_circular_duplicate function
CREATE OR REPLACE FUNCTION public.check_circular_duplicate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;