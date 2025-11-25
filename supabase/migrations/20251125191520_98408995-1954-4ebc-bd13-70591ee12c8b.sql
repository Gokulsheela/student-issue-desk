-- Fix function search_path for update_updated_at_column
-- This prevents potential security issues by ensuring the function
-- always uses the public schema regardless of caller's search_path

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;