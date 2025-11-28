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

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  image_urls: string[];
  student_id: string;
  profiles: { name: string; email: string };
}

const ComplaintDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    if (id) {
      fetchComplaint();
    }
  }, [id]);

  const fetchComplaint = async () => {
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
    }
    setLoading(false);
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
        <div className="container mx-auto px-4 py-4">
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
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column - Complaint Details (65-70%) */}
            <div className="flex-1 lg:w-[65%] space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-2xl">{complaint.title}</CardTitle>
                      <CardDescription className="mt-2">
                        Submitted by {complaint.profiles?.name} ({complaint.profiles?.email})
                      </CardDescription>
                      <CardDescription>
                        Category: {complaint.category} • 
                        Created: {new Date(complaint.created_at).toLocaleString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(complaint.status)}>
                      {complaint.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{complaint.description}</p>
                  </div>

                  {complaint.image_urls && complaint.image_urls.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Attached Images</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {complaint.image_urls.map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Complaint image ${index + 1}`}
                            className="rounded-lg w-full h-48 object-cover"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {complaint.resolution_notes && (
                    <div>
                      <h3 className="font-semibold mb-2">Resolution Notes</h3>
                      <p className="text-muted-foreground whitespace-pre-wrap">{complaint.resolution_notes}</p>
                    </div>
                  )}

                  <Button 
                    onClick={() => navigate(`/chat/${complaint.id}`)}
                    className="w-full"
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Chat
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Update Section (30-35%) */}
            {isAdmin && (
              <div className="lg:w-[35%]">
                <Card className="sticky top-6">
                  <CardHeader>
                    <CardTitle>Update Complaint</CardTitle>
                    <CardDescription>Change the status and add resolution notes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Resolution Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Add notes about the resolution..."
                        rows={6}
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                      />
                    </div>

                    <Button onClick={handleUpdate} disabled={updating} className="w-full">
                      {updating ? 'Updating...' : 'Update Complaint'}
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
