import { cn } from "@/lib/utils";

interface LanguageStepProps {
  selectedLanguage: string;
  onSelect: (language: string) => void;
}

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்" },
];

const LanguageStep = ({ selectedLanguage, onSelect }: LanguageStepProps) => {
  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-2">Select Language</h2>
      <p className="text-muted-foreground mb-6">
        Choose your preferred language for the claim submission
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onSelect(lang.code)}
            className={cn(
              "p-6 rounded-xl border-2 transition-all duration-200 hover:border-primary hover:shadow-md",
              selectedLanguage === lang.code
                ? "border-primary bg-secondary"
                : "border-border bg-card"
            )}
          >
            <span className="text-lg font-semibold text-primary block">
              {lang.nativeName}
            </span>
            {lang.nativeName !== lang.name && (
              <span className="text-sm text-muted-foreground mt-1 block">
                {lang.name}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageStep;
