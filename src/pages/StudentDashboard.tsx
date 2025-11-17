import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, LogOut, MessageSquare } from 'lucide-react';
import complaintsIcon from '@/assets/complaints-icon.jpg';
import emptyState from '@/assets/empty-state.jpg';
import emergencyCallIcon from '@/assets/emergency-call-icon.png';

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  image_urls: string[];
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
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
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .eq('student_id', user?.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComplaints(data);
    }
    setLoadingComplaints(false);
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

  if (loading || loadingComplaints) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={complaintsIcon} alt="Complaints" className="w-10 h-10 rounded" />
            <h1 className="text-2xl font-bold text-foreground">My Complaints</h1>
          </div>
          <div className="flex items-center gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon"
                    className="bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-10 w-10"
                    onClick={() => window.location.href = 'tel:emergency'}
                  >
                    <img src={emergencyCallIcon} alt="Emergency Call" className="h-6 w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Emergency Call</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground">Your Complaints</h2>
          <Button onClick={() => navigate('/submit-complaint')}>
            <Plus className="mr-2 h-4 w-4" />
            New Complaint
          </Button>
        </div>

        {complaints.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <img src={emptyState} alt="No complaints" className="w-32 h-32 mb-4" />
              <p className="text-muted-foreground text-center mb-4">
                You haven't submitted any complaints yet
              </p>
              <Button onClick={() => navigate('/submit-complaint')}>
                Submit Your First Complaint
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {complaints.map((complaint) => (
              <Card key={complaint.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{complaint.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {complaint.category} • {new Date(complaint.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(complaint.status)}>
                      {complaint.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 line-clamp-2">
                    {complaint.description}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/complaint/${complaint.id}`)}
                    >
                      View Details
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => navigate(`/chat/${complaint.id}`)}
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
