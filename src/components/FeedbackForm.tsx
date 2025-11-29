import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FeedbackFormProps {
  complaintId: string;
  onFeedbackSubmitted?: () => void;
}

export const FeedbackForm = ({ complaintId, onFeedbackSubmitted }: FeedbackFormProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Rating required',
        description: 'Please select a rating before submitting.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'You must be logged in to submit feedback.',
        variant: 'destructive'
      });
      setSubmitting(false);
      return;
    }

    const feedbackData = {
      complaint_id: complaintId,
      student_id: user.id,
      rating,
      feedback_text: feedbackText.trim() || null
    };

    // Check if feedback already exists (backend safeguard)
    const { data: existingFeedback } = await supabase
      .from('complaint_feedback')
      .select('id')
      .eq('complaint_id', complaintId)
      .maybeSingle();

    if (existingFeedback) {
      toast({
        title: 'Feedback already submitted',
        description: 'You have already submitted feedback for this complaint.',
        variant: 'destructive'
      });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('complaint_feedback')
      .insert(feedbackData);

    if (error) {
      toast({
        title: 'Submission failed',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Thank you for your feedback!',
        description: 'Your feedback helps us improve our support services.'
      });
      onFeedbackSubmitted?.();
    }

    setSubmitting(false);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          How was your experience?
        </CardTitle>
        <CardDescription>
          Your feedback helps us improve our support services and better assist students in the future.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div>
          <label className="text-sm font-medium mb-2 block">Rate your experience</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-500 text-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {rating === 0 && 'Click to rate'}
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        </div>

        {/* Feedback Text */}
        <div>
          <label className="text-sm font-medium mb-2 block">Additional comments (optional)</label>
          <Textarea
            placeholder="Tell us more about your experience..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={4}
            maxLength={1000}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {feedbackText.length}/1000 characters
          </p>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={submitting || rating === 0}
          className="w-full"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
};
