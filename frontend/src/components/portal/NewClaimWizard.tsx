import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, CheckCircle, Upload, X, Loader2, 
  AlertCircle, FileText, Brain, Shield, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api"; 

interface NewClaimWizardProps {
  onComplete: () => void;
}

interface Policy {
  id: number;
  policy_number: string;
  policy_type: string;
  hospitalization_limit: number;
  opd_limit: number;
}

interface PolicyMember {
  id: number;
  member_name: string;
  relationship: string;
  mobile_number?: string;
  bank_name?: string;
  account_number?: string;
}

interface UploadedDocument {
  file: File;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
}

const STEPS = ["Policy Selection", "Claim Details", "Documents Upload", "AI Processing"];

const NewClaimWizard = ({ onComplete }: NewClaimWizardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [members, setMembers] = useState<PolicyMember[]>([]);
  
  const [formData, setFormData] = useState({
    policyId: "",
    claimType: "",
    hospitalizationType: "",
    memberId: "",
    mobileNumber: "",
    accountNumber: "",
    bankName: "",
    dateOfTreatment: "",
    admissionDate: "",
    dischargeDate: "",
    doctorName: "",
    diagnosis: "",
    claimAmount: "",
  });
  
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [claimReference, setClaimReference] = useState("");
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [aiResults, setAiResults] = useState<any>(null);
  const [currentClaimId, setCurrentClaimId] = useState<number | null>(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const response = await api.get('/policies/search/');
        const policiesData = response.data;
        setPolicies(policiesData);

        // --- AUTO-SELECT LOGIC ---
        if (policiesData.length > 0) {
            setFormData(prev => ({ ...prev, policyId: policiesData[0].id.toString() }));
        }
      } catch (error) {
        console.error("Error loading policies", error);
        toast.error("Could not load policies");
      }
    };
    fetchPolicies();
  }, []);

  useEffect(() => {
    if (!formData.policyId) return;
    
    const fetchMembers = async () => {
      try {
        const response = await api.get(`/policies/${formData.policyId}/members/`);
        setMembers(response.data);
      } catch (error) {
        console.error("Error loading members", error);
      }
    };
    fetchMembers();
  }, [formData.policyId]);

  useEffect(() => {
    if (!formData.memberId) return;

    const selectedMember = members.find(m => m.id.toString() === formData.memberId);

    if (selectedMember) {
      setFormData(prev => ({
        ...prev,
        mobileNumber: selectedMember.mobile_number || prev.mobileNumber || "",
        bankName: selectedMember.bank_name || prev.bankName || "",
        accountNumber: selectedMember.account_number || prev.accountNumber || ""
      }));
      
      if(selectedMember.mobile_number || selectedMember.bank_name) {
        toast.info("Details auto-filled from member profile.");
      }
    }
  }, [formData.memberId, members]);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        status: 'pending' as const,
      }));
      setDocuments(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please log in to submit a claim");
      return;
    }

    setIsLoading(true);
    setCurrentStep(3); 
    setProcessingStatus("Creating claim record...");
    setProcessingProgress(10);

    try {
      const selectedPolicyObj = policies.find(p => p.id.toString() === formData.policyId);

      const selectedMember = members.find(m => m.id.toString() === formData.memberId);
      const claimPayload = {
        reference_number: `CLM-${Date.now()}`,
        claim_type: formData.claimType,
        claim_amount: parseFloat(formData.claimAmount) || 0,
        status: 'pending',
        description: `Diagnosis: ${formData.diagnosis}, Doctor: ${formData.doctorName}`,
        policy_number: selectedPolicyObj ? selectedPolicyObj.policy_number : "",
        patient_name: selectedMember?.member_name || null,
        doctor_name: formData.doctorName || null,
        diagnosis: formData.diagnosis || null,
        treatment_date: formData.dateOfTreatment || formData.admissionDate || null,
      };

      const claimRes = await api.post('/claims/', claimPayload);
      const newClaim = claimRes.data;

      setCurrentClaimId(newClaim.id);
      setClaimReference(newClaim.reference_number);
      setProcessingProgress(30);
      setProcessingStatus("Uploading documents...");

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        
        setDocuments(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'uploading' } : d));

        const uploadData = new FormData();
        uploadData.append('claim', newClaim.id);
        uploadData.append('file', doc.file);

        try {
          await api.post('/documents/upload/', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          setDocuments(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'uploaded' } : d));
        } catch (err) {
          console.error("Upload error", err);
          setDocuments(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'error' } : d));
        }
        
        setProcessingProgress(30 + ((i + 1) / documents.length) * 30);
      }

      setProcessingProgress(70);
      setProcessingStatus("Running AI document analysis...");

      try {
        const aiRes = await api.post('/claims/process/', {
          claimId: newClaim.id,
          manualDate: formData.dateOfTreatment
        });
        
        setAiResults(aiRes.data);
        setProcessingProgress(100);
        setProcessingStatus("Complete!");
        setIsSubmitted(true);
        toast.success("Claim submitted successfully!");

      } catch (aiError) {
        console.error("AI Error:", aiError);
        toast.error("AI analysis failed, sent for manual review.");
        
        setAiResults({
            pipeline_results: {
                decision: 'manual_review',
                validation_score: 0,
                fraud_score: 0,
                ai_summary: "AI Analysis unavailable. Pending manual review."
            }
        });
        setIsSubmitted(true);
      }

    } catch (error) {
      console.error(error);
      toast.error("Failed to submit claim. Please try again.");
      setIsLoading(false);
      setCurrentStep(2); 
    }
  };

  const handleResubmit = async () => {
    if (!currentClaimId) return;
    try {
      await api.post(`/claims/${currentClaimId}/resubmit/`);
      setDocuments([]);
      setProcessingProgress(0);
      setProcessingStatus("");
      setAiResults(null);
      setIsSubmitted(false);
      setIsLoading(false);
      setCurrentStep(2);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Resubmission failed.");
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  if (isSubmitted && aiResults) {
    const decision = aiResults.pipeline_results?.decision || "pending";
    const insurerPayment = aiResults.pipeline_results?.insurer_payment || 0;
    const validationScore = aiResults.pipeline_results?.validation_score || 0;
    const fraudScore = aiResults.pipeline_results?.fraud_score || 0;

    return (
      <div className="glass-card p-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6",
            decision === "auto_approve" ? "bg-green-500" :
            decision === "reject" ? "bg-red-500" : "bg-amber-500"
          )}
        >
          {decision === "auto_approve" ? (
            <CheckCircle className="w-10 h-10 text-white" />
          ) : decision === "reject" ? (
            <X className="w-10 h-10 text-white" />
          ) : (
            <AlertCircle className="w-10 h-10 text-white" />
          )}
        </motion.div>
        
        <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
          {decision === "auto_approve" ? "Claim Approved!" :
           decision === "reject" ? "Claim Rejected" : "Claim Under Review"}
        </h2>
        
        <div className="bg-muted rounded-xl p-4 mb-6 text-center">
          <p className="text-sm text-muted-foreground">Reference Number:</p>
          <p className="text-xl font-bold text-primary">{claimReference}</p>
        </div>

        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-foreground">AI Analysis Summary</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Validation Score</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {Math.round(validationScore)}%
              </p>
            </div>
            
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">Fraud Risk</span>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                fraudScore >= 0.7 ? "text-red-500" :
                fraudScore >= 0.4 ? "text-amber-500" : "text-green-500"
              )}>
                {fraudScore >= 0.7 ? "High" : fraudScore >= 0.4 ? "Medium" : "Low"}
              </p>
            </div>
          </div>

          {decision === "auto_approve" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Approved Amount</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                LKR {parseFloat(insurerPayment).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Retry option for rejected / manual review — max 3 attempts */}
        {decision !== 'auto_approve' && (aiResults?.pipeline_results?.attempts_remaining ?? 0) > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs text-amber-700 mb-2">
              You can re-upload your documents up to{' '}
              <strong>{aiResults?.pipeline_results?.attempts_remaining}</strong> more time(s).
            </p>
            <Button variant="outline" size="sm" onClick={handleResubmit} className="w-full text-amber-700 border-amber-400 hover:bg-amber-100">
              Re-upload Documents &amp; Retry
            </Button>
          </div>
        )}

        {decision !== 'auto_approve' && (aiResults?.pipeline_results?.attempts_remaining ?? 0) === 0 && (
          <p className="text-xs text-red-500 mb-4 text-center">Maximum resubmissions reached. No further retries allowed.</p>
        )}

        <Button variant="hero" onClick={onComplete} className="w-full">
          View My Claims
        </Button>
      </div>
    );
  }

  if (currentStep === 3 && isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6"
          >
            <Brain className="w-10 h-10 text-white" />
          </motion.div>
          
          <h2 className="text-xl font-bold text-foreground mb-2">AI Processing Your Claim</h2>
          <p className="text-muted-foreground mb-6">{processingStatus}</p>
          
          <Progress value={processingProgress} className="mb-4" />
          
          <div className="space-y-3 text-left max-w-md mx-auto">
            <div className="flex items-center gap-3">
              {processingProgress >= 10 ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
              <span className={processingProgress >= 10 ? "text-foreground" : "text-muted-foreground"}>Creating claim record</span>
            </div>
            <div className="flex items-center gap-3">
              {processingProgress >= 50 ? <CheckCircle className="w-5 h-5 text-green-500" /> : processingProgress >= 30 ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />}
              <span className={processingProgress >= 30 ? "text-foreground" : "text-muted-foreground"}>Uploading & OCR processing</span>
            </div>
            <div className="flex items-center gap-3">
              {processingProgress >= 90 ? <CheckCircle className="w-5 h-5 text-green-500" /> : processingProgress >= 70 ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />}
              <span className={processingProgress >= 70 ? "text-foreground" : "text-muted-foreground"}>AI Validation & Fraud Check</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center gap-4 mb-4">
          {currentStep > 0 && (
            <button onClick={prevStep}>
              <ArrowLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-bold text-foreground">Submit New Claim</h2>
            <p className="text-sm text-muted-foreground">AI-powered claim submission with instant verification</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {STEPS.map((step, i) => (
              <span key={i} className={cn(i === currentStep && "text-primary font-medium")}>
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Step 1: Policy Selection</h3>
                  <p className="text-sm text-muted-foreground">Select your policy and claim type</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Select Policy *</Label>
                    <Select disabled={user?.role === 'customer'} value={formData.policyId} onValueChange={(v) => updateFormData("policyId", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select your policy" />
                      </SelectTrigger>
                      <SelectContent>
                        {policies.map((policy) => (
                          <SelectItem key={policy.id} value={policy.id.toString()}>
                            {policy.policy_number} - {policy.policy_type} 
                            (OPD Limit: LKR {policy.opd_limit?.toLocaleString()})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Claim Type *</Label>
                    <Select value={formData.claimType} onValueChange={(v) => updateFormData("claimType", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select type of claim" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opd">OPD (Out-Patient)</SelectItem>
                        <SelectItem value="dental">Dental</SelectItem>
                        <SelectItem value="spectacles">Spectacles</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Claimant (Covered Member) *</Label>
                    <Select value={formData.memberId} onValueChange={(v) => updateFormData("memberId", v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={!formData.policyId ? "Select a policy first" : "Select covered member"} />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id.toString()}>
                            {member.member_name} ({member.relationship})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={onComplete}>Cancel</Button>
                  <Button
                    variant="hero"
                    onClick={nextStep}
                    disabled={!formData.policyId || !formData.claimType || !formData.memberId}
                  >
                    Continue to Details
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Step 2: Claim Details</h3>
                  <p className="text-sm text-muted-foreground">Provide treatment and payment details</p>
                </div>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <Label>Mobile Number *</Label>
                        <Input
                          value={formData.mobileNumber}
                          onChange={(e) => updateFormData("mobileNumber", e.target.value)}
                          className="mt-1"
                          placeholder="+94 77 123 4567"
                        />
                      </div>
                      <div>
                        <Label>Bank Name *</Label>
                        <Select value={formData.bankName} onValueChange={(v) => updateFormData("bankName", v)}>
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BOC">Bank of Ceylon</SelectItem>
                            <SelectItem value="Peoples">People's Bank</SelectItem>
                            <SelectItem value="Commercial">Commercial Bank</SelectItem>
                            <SelectItem value="HNB">Hatton National Bank</SelectItem>
                            <SelectItem value="Sampath">Sampath Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Account Number *</Label>
                        <Input
                          placeholder="1234567890"
                          value={formData.accountNumber}
                          onChange={(e) => updateFormData("accountNumber", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                  </div>

                  <div className="space-y-4">
                      {formData.claimType === "hospitalization" ? (
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Admission Date *</Label>
                            <Input
                              type="date"
                              value={formData.admissionDate}
                              onChange={(e) => updateFormData("admissionDate", e.target.value)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Discharge Date</Label>
                            <Input
                              type="date"
                              value={formData.dischargeDate}
                              onChange={(e) => updateFormData("dischargeDate", e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <Label>Date of Treatment *</Label>
                          <Input
                            type="date"
                            value={formData.dateOfTreatment}
                            onChange={(e) => updateFormData("dateOfTreatment", e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}
                      
                      
                      <div>
                        <Label>Claim Amount (LKR) *</Label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={formData.claimAmount}
                          onChange={(e) => updateFormData("claimAmount", e.target.value)}
                          className="mt-1"
                        />
                      </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}>Back</Button>
                  <Button
                    variant="hero"
                    onClick={nextStep}
                    disabled={!formData.accountNumber || !formData.bankName || !formData.claimAmount}
                  >
                    Continue to Documents
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Step 3: Upload Documents</h3>
                  <p className="text-sm text-muted-foreground">Upload your claim documents for AI verification</p>
                </div>

                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    id="file-upload"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    multiple
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                  />
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-foreground font-medium">Drag & drop files or Click to Browse</p>
                  <p className="text-sm text-muted-foreground mt-1">Supports PDF, JPG, PNG (Max 10MB each)</p>
                </div>

                {documents.length > 0 && (
                  <div className="space-y-2">
                    {documents.map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <span className="text-sm text-foreground">{doc.file.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {doc.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                          {doc.status === 'uploaded' && <CheckCircle className="w-4 h-4 text-green-500" />}
                          {doc.status === 'error' && <X className="w-4 h-4 text-red-500" />}
                          <button onClick={() => removeFile(i)}>
                            <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={prevStep}>Back</Button>
                  <Button 
                    variant="hero" 
                    onClick={handleSubmit}
                    disabled={documents.length === 0 || isLoading}
                  >
                    {isLoading ? "Processing..." : "Submit Claim"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NewClaimWizard;
