import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "light" | "dark";
  className?: string;
  onClick?: () => void;
}

const Logo = ({ variant = "light", className, onClick }: LogoProps) => {
  const isDark = variant === "dark";

  return (
    <div
      className={cn("flex items-center gap-3 cursor-pointer", className)}
      onClick={onClick}
    >
      {/* Logo Image Section */}
      <div className="w-16 h-16 flex items-center justify-center">
        <img 
          src="/opd-logo.png" 
          alt="OPD Shield" 
          className="w-full h-full object-contain"
        />
      </div>

      {/* Text Section */}
      <div>
        <h1
          className={cn(
            "font-bold text-base",
            isDark ? "text-primary-foreground" : "text-foreground"
          )}
        >
          OPD
        </h1>
        <p
          className={cn(
            "text-xs",
            isDark ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          Smart Claims System
        </p>
      </div>
    </div>
  );
};

export default Logo;