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
  existingFeedback?: {
    rating: number;
    feedback_text: string | null;
  };
}

export const FeedbackForm = ({ complaintId, onFeedbackSubmitted, existingFeedback }: FeedbackFormProps) => {
  const [rating, setRating] = useState(existingFeedback?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState(existingFeedback?.feedback_text || '');
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

    const { error } = existingFeedback
      ? await supabase
          .from('complaint_feedback')
          .update({ rating, feedback_text: feedbackText.trim() || null })
          .eq('complaint_id', complaintId)
      : await supabase
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
        title: existingFeedback ? 'Feedback updated' : 'Thank you for your feedback!',
        description: existingFeedback 
          ? 'Your feedback has been updated successfully.'
          : 'Your feedback helps us improve our support services.'
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
          {existingFeedback ? 'Update Your Feedback' : 'How was your experience?'}
        </CardTitle>
        <CardDescription>
          {existingFeedback 
            ? 'You can update your feedback within 7 days of submission.'
            : 'Your feedback helps us improve our support services and better assist students in the future.'}
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
          {submitting ? 'Submitting...' : existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
        </Button>
      </CardContent>
    </Card>
  );
};
