import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, LogOut, MessageSquare, Trash2 } from 'lucide-react';
import complaintsIcon from '@/assets/complaints-icon.jpg';
import emptyState from '@/assets/empty-state.jpg';
import EmergencyCallButton from '@/components/EmergencyCallButton';
import { useToast } from '@/hooks/use-toast';
interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  image_urls: string[];
  resolution_notes: string | null;
}
const StudentDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    user,
    signOut,
    loading
  } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth?type=student');
    }
  }, [user, loading, navigate]);
  useEffect(() => {
    if (user) {
      fetchComplaints();
    }
  }, [user]);
  const fetchComplaints = async () => {
    const {
      data,
      error
    } = await supabase.from('complaints').select('*').eq('student_id', user?.id).order('created_at', {
      ascending: false
    });
    if (!error && data) {
      setComplaints(data);
    }
    setLoadingComplaints(false);
  };
  const handleDelete = async (complaintId: string) => {
    if (!confirm('Are you sure you want to delete this complaint?')) {
      return;
    }

    const { error } = await supabase
      .from('complaints')
      .delete()
      .eq('id', complaintId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete complaint',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Complaint deleted successfully',
      });
      fetchComplaints();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };
  if (loading || loadingComplaints) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>;
  }
  return <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <img src={complaintsIcon} alt="Complaints" className="w-8 h-8 rounded md:w-10 md:h-10" />
            <h1 className="text-xl font-bold text-foreground md:text-2xl">My Complaints</h1>
          </div>
          <div className="flex items-center gap-2">
            <EmergencyCallButton />
            <Button variant="outline" size="sm" onClick={signOut} className="hidden md:flex">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
            <Button variant="outline" size="sm" onClick={signOut} className="md:hidden">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Floating Emergency Call Button (Mobile Only) */}
      <EmergencyCallButton floating />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-foreground md:text-xl">Your Complaints</h2>
          <Button size="sm" onClick={() => navigate('/submit-complaint')}>
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">New Complaint</span>
          </Button>
        </div>

        {complaints.length === 0 ? <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <img src={emptyState} alt="No complaints" className="w-32 h-32 mb-4" />
              <p className="text-muted-foreground text-center mb-4">
                You haven't submitted any complaints yet
              </p>
              <Button onClick={() => navigate('/submit-complaint')}>
                Submit Your First Complaint
              </Button>
            </CardContent>
          </Card> : <div className="grid gap-3 md:gap-4">
            {complaints.map(complaint => <Card key={complaint.id} className="hover:shadow-md transition-shadow border-border shadow-sm">
                <CardHeader className="pb-3 pt-4 px-4 space-y-1">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold leading-tight mb-1">
                        {complaint.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        {complaint.category} • {new Date(complaint.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={`${getStatusColor(complaint.status)} text-xs px-2 py-0.5 shrink-0`}>
                      {complaint.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {complaint.description}
                  </p>
                  
                  {complaint.resolution_notes && (
                    <div className="p-2.5 bg-muted/50 border-l-4 border-primary rounded-r">
                      <p className="text-xs font-semibold text-primary mb-1">Admin Resolution</p>
                      <p className="text-xs text-foreground leading-relaxed">{complaint.resolution_notes}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-1 justify-between">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate(`/complaint/${complaint.id}`)} className="h-8 text-xs px-3">
                        View
                      </Button>
                      <Button size="sm" onClick={() => navigate(`/chat/${complaint.id}`)} className="h-8 text-xs px-3">
                        <MessageSquare className="h-3.5 w-3.5 md:mr-1.5" />
                        <span className="hidden md:inline">Chat</span>
                      </Button>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(complaint.id)} className="h-8 w-8 p-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>)}
          </div>}
      </main>
    </div>;
};
export default StudentDashboard;