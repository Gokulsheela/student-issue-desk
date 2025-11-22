import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import heroImage from '@/assets/hero-image.jpg';
import TypewriterSubtitle from '@/components/TypewriterSubtitle';
const Landing = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="container mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <div className="space-y-10">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-foreground animate-fade-in">
                BrotoFix
              </h1>
              <TypewriterSubtitle />
              <div className="flex flex-col sm:flex-row gap-5 animate-slide-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
                <Button 
                  size="lg" 
                  onClick={() => navigate('/auth?type=student')} 
                  className="text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20"
                >
                  Student Login
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate('/auth?type=admin')} 
                  className="text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-border/50"
                >
                  Admin Login
                </Button>
              </div>
            </div>
            <div className="relative animate-float">
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
      <section className="py-24 lg:py-32 bg-muted/30">
        <div className="container mx-auto px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16 text-foreground">
            Key Features
          </h2>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <div className="bg-background p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 animate-scale-in border border-border/50" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Easy Submission</h3>
              <p className="text-muted-foreground leading-relaxed">
                Submit complaints with images and detailed descriptions in minutes
              </p>
            </div>
            <div className="bg-background p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 animate-scale-in border border-border/50" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Real-Time Chat</h3>
              <p className="text-muted-foreground leading-relaxed">
                Communicate directly with admins through our instant messaging system
              </p>
            </div>
            <div className="bg-background p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-500 animate-scale-in border border-border/50" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
              <h3 className="text-xl font-semibold mb-4 text-foreground">Track Progress</h3>
              <p className="text-muted-foreground leading-relaxed">
                Monitor the status of your complaints and get timely updates
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>;
};
export default Landing;