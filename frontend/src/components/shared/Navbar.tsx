import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "./Logo";
import LanguageSelector from "./LanguageSelector";
import { LogOut } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface NavbarProps {
  variant?: "light" | "dark" | "gradient";
  showLogout?: boolean;
  onLogout?: () => void;
}

const Navbar = ({ variant = "gradient", showLogout = false, onLogout }: NavbarProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const bgClass =
    variant === "gradient"
      ? "bg-gradient-to-r from-orange-500 to-amber-400"
      : variant === "dark"
      ? "bg-[#1a1a1a]"
      : "bg-card/80 backdrop-blur-md border-b border-border";

  const logoVariant = variant === "light" ? "light" : "dark";

  return (
    <nav className={`${bgClass} sticky top-0 z-50`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Logo variant={logoVariant} onClick={() => navigate("/")} />
        <div className="flex items-center gap-4">
          <LanguageSelector variant={logoVariant} />
          {showLogout && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="border-white/30 text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t.logout}
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
