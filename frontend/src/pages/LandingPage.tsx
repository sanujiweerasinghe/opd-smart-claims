import { useNavigate } from "react-router-dom";
import { Building, Smartphone, ShieldCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Logo from "@/components/shared/Logo";
import LanguageSelector from "@/components/shared/LanguageSelector";
import Footer from "@/components/shared/Footer";
import { useLanguage } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";

const LandingPage = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo onClick={() => navigate("/")} />
          <div className="flex items-center gap-4">
            <LanguageSelector />
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t.logout}
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 min-h-[50vh] flex items-center gradient-hero overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-32 h-32 border-4 border-primary-foreground/20 rounded-full" />
          <div className="absolute top-40 left-20 w-16 h-16 bg-primary-foreground/10 rounded-lg rotate-45" />
          <div className="absolute bottom-20 right-20 w-24 h-24 border-4 border-primary-foreground/20 rounded-full" />
          <div className="absolute top-32 right-40 text-primary-foreground/20 text-6xl">✦</div>
          <div className="absolute bottom-32 left-1/4 text-primary-foreground/20 text-4xl">✦</div>
        </div>

        <div className="container mx-auto px-4 py-16 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-6 animate-fade-in">
            {t.heroTitle}
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-10 animate-fade-in">
            {t.heroSub}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button
              size="xl"
              onClick={() => navigate("/branch")}
              className="bg-white text-primary hover:bg-white/90 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 font-bold rounded-full px-8"
            >
              {t.btnSubmitClaim}
            </Button>
            <Button
              variant="heroOutline"
              size="xl"
              className="rounded-full"
              onClick={() => navigate("/digital-portal")}
            >
              {t.btnDigitalPortal}
            </Button>
          </div>
        </div>
      </section>

      {/* Portal Selection */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            {t.choosePortal}
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <PortalCard
              icon={<Building className="w-8 h-8" />}
              title={t.branchPortalTitle}
              subtitle={t.branchPortalSubtitle}
              description={t.branchPortalDesc}
              buttonText={t.btnAccessPortal}
              onClick={() => navigate("/branch")}
            />
            <PortalCard
              icon={<Smartphone className="w-8 h-8" />}
              title={t.digitalPortalTitle}
              subtitle={t.digitalPortalSubtitle}
              description={t.digitalPortalDesc}
              buttonText={t.btnLoginNow}
              onClick={() => navigate("/digital-portal")}
            />
            <PortalCard
              icon={<ShieldCheck className="w-8 h-8" />}
              title={t.adminTitle}
              subtitle={t.adminSubtitle}
              description={t.adminDesc}
              buttonText={t.btnAdminLogin}
              onClick={() => navigate("/admin")}
            />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/50 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            <StatItem value="100%" label={t.statAI} />
            <StatItem value="24/7" label={t.stat247} />
            <StatItem value="3" label={t.statLang} />
            <StatItem value="Fast" label={t.statFast} />
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

interface PortalCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  buttonText: string;
  onClick?: () => void;
}

const PortalCard = ({ icon, title, subtitle, description, buttonText, onClick }: PortalCardProps) => (
  <div className="glass-card p-6 flex flex-col hover-lift">
    <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center text-primary mb-4 mx-auto">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-foreground text-center mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground text-center mb-4">{subtitle}</p>
    <p className="text-sm text-muted-foreground text-center mb-6 flex-1">{description}</p>
    <Button variant="hero" className="w-full" onClick={onClick}>
      {buttonText}
    </Button>
  </div>
);

const StatItem = ({ value, label }: { value: string; label: string }) => (
  <div>
    <p className="text-3xl md:text-4xl font-bold text-primary mb-2">{value}</p>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export default LandingPage;
