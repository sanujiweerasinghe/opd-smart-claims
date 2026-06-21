import { useNavigate } from "react-router-dom";
import { Globe, Zap, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import Footer from "@/components/shared/Footer";
import { useAuth } from "@/hooks/useAuth"; 

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth(); // Connect to your auth system

  const handleLogout = () => {
    logout(); // Call the new logout function
    navigate("/"); // Redirect to home
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">OPD</h1>
              <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">Smart Claims</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="hidden md:flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
              <Globe className="w-4 h-4" />
              <span>English</span>
            </button>
            {user && (
               <Button 
                 onClick={handleLogout} 
                 variant="outline"
                 className="h-9 px-4 text-sm"
               >
                 Logout
               </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 lg:min-h-[85vh] flex items-center bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 border-4 border-white/20 rounded-full animate-pulse" />
          <div className="absolute top-40 left-20 w-16 h-16 bg-white/10 rounded-lg rotate-45" />
          <div className="absolute bottom-20 right-20 w-64 h-64 border-[20px] border-white/10 rounded-full" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-bold tracking-wide shadow-sm">
            Next Gen Insurance
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 tracking-tight drop-shadow-md">
            OPD <br className="hidden md:block" /> Smart Claims
          </h1>
          
          <p className="text-lg md:text-2xl text-orange-50 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Experience the future of insurance. Submit, track, and get your claims approved with AI-powered verification.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            {/* Styled these buttons manually to ensure they work without custom variants */}
            <button 
              onClick={() => navigate('/digital-portal')} 
              className="bg-white text-orange-600 hover:bg-gray-50 hover:scale-105 shadow-xl transition-all duration-300 font-bold rounded-full px-8 py-4 text-lg min-w-[200px]"
            >
              Submit New Claim
            </button>
            
            <button 
              onClick={() => navigate('/digital-portal')}
              className="bg-transparent text-white border-2 border-white hover:bg-white/10 rounded-full px-8 py-4 text-lg font-bold backdrop-blur-sm min-w-[200px] transition-all"
            >
              Access Portal
            </button>
          </div>
        </div>
      </section>

      {/* Portal Selection */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">
              Choose Your Portal
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Select the portal that best fits your needs to get started.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <PortalCard
              icon={<Shield className="w-8 h-8 text-blue-600" />}
              title="Branch Portal"
              subtitle="Staff & Walk-ins"
              description="For branch officers to assist customers with document verification."
              buttonText="Staff Login"
              onClick={() => navigate('/branch')}
              bgColor="bg-blue-50"
              borderColor="border-blue-100"
              btnColor="bg-blue-600 hover:bg-blue-700"
            />
            <PortalCard
              icon={<Zap className="w-8 h-8 text-orange-600" />}
              title="Digital Portal"
              subtitle="Customers"
              description="Submit and track your own claims from anywhere. Fast and digital."
              buttonText="Customer Login"
              onClick={() => navigate('/digital-portal')}
              bgColor="bg-orange-50"
              borderColor="border-orange-100"
              btnColor="bg-orange-500 hover:bg-orange-600"
              featured={true}
            />
            <PortalCard
              icon={<Clock className="w-8 h-8 text-purple-600" />}
              title="Admin View"
              subtitle="Management"
              description="Comprehensive dashboard for claim review and system management."
              buttonText="Admin Login"
              onClick={() => navigate('/admin')}
              bgColor="bg-purple-50"
              borderColor="border-purple-100"
              btnColor="bg-purple-600 hover:bg-purple-700"
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
            <StatItem value="100%" label="AI Verification" />
            <StatItem value="24/7" label="Support Available" />
            <StatItem value="3" label="Languages" />
            <StatItem value="< 24h" label="Processing Time" />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

// --- Sub Components ---

interface PortalCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  onClick?: () => void;
  bgColor: string;
  borderColor: string;
  btnColor: string;
  featured?: boolean;
}

const PortalCard = ({ icon, title, subtitle, description, buttonText, onClick, bgColor, borderColor, btnColor, featured }: PortalCardProps) => (
  <div className={`relative flex flex-col p-8 rounded-3xl transition-all duration-300 hover:-translate-y-2 bg-white ${featured ? 'shadow-2xl ring-2 ring-orange-200 scale-105 z-10' : 'shadow-lg border ' + borderColor}`}>
    {featured && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
        Most Popular
      </div>
    )}
    <div className={`w-16 h-16 rounded-2xl ${bgColor} flex items-center justify-center mb-6 mx-auto`}>
      {icon}
    </div>
    <div className="text-center flex-1">
      <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 mb-4">
        {subtitle}
      </span>
      <p className="text-gray-500 mb-8 leading-relaxed text-sm">{description}</p>
    </div>
    <button 
      className={`w-full font-bold h-12 rounded-xl text-white transition-all shadow-md ${btnColor}`}
      onClick={onClick}
    >
      {buttonText}
    </button>
  </div>
);

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div className="px-4 py-2">
    <p className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500 mb-2">
      {value}
    </p>
    <p className="text-sm font-bold text-gray-400 uppercase tracking-wide">{label}</p>
  </div>
);

export default LandingPage;