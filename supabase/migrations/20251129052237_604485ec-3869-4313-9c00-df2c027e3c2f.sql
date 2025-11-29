-- Create complaint_feedback table to store student feedback
CREATE TABLE public.complaint_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(complaint_id)
);

-- Create index for faster queries
CREATE INDEX idx_complaint_feedback_complaint_id ON public.complaint_feedback(complaint_id);
CREATE INDEX idx_complaint_feedback_student_id ON public.complaint_feedback(student_id);
CREATE INDEX idx_complaint_feedback_rating ON public.complaint_feedback(rating);

-- Enable RLS
ALTER TABLE public.complaint_feedback ENABLE ROW LEVEL SECURITY;

-- Students can view their own feedback
CREATE POLICY "Students can view their own feedback"
ON public.complaint_feedback
FOR SELECT
USING (auth.uid() = student_id);

-- Students can create feedback for their own complaints
CREATE POLICY "Students can create feedback for their complaints"
ON public.complaint_feedback
FOR INSERT
WITH CHECK (
  auth.uid() = student_id AND
  EXISTS (
    SELECT 1 FROM public.complaints
    WHERE id = complaint_id 
    AND student_id = auth.uid()
    AND status = 'resolved'
  )
);

-- Students can update their own feedback within 7 days
CREATE POLICY "Students can update their own feedback"
ON public.complaint_feedback
FOR UPDATE
USING (
  auth.uid() = student_id AND
  created_at > now() - interval '7 days'
);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.complaint_feedback
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));