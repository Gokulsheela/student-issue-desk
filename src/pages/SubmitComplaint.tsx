import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Upload } from 'lucide-react';
import complaintsIcon from '@/assets/complaints-icon.jpg';

const SubmitComplaint = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      if (files.length + images.length > 5) {
        toast({
          title: 'Too many images',
          description: 'You can upload a maximum of 5 images',
          variant: 'destructive'
        });
        return;
      }
      setImages([...images, ...files]);
    }
  };

  const uploadImages = async () => {
    const imageUrls: string[] = [];
    
    for (const image of images) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('complaint-images')
        .upload(fileName, image);
      
      if (error) {
        console.error('Error uploading image:', error);
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('complaint-images')
        .getPublicUrl(fileName);
      
      imageUrls.push(publicUrl);
    }
    
    return imageUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.category) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const imageUrls = await uploadImages();
      
      const { error } = await supabase
        .from('complaints')
        .insert({
          student_id: user?.id,
          title: formData.title,
          description: formData.description,
          category: formData.category,
          image_urls: imageUrls,
          status: 'pending'
        });
      
      if (error) throw error;
      
      toast({
        title: 'Complaint submitted',
        description: 'Your complaint has been submitted successfully'
      });
      
      navigate('/student-dashboard');
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast({
        title: 'Submission failed',
        description: 'There was an error submitting your complaint',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/student-dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <img src={complaintsIcon} alt="Submit Complaint" className="w-12 h-12 rounded" />
            <h1 className="text-3xl font-bold text-foreground">Submit a Complaint</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Complaint Details</CardTitle>
              <CardDescription>
                Provide as much detail as possible to help us address your issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="Brief description of the issue"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facilities">Facilities</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
                      <SelectItem value="administration">Administration</SelectItem>
                      <SelectItem value="harassment">Harassment</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed description of your complaint"
                    rows={6}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="images">Images (Optional, max 5)</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      id="images"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      className="cursor-pointer"
                    />
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {images.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {images.length} image(s) selected
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate('/student-dashboard')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SubmitComplaint;
