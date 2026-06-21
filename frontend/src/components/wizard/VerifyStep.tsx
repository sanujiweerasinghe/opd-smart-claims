import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface VerifyStepProps {
  policyNumber: string;
  onUpdate: (value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const VerifyStep = ({ policyNumber, onUpdate, onNext, onBack }: VerifyStepProps) => {
  const isValid = policyNumber.trim().length > 0;

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-2">Verify Policy</h2>
      <p className="text-muted-foreground mb-6">
        Enter your NIC or Policy Number to verify
      </p>

      <div className="space-y-4">
        <div>
          <Label htmlFor="policyNumber">NIC or Policy Number</Label>
          <Input
            id="policyNumber"
            placeholder="Enter NIC (e.g., 123456789V) or Policy Number"
            value={policyNumber}
            onChange={(e) => onUpdate(e.target.value)}
            className="mt-2"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button variant="hero" onClick={onNext} disabled={!isValid}>
          Continue
        </Button>
      </div>
    </div>
  );
};

export default VerifyStep;
