-- Allow students to delete their own complaints
CREATE POLICY "Students can delete their own complaints"
ON public.complaints
FOR DELETE
USING (auth.uid() = student_id);