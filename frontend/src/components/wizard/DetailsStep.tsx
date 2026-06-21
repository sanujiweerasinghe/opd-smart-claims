import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { ClaimData } from "@/components/ClaimsWizard";

interface DetailsStepProps {
  data: ClaimData;
  onUpdate: (data: Partial<ClaimData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const claimTypes = [
  { value: "opd", label: "OPD (Out-Patient)" },
  { value: "spectacles", label: "Spectacles" },
  { value: "dental", label: "Dental" },
];

const DetailsStep = ({ data, onUpdate, onNext, onBack }: DetailsStepProps) => {
  const isValid =
    data.claimType &&
    data.patientName.trim() &&
    data.dateOfTreatment &&
    data.claimAmount.trim();

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-2">Claim Details</h2>
      <p className="text-muted-foreground mb-6">Provide your claim information</p>

      <div className="space-y-5">
        <div>
          <Label htmlFor="claimType">Claim Type</Label>
          <Select value={data.claimType} onValueChange={(value) => onUpdate({ claimType: value })}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select claim type" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border z-50">
              {claimTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="patientName">Patient Name</Label>
          <Input
            id="patientName"
            placeholder="Enter patient name"
            value={data.patientName}
            onChange={(e) => onUpdate({ patientName: e.target.value })}
            className="mt-2"
          />
        </div>

        <div>
          <Label>Date of Treatment</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal mt-2",
                  !data.dateOfTreatment && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.dateOfTreatment ? format(data.dateOfTreatment, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border border-border z-50" align="start">
              <Calendar
                mode="single"
                selected={data.dateOfTreatment}
                onSelect={(date) => onUpdate({ dateOfTreatment: date })}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div>
          <Label htmlFor="claimAmount">Claim Amount (LKR)</Label>
          <Input
            id="claimAmount"
            type="number"
            placeholder="Enter claim amount"
            value={data.claimAmount}
            onChange={(e) => onUpdate({ claimAmount: e.target.value })}
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

export default DetailsStep;
