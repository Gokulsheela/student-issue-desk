import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { LogOut, MessageSquare, Filter, Trash2, BarChart3 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
  is_duplicate: boolean;
  duplicate_of: string | null;
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
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <img src={adminIcon} alt="Admin Dashboard" className="w-8 h-8 md:w-10 md:h-10 rounded flex-shrink-0" />
            <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin-analytics')} className="h-8 md:h-9">
              <BarChart3 className="h-3.5 w-3.5 md:mr-2 md:h-4 md:w-4" />
              <span className="hidden md:inline">Analytics</span>
            </Button>
            <Button variant="outline" size="sm" onClick={signOut} className="h-8 md:h-9">
              <LogOut className="h-3.5 w-3.5 md:mr-2 md:h-4 md:w-4" />
              <span className="hidden md:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <h2 className="text-lg md:text-xl font-semibold text-foreground">All Complaints</h2>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={complaints.filter(c => c.status === 'resolved').length === 0}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear Resolved
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
          
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
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
              <SelectTrigger className="w-full md:w-[180px]">
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
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {filteredComplaints.map((complaint) => (
                <Card 
                  key={complaint.id}
                  className="cursor-pointer hover:shadow-md transition-shadow border-border"
                  onClick={() => navigate(`/complaint/${complaint.id}`)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">#{complaint.id.slice(0, 8)}</span>
                          <Badge className={`${getStatusColor(complaint.status)} text-xs`}>
                            {complaint.status}
                          </Badge>
                        </div>
                        <p className="font-semibold text-sm leading-tight">{complaint.profiles?.name}</p>
                      </div>
                      <Button 
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/chat/${complaint.id}`);
                        }}
                        className="h-8 w-8 p-0 flex-shrink-0"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium text-foreground line-clamp-2 leading-relaxed">
                        {complaint.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{complaint.category}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>

                    {complaint.is_duplicate && (
                      <Badge 
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-muted w-fit"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (complaint.duplicate_of) {
                            navigate(`/complaint/${complaint.duplicate_of}`);
                          }
                        }}
                      >
                        Duplicate of #{complaint.duplicate_of?.slice(0, 8)}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-card rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComplaints.map((complaint) => (
                      <TableRow 
                        key={complaint.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/complaint/${complaint.id}`)}
                      >
                        <TableCell className="font-mono text-xs">
                          {complaint.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {complaint.profiles?.name}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {complaint.title}
                        </TableCell>
                        <TableCell className="capitalize">
                          {complaint.category}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(complaint.status)}>
                              {complaint.status}
                            </Badge>
                            {complaint.is_duplicate && (
                              <Badge 
                                variant="outline" 
                                className="text-xs cursor-pointer hover:bg-muted"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (complaint.duplicate_of) {
                                    navigate(`/complaint/${complaint.duplicate_of}`);
                                  }
                                }}
                              >
                                Duplicate of #{complaint.duplicate_of?.slice(0, 8)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/chat/${complaint.id}`);
                            }}
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
