import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface SuccessStepProps {
  referenceNumber: string;
  onReset: () => void;
}

const SuccessStep = ({ referenceNumber, onReset }: SuccessStepProps) => {
  return (
    <div className="text-center py-6">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-20 h-20 bg-success rounded-full flex items-center justify-center mx-auto mb-6"
      >
        <CheckCircle className="w-10 h-10 text-success-foreground" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Claim Submitted Successfully!
        </h2>
        <p className="text-muted-foreground mb-8">
          Your claim has been received and is being processed
        </p>

        <div className="bg-muted rounded-xl p-6 mb-6 max-w-sm mx-auto">
          <p className="text-sm text-muted-foreground mb-1">Claim Reference Number</p>
          <p className="text-2xl font-bold text-primary">{referenceNumber}</p>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          You will receive updates via SMS and email. Processing typically takes 3-5
          business days.
        </p>

        <Button variant="hero" size="lg" className="w-full max-w-sm" onClick={onReset}>
          Submit Another Claim
        </Button>
      </motion.div>
    </div>
  );
};

export default SuccessStep;
