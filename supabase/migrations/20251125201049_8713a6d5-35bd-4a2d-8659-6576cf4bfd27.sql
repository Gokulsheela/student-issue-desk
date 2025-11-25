-- Add RLS policy to allow admins to delete complaints
CREATE POLICY "Admins can delete all complaints"
ON public.complaints
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));