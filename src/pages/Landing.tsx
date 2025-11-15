import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import heroImage from '@/assets/hero-image.jpg';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl font-bold leading-tight text-foreground">
                Student Complaint Management Platform
              </h1>
              <p className="text-xl text-muted-foreground">
                Submit issues easily and track responses in real time. Get the support you need, when you need it.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth?type=student')}
                  className="text-lg"
                >
                  Student Login
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/auth?type=admin')}
                  className="text-lg"
                >
                  Admin Login
                </Button>
              </div>
            </div>
            <div className="relative">
              <img 
                src={heroImage} 
                alt="Students communicating with support staff" 
                className="rounded-lg shadow-2xl w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
            Key Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-foreground">Easy Submission</h3>
              <p className="text-muted-foreground">
                Submit complaints with images and detailed descriptions in minutes
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-foreground">Real-Time Chat</h3>
              <p className="text-muted-foreground">
                Communicate directly with admins through our instant messaging system
              </p>
            </div>
            <div className="bg-background p-6 rounded-lg shadow-md">
              <h3 className="text-xl font-semibold mb-3 text-foreground">Track Progress</h3>
              <p className="text-muted-foreground">
                Monitor the status of your complaints and get timely updates
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
