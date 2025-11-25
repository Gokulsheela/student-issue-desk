import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LogOut, MessageSquare, Filter, Trash2 } from 'lucide-react';
import adminIcon from '@/assets/admin-icon.jpg';
import emptyState from '@/assets/empty-state.jpg';

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  student_id: string;
  profiles: { name: string; email: string };
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, loading, isAdmin } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth?type=admin');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchComplaints();
    }
  }, [user, isAdmin]);

  useEffect(() => {
    filterComplaints();
  }, [complaints, statusFilter, categoryFilter]);

  const fetchComplaints = async () => {
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching complaints:', error);
      setLoadingComplaints(false);
      return;
    }

    if (data) {
      // Fetch profiles separately for each complaint
      const complaintsWithProfiles = await Promise.all(
        data.map(async (complaint) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', complaint.student_id)
            .single();
          
          return {
            ...complaint,
            profiles: profile || { name: 'Unknown', email: 'N/A' }
          };
        })
      );
      setComplaints(complaintsWithProfiles as any);
    }
    setLoadingComplaints(false);
  };

  const filterComplaints = () => {
    let filtered = [...complaints];
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(c => c.category === categoryFilter);
    }
    
    setFilteredComplaints(filtered);
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

  const handleClearResolvedComplaints = async () => {
    const resolvedComplaintIds = complaints
      .filter(c => c.status === 'resolved')
      .map(c => c.id);

    if (resolvedComplaintIds.length === 0) {
      toast({
        title: 'No resolved complaints',
        description: 'There are no resolved complaints to clear.',
        variant: 'destructive'
      });
      return;
    }

    const { error } = await supabase
      .from('complaints')
      .delete()
      .in('id', resolvedComplaintIds);

    if (error) {
      toast({
        title: 'Error clearing complaints',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Success',
      description: `Cleared ${resolvedComplaintIds.length} resolved complaint(s).`
    });

    fetchComplaints();
  };

  if (loading || loadingComplaints) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={adminIcon} alt="Admin Dashboard" className="w-10 h-10 rounded" />
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-foreground">All Complaints</h2>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={complaints.filter(c => c.status === 'resolved').length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Clear Resolved</span>
                  <span className="sm:hidden">Clear</span>
                  {complaints.filter(c => c.status === 'resolved').length > 0 && (
                    <span className="ml-1">({complaints.filter(c => c.status === 'resolved').length})</span>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear Resolved Complaints?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {complaints.filter(c => c.status === 'resolved').length} complaint(s) marked as "resolved". 
                    This action cannot be undone. Active and unresolved complaints will not be affected.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearResolvedComplaints}>
                    Clear Resolved
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="facilities">Facilities</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="administration">Administration</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="technology">Technology</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredComplaints.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <img src={emptyState} alt="No complaints" className="w-32 h-32 mb-4" />
              <p className="text-muted-foreground text-center">
                No complaints found matching the selected filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredComplaints.map((complaint) => (
              <Card key={complaint.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="mb-2">{complaint.title}</CardTitle>
                      <div className="mb-2">
                        <span className="text-sm text-muted-foreground">
                          Submitted by: <span className="font-medium text-foreground">{complaint.profiles?.name}</span>
                        </span>
                      </div>
                      <CardDescription>
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

export default AdminDashboard;
