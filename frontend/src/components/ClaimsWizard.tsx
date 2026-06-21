import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Shield } from "lucide-react";
import StepIndicator from "@/components/wizard/StepIndicator";
import LanguageStep from "@/components/wizard/LanguageStep";
import VerifyStep from "@/components/wizard/VerifyStep";
import DetailsStep from "@/components/wizard/DetailsStep";
import UploadStep from "@/components/wizard/UploadStep";
import SuccessStep from "@/components/wizard/SuccessStep";

export interface ClaimData {
  language: string;
  policyNumber: string;
  claimType: string;
  patientName: string;
  dateOfTreatment: Date | undefined;
  claimAmount: string;
  documents: File[];
}

interface ClaimsWizardProps {
  onBack: () => void;
}

const STEPS = ["Language", "Verify", "Details", "Upload", "Complete"];

const ClaimsWizard = ({ onBack }: ClaimsWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [claimData, setClaimData] = useState<ClaimData>({
    language: "",
    policyNumber: "",
    claimType: "",
    patientName: "",
    dateOfTreatment: undefined,
    claimAmount: "",
    documents: [],
  });
  const [referenceNumber, setReferenceNumber] = useState("");

  const updateClaimData = (data: Partial<ClaimData>) => {
    setClaimData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    // Generate reference number
    const refNum = `CR${String(Math.floor(Math.random() * 100000)).padStart(6, "0")}`;
    setReferenceNumber(refNum);
    nextStep();
  };

  const handleReset = () => {
    setCurrentStep(0);
    setClaimData({
      language: "",
      policyNumber: "",
      claimType: "",
      patientName: "",
      dateOfTreatment: undefined,
      claimAmount: "",
      documents: [],
    });
    setReferenceNumber("");
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-orange-500 to-amber-400 shadow-lg">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={onBack}>
            <div className="w-10 h-10 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-primary-foreground">OPD</h1>
              <p className="text-xs text-primary-foreground/80">Smart Claims System</p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-sm text-primary-foreground/90 hover:text-primary-foreground transition-colors">
            <Globe className="w-4 h-4" />
            <span>English</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Customer Portal - Branch
            </h1>
            <p className="text-muted-foreground mt-1">
              Submit your claim with AI-powered verification
            </p>
          </div>

          {/* Step Indicator */}
          <StepIndicator steps={STEPS} currentStep={currentStep} />

          {/* Wizard Card */}
          <div className="glass-card p-6 md:p-8 mt-8">
            <AnimatePresence mode="wait" custom={1}>
              <motion.div
                key={currentStep}
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {currentStep === 0 && (
                  <LanguageStep
                    selectedLanguage={claimData.language}
                    onSelect={(language) => {
                      updateClaimData({ language });
                      nextStep();
                    }}
                  />
                )}
                {currentStep === 1 && (
                  <VerifyStep
                    policyNumber={claimData.policyNumber}
                    onUpdate={(policyNumber) => updateClaimData({ policyNumber })}
                    onNext={nextStep}
                    onBack={prevStep}
                  />
                )}
                {currentStep === 2 && (
                  <DetailsStep
                    data={claimData}
                    onUpdate={updateClaimData}
                    onNext={nextStep}
                    onBack={prevStep}
                  />
                )}
                {currentStep === 3 && (
                  <UploadStep
                    documents={claimData.documents}
                    onUpdate={(documents) => updateClaimData({ documents })}
                    onSubmit={handleSubmit}
                    onBack={prevStep}
                  />
                )}
                {currentStep === 4 && (
                  <SuccessStep
                    referenceNumber={referenceNumber}
                    onReset={handleReset}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClaimsWizard;
