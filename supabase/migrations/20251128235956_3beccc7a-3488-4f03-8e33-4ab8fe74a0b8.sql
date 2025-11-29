-- Add admin_notes column to complaints table for private admin notes
ALTER TABLE public.complaints
ADD COLUMN admin_notes TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN public.complaints.admin_notes IS 'Private notes for admins only, not visible to students';