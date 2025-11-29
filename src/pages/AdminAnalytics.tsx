import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Download, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { formatDistanceToNow, differenceInDays, subDays, format } from 'date-fns';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  student_id: string;
  profiles?: { name: string; email: string };
}

interface CategoryStats {
  category: string;
  count: number;
  percentage: number;
}

interface BacklogStats {
  over7Days: number;
  over14Days: number;
  over30Days: number;
}

interface Insight {
  type: 'warning' | 'info' | 'success';
  message: string;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const AdminAnalytics = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [timeframe, setTimeframe] = useState<'7' | '30' | '90'>('30');

  // Metrics
  const [totalTickets, setTotalTickets] = useState(0);
  const [resolvedTickets, setResolvedTickets] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [avgResolutionTime, setAvgResolutionTime] = useState(0);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [backlogStats, setBacklogStats] = useState<BacklogStats>({ over7Days: 0, over14Days: 0, over30Days: 0 });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth?type=admin');
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchComplaintsData();
    }
  }, [user, isAdmin, timeframe]);

  const fetchComplaintsData = async () => {
    setLoadingData(true);
    
    // Calculate date cutoff based on timeframe
    const cutoffDate = subDays(new Date(), parseInt(timeframe));
    
    const { data, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching complaints:', error);
      toast({
        title: 'Error loading data',
        description: error.message,
        variant: 'destructive'
      });
      setLoadingData(false);
      return;
    }

    if (data) {
      // Fetch profiles for complaints
      const complaintsWithProfiles = await Promise.all(
        data.map(async (complaint) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', complaint.student_id)
            .maybeSingle();
          
          return {
            ...complaint,
            profiles: profile || { name: 'Unknown', email: 'N/A' }
          };
        })
      );

      setComplaints(complaintsWithProfiles as any);
      calculateMetrics(complaintsWithProfiles, cutoffDate);
    }
    
    setLoadingData(false);
  };

  const calculateMetrics = (data: Complaint[], cutoffDate: Date) => {
    // Filter by timeframe
    const filteredData = data.filter(c => new Date(c.created_at) >= cutoffDate);
    
    // Total tickets
    setTotalTickets(filteredData.length);
    
    // Resolved and open tickets
    const resolved = filteredData.filter(c => c.status === 'resolved');
    const open = filteredData.filter(c => c.status !== 'resolved' && c.status !== 'closed');
    setResolvedTickets(resolved.length);
    setOpenTickets(open.length);
    
    // Average resolution time
    const resolvedWithTime = resolved.filter(c => c.resolved_at);
    if (resolvedWithTime.length > 0) {
      const totalResolutionTime = resolvedWithTime.reduce((sum, c) => {
        const created = new Date(c.created_at);
        const resolved = new Date(c.resolved_at!);
        return sum + differenceInDays(resolved, created);
      }, 0);
      setAvgResolutionTime(Math.round((totalResolutionTime / resolvedWithTime.length) * 10) / 10);
    } else {
      setAvgResolutionTime(0);
    }
    
    // Category breakdown
    const categoryMap = new Map<string, number>();
    filteredData.forEach(c => {
      categoryMap.set(c.category, (categoryMap.get(c.category) || 0) + 1);
    });
    
    const categoryStatsData: CategoryStats[] = Array.from(categoryMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / filteredData.length) * 100)
      }))
      .sort((a, b) => b.count - a.count);
    
    setCategoryStats(categoryStatsData);
    
    // Backlog statistics
    const now = new Date();
    const over7 = open.filter(c => differenceInDays(now, new Date(c.created_at)) > 7).length;
    const over14 = open.filter(c => differenceInDays(now, new Date(c.created_at)) > 14).length;
    const over30 = open.filter(c => differenceInDays(now, new Date(c.created_at)) > 30).length;
    
    setBacklogStats({
      over7Days: over7,
      over14Days: over14,
      over30Days: over30
    });
    
    // Trend data (weekly breakdown)
    const weeks = Math.ceil(parseInt(timeframe) / 7);
    const trendDataArray = [];
    
    for (let i = weeks - 1; i >= 0; i--) {
      const weekStart = subDays(new Date(), (i + 1) * 7);
      const weekEnd = subDays(new Date(), i * 7);
      
      const weekTickets = data.filter(c => {
        const created = new Date(c.created_at);
        return created >= weekStart && created < weekEnd;
      });
      
      const weekOpen = weekTickets.filter(c => c.status !== 'resolved' && c.status !== 'closed').length;
      
      trendDataArray.push({
        week: format(weekStart, 'MMM d'),
        tickets: weekTickets.length,
        open: weekOpen,
        resolved: weekTickets.filter(c => c.status === 'resolved').length
      });
    }
    
    setTrendData(trendDataArray);
    
    // Generate insights
    generateInsights(categoryStatsData, filteredData, data, over30);
  };

  const generateInsights = (categoryData: CategoryStats[], filteredData: Complaint[], allData: Complaint[], criticalBacklog: number) => {
    const newInsights: Insight[] = [];
    
    // Most frequent category
    if (categoryData.length > 0 && categoryData[0].count > filteredData.length * 0.3) {
      newInsights.push({
        type: 'warning',
        message: `"${categoryData[0].category}" category represents ${categoryData[0].percentage}% of tickets. Consider creating FAQ or allocating more resources.`
      });
    }
    
    // Growing backlog
    if (criticalBacklog > 5) {
      newInsights.push({
        type: 'warning',
        message: `${criticalBacklog} tickets pending for over 30 days. Immediate attention needed to reduce backlog.`
      });
    }
    
    // High resolution rate
    const resolutionRate = (resolvedTickets / totalTickets) * 100;
    if (resolutionRate > 70) {
      newInsights.push({
        type: 'success',
        message: `Excellent resolution rate of ${Math.round(resolutionRate)}%! Team is performing well.`
      });
    } else if (resolutionRate < 30) {
      newInsights.push({
        type: 'warning',
        message: `Low resolution rate (${Math.round(resolutionRate)}%). Consider reviewing support processes.`
      });
    }
    
    // Average resolution time
    if (avgResolutionTime > 14) {
      newInsights.push({
        type: 'info',
        message: `Average resolution time is ${avgResolutionTime} days. Look for bottlenecks in resolution process.`
      });
    } else if (avgResolutionTime < 3 && avgResolutionTime > 0) {
      newInsights.push({
        type: 'success',
        message: `Excellent average resolution time of ${avgResolutionTime} days!`
      });
    }
    
    // Trend analysis
    if (trendData.length >= 2) {
      const recentWeek = trendData[trendData.length - 1].tickets;
      const previousWeek = trendData[trendData.length - 2].tickets;
      const growth = ((recentWeek - previousWeek) / previousWeek) * 100;
      
      if (growth > 20) {
        newInsights.push({
          type: 'warning',
          message: `Ticket volume increased by ${Math.round(growth)}% this week. Monitor for emerging issues.`
        });
      } else if (growth < -20) {
        newInsights.push({
          type: 'success',
          message: `Ticket volume decreased by ${Math.abs(Math.round(growth))}% this week. Great progress!`
        });
      }
    }
    
    setInsights(newInsights);
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Title', 'Category', 'Status', 'Submitted', 'Resolved', 'Student Name', 'Student Email'];
    const rows = complaints.map(c => [
      c.id,
      c.title,
      c.category,
      c.status,
      c.created_at,
      c.resolved_at || 'N/A',
      c.profiles?.name || 'Unknown',
      c.profiles?.email || 'N/A'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: 'Export successful',
      description: 'Analytics data has been exported to CSV.'
    });
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/admin-dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Select value={timeframe} onValueChange={(val: any) => setTimeframe(val)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Total Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">
                in last {timeframe} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Resolved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{resolvedTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0}% resolution rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Open Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{openTickets}</div>
              <p className="text-xs text-muted-foreground mt-1">
                currently pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                Avg Resolution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{avgResolutionTime}</div>
              <p className="text-xs text-muted-foreground mt-1">
                days to resolve
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Insights Section */}
        {insights.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Insights & Recommendations</CardTitle>
              <CardDescription>Data-driven insights to improve support performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      insight.type === 'warning'
                        ? 'bg-yellow-500/10 border border-yellow-500/20'
                        : insight.type === 'success'
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-blue-500/10 border border-blue-500/20'
                    }`}
                  >
                    {insight.type === 'warning' ? (
                      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    ) : insight.type === 'success' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{insight.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Tickets by Category</CardTitle>
              <CardDescription>Distribution across different issue types</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryStats.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryStats}
                        dataKey="count"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ category, percentage }) => `${category}: ${percentage}%`}
                      >
                        {categoryStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {categoryStats.map((stat, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="capitalize">{stat.category}</span>
                        </div>
                        <span className="font-medium">{stat.count} ({stat.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">No data available</p>
              )}
            </CardContent>
          </Card>

          {/* Trend Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Trends</CardTitle>
              <CardDescription>Weekly ticket volume and resolution</CardDescription>
            </CardHeader>
            <CardContent>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="tickets" stroke="#8b5cf6" strokeWidth={2} name="Total" />
                    <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" />
                    <Line type="monotone" dataKey="open" stroke="#f59e0b" strokeWidth={2} name="Open" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">No trend data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Backlog Statistics */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Backlog Analysis</CardTitle>
            <CardDescription>Tickets pending for extended periods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-600">{backlogStats.over7Days}</div>
                <p className="text-sm text-muted-foreground mt-1">Pending over 7 days</p>
              </div>
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="text-2xl font-bold text-orange-600">{backlogStats.over14Days}</div>
                <p className="text-sm text-muted-foreground mt-1">Pending over 14 days</p>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-2xl font-bold text-red-600">{backlogStats.over30Days}</div>
                <p className="text-sm text-muted-foreground mt-1">Pending over 30 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
            <CardDescription>Complete breakdown of all tickets in selected timeframe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Resolved</TableHead>
                    <TableHead>Student</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.length > 0 ? (
                    complaints.slice(0, 50).map((complaint) => (
                      <TableRow
                        key={complaint.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/complaint/${complaint.id}`)}
                      >
                        <TableCell className="font-mono text-xs">{complaint.id.slice(0, 8)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{complaint.title}</TableCell>
                        <TableCell className="capitalize">{complaint.category}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              complaint.status === 'resolved'
                                ? 'bg-green-100 text-green-800'
                                : complaint.status === 'in-progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {complaint.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDistanceToNow(new Date(complaint.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="text-sm">
                          {complaint.resolved_at
                            ? formatDistanceToNow(new Date(complaint.resolved_at), { addSuffix: true })
                            : 'N/A'}
                        </TableCell>
                        <TableCell>{complaint.profiles?.name || 'Unknown'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No tickets found in selected timeframe
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              {complaints.length > 50 && (
                <p className="text-sm text-muted-foreground text-center mt-4">
                  Showing 50 of {complaints.length} tickets. Export CSV for complete data.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminAnalytics;
