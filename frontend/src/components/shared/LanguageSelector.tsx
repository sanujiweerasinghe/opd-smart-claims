import { forwardRef } from "react";
import { Globe, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useLanguage, Language } from "@/lib/i18n";

const languages: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "si", label: "සිංහල" },
  { code: "ta", label: "தமிழ்" },
];

interface LanguageSelectorProps {
  variant?: "light" | "dark";
}

const LanguageSelector = forwardRef<HTMLButtonElement, LanguageSelectorProps>(
  ({ variant = "light" }, ref) => {
    const { language, setLanguage } = useLanguage();
    const isDark = variant === "dark";
    const current = languages.find((l) => l.code === language) || languages[0];

    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          ref={ref}
          className={cn(
            "flex items-center gap-2 text-sm transition-colors outline-none",
            isDark
              ? "text-primary-foreground/90 hover:text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Globe className="w-4 h-4" />
          <span>{current.label}</span>
          <ChevronDown className="w-3 h-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-card border border-border z-50">
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={cn(
                "cursor-pointer",
                lang.code === language && "bg-primary text-primary-foreground"
              )}
            >
              {lang.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

LanguageSelector.displayName = "LanguageSelector";

export default LanguageSelector;
