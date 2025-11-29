import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { FeedbackForm } from '@/components/FeedbackForm';

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  resolution_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  image_urls: string[];
  student_id: string;
  profiles: { name: string; email: string };
}

interface Feedback {
  rating: number;
  feedback_text: string | null;
  created_at: string;
}

interface SimilarComplaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  student_name: string;
  similarity_score: number;
  similarity_reason: string;
}

const ComplaintDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [status, setStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [similarComplaints, setSimilarComplaints] = useState<SimilarComplaint[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchComplaint();
      if (isAdmin) {
        fetchSimilarComplaints();
      }
    }
  }, [id, user, isAdmin]);

  const fetchComplaint = async () => {
    // Reset feedback state at the start
    setFeedback(null);
    
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', id)
      .single();

    if (!error && data) {
      // Fetch profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', data.student_id)
        .single();
      
      const complaintWithProfile = {
        ...data,
        profiles: profile || { name: 'Unknown', email: '' }
      };
      
      setComplaint(complaintWithProfile as any);
      setStatus(data.status);
      setResolutionNotes(data.resolution_notes || '');
      setAdminNotes(data.admin_notes || '');
      
      // Fetch feedback if complaint is resolved and user is the student
      if (data.status === 'resolved' && user?.id === data.student_id) {
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('complaint_feedback')
          .select('rating, feedback_text, created_at')
          .eq('complaint_id', id)
          .maybeSingle();
        
        // Set feedback if it exists, otherwise leave as null
        if (feedbackData) {
          console.log('Feedback found:', feedbackData);
          setFeedback(feedbackData);
        } else {
          console.log('No feedback found for complaint:', id);
          setFeedback(null);
        }
        
        if (feedbackError) {
          console.error('Error fetching feedback:', feedbackError);
        }
      }
    }
    setLoading(false);
  };

  const fetchSimilarComplaints = async () => {
    setLoadingSimilar(true);
    try {
      const { data, error } = await supabase.functions.invoke('find-similar-complaints', {
        body: { complaintId: id }
      });

      if (error) {
        console.error('Error fetching similar complaints:', error);
        toast({
          title: 'Failed to analyze similar complaints',
          description: error.message,
          variant: 'destructive'
        });
      } else if (data?.similar_complaints) {
        console.log('Similar complaints found:', data.similar_complaints);
        setSimilarComplaints(data.similar_complaints);
      }
    } catch (error) {
      console.error('Error in fetchSimilarComplaints:', error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleUpdate = async () => {
    setUpdating(true);
    
    const { error } = await supabase
      .from('complaints')
      .update({
        status,
        resolution_notes: resolutionNotes
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Complaint updated',
        description: 'The complaint has been updated successfully'
      });
      fetchComplaint();
    }
    
    setUpdating(false);
  };

  const handleSaveAdminNotes = async () => {
    setSavingNotes(true);
    
    const { error } = await supabase
      .from('complaints')
      .update({
        admin_notes: adminNotes
      })
      .eq('id', id);

    if (error) {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Notes saved',
        description: 'Admin notes saved successfully'
      });
      fetchComplaint();
    }
    
    setSavingNotes(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'in-progress': return 'bg-blue-500';
      case 'resolved': return 'bg-green-500';
      case 'closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>;
  }

  if (!complaint) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Complaint not found</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-3">
          <Button 
            variant="ghost" 
            onClick={() => navigate(isAdmin ? '/admin-dashboard' : '/student-dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-3 mt-4">
            {/* Left Column - Complaint Details (65-70%) */}
            <div className="flex-1 lg:w-[65%]">
              <Card>
                <CardHeader className="pb-4 pt-6">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-xl mb-1">{complaint.title}</CardTitle>
                      <CardDescription className="text-sm">
                        Submitted by {complaint.profiles?.name} ({complaint.profiles?.email})
                      </CardDescription>
                      <CardDescription className="text-xs mt-0.5">
                        Category: {complaint.category} • 
                        Created: {new Date(complaint.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(complaint.status)}>
                      {complaint.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className={!complaint.image_urls?.length ? "bg-muted/30 rounded-md p-4" : ""}>
                    <h3 className="font-semibold text-sm mb-1.5">Description</h3>
                    <p className={`text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed ${!complaint.image_urls?.length ? "min-h-[200px]" : ""}`}>
                      {complaint.description}
                    </p>
                  </div>

                  {complaint.image_urls && complaint.image_urls.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-sm mb-1.5">Attached Images</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {complaint.image_urls.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Complaint image ${index + 1}`}
                            className="rounded-md w-full h-36 object-cover border"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {complaint.resolution_notes && (
                    <div className="bg-muted/30 rounded-md p-3">
                      <h3 className="font-semibold text-sm mb-1.5">Resolution Notes</h3>
                      <p className="text-muted-foreground text-sm whitespace-pre-wrap leading-relaxed">{complaint.resolution_notes}</p>
                    </div>
                  )}

                  <Button 
                    onClick={() => navigate(`/chat/${complaint.id}`)}
                    className="w-full h-9"
                    size="sm"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Chat
                  </Button>
                </CardContent>
              </Card>

              {/* Feedback Display or Form for Students - Only show for resolved complaints */}
              {!isAdmin && complaint.status === 'resolved' && (
                <div className="mt-3">
                  {feedback !== null ? (
                    <Card className="border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MessageSquare className="h-5 w-5 text-primary" />
                          Your Submitted Feedback
                        </CardTitle>
                        <CardDescription>
                          Submitted on {new Date(feedback.created_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Your Rating</label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star}>
                                <svg
                                  className={`h-8 w-8 ${
                                    star <= feedback.rating
                                      ? 'fill-yellow-500 text-yellow-500'
                                      : 'text-gray-300'
                                  }`}
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </span>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {feedback.rating === 1 && 'Poor'}
                            {feedback.rating === 2 && 'Fair'}
                            {feedback.rating === 3 && 'Good'}
                            {feedback.rating === 4 && 'Very Good'}
                            {feedback.rating === 5 && 'Excellent'}
                          </p>
                        </div>
                        {feedback.feedback_text && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Your Comments</label>
                            <div className="bg-muted/30 rounded-md p-3">
                              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {feedback.feedback_text}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <FeedbackForm 
                      complaintId={complaint.id}
                      onFeedbackSubmitted={() => {
                        fetchComplaint();
                      }}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Update Section & AI Similar Complaints (30-35%) */}
            {isAdmin && (
              <div className="lg:w-[35%] space-y-3">
                {/* AI Similar Complaints Section */}
                <Card className="w-full border-primary/20">
                  <CardHeader className="pb-3 pt-6">
                    <CardTitle className="text-base flex items-center gap-2">
                      <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Detected Similar Complaints
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Automatically detected using semantic analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {loadingSimilar ? (
                      <div className="text-center py-6">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
                        <p className="text-xs text-muted-foreground mt-2">Analyzing complaints...</p>
                      </div>
                    ) : similarComplaints.length === 0 ? (
                      <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">No similar complaints detected</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {similarComplaints.map((similar) => (
                          <Card 
                            key={similar.id} 
                            className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => navigate(`/complaint/${similar.id}`)}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-sm font-semibold line-clamp-1">{similar.title}</h4>
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs shrink-0"
                                >
                                  {Math.round(similar.similarity_score * 100)}%
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {similar.description}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                                <Badge variant="outline" className="text-xs">
                                  {similar.category}
                                </Badge>
                                <span>•</span>
                                <span>{similar.student_name}</span>
                                <span>•</span>
                                <Badge className={getStatusColor(similar.status) + " text-xs"}>
                                  {similar.status}
                                </Badge>
                              </div>
                              {similar.similarity_reason && (
                                <p className="text-xs italic text-muted-foreground/80 pt-1">
                                  "{similar.similarity_reason}"
                                </p>
                              )}
                            </div>
                          </Card>
                        ))}
                        {similarComplaints.length > 0 && (
                          <div className="pt-2">
                            <Badge variant="destructive" className="text-xs">
                              ⚠️ {similarComplaints.length} Recurring Issue{similarComplaints.length > 1 ? 's' : ''} Detected
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="w-full">
                  <CardHeader className="pb-3 pt-6">
                    <CardTitle className="text-base">Update Complaint</CardTitle>
                    <CardDescription className="text-xs">Change status and add notes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-0">
                    <div className="space-y-1">
                      <Label htmlFor="status" className="text-xs">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="notes" className="text-xs">Resolution Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add notes about the resolution..."
                        rows={4}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        className="text-xs resize-none min-h-[80px]"
                      />
                    </div>

                    <Button onClick={handleUpdate} disabled={updating} className="w-full h-8" size="sm">
                      {updating ? 'Updating...' : 'Update Complaint'}
                    </Button>
                  </CardContent>
                </Card>

                {/* Admin Notepad */}
                <Card className="w-full">
                  <CardHeader className="pb-3 pt-4">
                    <CardTitle className="text-base">Admin Notepad</CardTitle>
                    <CardDescription className="text-xs">Private notes (not visible to students)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-0">
                    <Textarea
                      placeholder="Add private admin notes here..."
                      rows={6}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="text-xs resize-none min-h-[120px]"
                    />
                    <Button onClick={handleSaveAdminNotes} disabled={savingNotes} className="w-full h-8" size="sm" variant="secondary">
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComplaintDetails;
