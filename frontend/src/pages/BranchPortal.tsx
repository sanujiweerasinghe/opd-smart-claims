import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle, Upload, X, Globe, Loader2, 
  AlertCircle, FileText, Brain, Shield, Calculator,
  User, Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Logo from "@/components/shared/Logo";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { cn } from "@/lib/utils";
import { useLanguage, Language } from "@/lib/i18n";
import api, { searchGroupInsurance, getGroupRiders, GroupInsuranceRecord, GroupRiderRecord } from "@/services/api"; 
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";

const nicRegex = /^([0-9]{9}[vVxX]|[0-9]{10,12})$/;
const policyRegex = /^POL-?[0-9\-]+$/i;

const nicOrPolicySchema = z.string()
  .min(1, "NIC or Policy number is required")
  .max(50, "Input too long")
  .refine(
    (val) => nicRegex.test(val) || policyRegex.test(val) || val.length >= 9,
    "Please enter a valid NIC or Policy number"
  );

const claimAmountSchema = z.string()
  .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, "Claim amount must be a positive number")
  .refine((val) => parseFloat(val) <= 10000000, "Claim amount exceeds maximum limit");

interface Policy {
  id: number; 
  policy_number: string;
  policy_type: string;
  holder_name: string; 
  opd_limit: number;
  // Group insurance extra fields (present when source === 'group')
  source?: 'policy' | 'group';
  link_id?: string;
  employee_number?: string;
  fund_type?: string;
  commence_date?: string;
  premium_amount?: number;
  holder_nic?: string;
}

interface PolicyMember {
  id: number;
  member_name: string;
  relationship: string;
  bank_name: string;
  account_number: string;
  mobile_number: string;
}

interface UploadedDoc {
  file: File;
  status: 'uploading' | 'processing' | 'accepted' | 'error';
  ocrConfidence?: number;
  documentType?: string;
}

const BranchPortal = () => {
  const navigate = useNavigate();
  const { t, setLanguage } = useLanguage();
  const { user, login, logout, loading: authLoading } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [members, setMembers] = useState<PolicyMember[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [selectedMember, setSelectedMember] = useState<PolicyMember | null>(null);
  
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nicOrPolicy: "",
    policyId: "",
    claimType: "",
    memberId: "",
    mobileNumber: "",
    bankName: "",
    accountNumber: "",
    doctorName: "",
    diagnosis: "",
    admissionDate: "",
    dischargeDate: "",
    dateOfTreatment: "",
    claimAmount: "",
  });
  
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState("");
  const [aiResults, setAiResults] = useState<any>(null);
  const [currentClaimId, setCurrentClaimId] = useState<number | null>(null);
  const [groupInsurance, setGroupInsurance] = useState<GroupInsuranceRecord | null>(null);
  const [groupRiders, setGroupRiders] = useState<GroupRiderRecord[]>([]);

  const STEPS = [t.stepLanguage, t.stepVerify, t.stepDetails, t.stepUpload, t.stepComplete];

  const handleBranchLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      toast.error("Please enter username and password");
      return;
    }
    setLoginLoading(true);
    try {
      const response = await api.post('/login/', {
        username: loginUsername,
        password: loginPassword
      });
      const userData = response.data;
      if (userData.role !== 'branch' && userData.role !== 'admin') {
        toast.error("Access denied. This portal is for branch staff only.");
        setLoginLoading(false);
        return;
      }
      login(userData); 
      toast.success("Login successful!");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoginLoading(false);
    }
  };

  const verifyPolicy = async () => {
    if (!formData.nicOrPolicy) return;
    if (authLoading) return;
    if (!user) {
      toast.error("Please sign in as branch staff");
      return;
    }
    const validationResult = nicOrPolicySchema.safeParse(formData.nicOrPolicy);
    if (!validationResult.success) {
      toast.error(validationResult.error.errors[0].message);
      return;
    }
    setIsLoading(true);
    try {
      const response = await api.get('/policies/search/', {
        params: { query: formData.nicOrPolicy }
      });
      const data: Policy[] = response.data;
      if (data && data.length > 0) {
        const first = data[0];
        setPolicies(data);
        setSelectedPolicy(first);
        setFormData((prev) => ({ ...prev, policyId: first.id.toString() }));

        if (first.source === 'group') {
          // Group insurance record returned directly — map it to GroupInsuranceRecord shape
          setGroupInsurance({
            id: first.id,
            document_no: first.policy_number,
            item_name: first.holder_name,
            main_class: first.policy_type.replace('Group - ', ''),
            fund_type: first.fund_type || '',
            sum_insured: String(first.opd_limit),
            premium_amount: String(first.premium_amount ?? 0),
            sex: '',
            employee_number: first.employee_number || '',
            commence_date: first.commence_date || '',
            link_id: first.link_id || '',
          });
          // Fetch riders using link_id (the master group policy number)
          if (first.link_id) {
            try {
              const ridersRes = await getGroupRiders(first.link_id);
              setGroupRiders(ridersRes.data);
            } catch {
              setGroupRiders([]);
            }
          }
          toast.success(`Group insurance record found for ${first.holder_name}`);
        } else {
          // Standard individual policy — try a secondary group lookup (optional)
          try {
            const grpRes = await searchGroupInsurance(formData.nicOrPolicy);
            if (grpRes.data && grpRes.data.length > 0) {
              const grpRecord = grpRes.data[0];
              setGroupInsurance(grpRecord);
              const ridersRes = await getGroupRiders(grpRecord.document_no);
              setGroupRiders(ridersRes.data);
            } else {
              setGroupInsurance(null);
              setGroupRiders([]);
            }
          } catch {
            setGroupInsurance(null);
            setGroupRiders([]);
          }
          toast.success("Policy verified successfully!");
        }

        nextStep();
      } else {
        toast.error("No active policy found with this NIC/Policy number");
      }
    } catch (err) {
      console.error(err);
      toast.error("Unable to verify policy. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchMembers = async () => {
      if (!formData.policyId) return;

      // For group insurance records, create a synthetic member (no PolicyMember table rows exist)
      if (selectedPolicy?.source === 'group') {
        const syntheticMember: PolicyMember = {
          id: selectedPolicy.id,
          member_name: selectedPolicy.holder_name,
          relationship: 'Employee',
          bank_name: '',
          account_number: '',
          mobile_number: '',
        };
        setMembers([syntheticMember]);
        setSelectedMember(syntheticMember);
        setFormData(prev => ({ ...prev, memberId: String(selectedPolicy.id) }));
        return;
      }

      try {
        const response = await api.get(`/policies/${formData.policyId}/members/`);
        setMembers(response.data);
      } catch (err) {
        console.error("Error fetching members", err);
      }
    };
    fetchMembers();
  }, [formData.policyId, selectedPolicy?.source]);

  useEffect(() => {
    if (formData.memberId && members.length > 0) {
      const member = members.find(m => m.id.toString() === formData.memberId.toString());
      if (member) {
        setSelectedMember(member);
        setFormData(prev => ({
          ...prev,
          mobileNumber: member.mobile_number || "",
          bankName: member.bank_name || "",
          accountNumber: member.account_number || "",
        }));
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
        status: 'uploading' as const,
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
    const amountValidation = claimAmountSchema.safeParse(formData.claimAmount);
    if (!amountValidation.success) {
      toast.error(amountValidation.error.errors[0].message);
      return;
    }
    setIsLoading(true);
    setCurrentStep(4);
    setProcessingStatus("Creating claim...");
    setProcessingProgress(10);
    try {
      if (!user) {
        toast.error("Please sign in");
        return;
      }
      const claimPayload = {
        reference_number: `CLM-${Date.now()}`,
        claim_type: formData.claimType,
        claim_amount: parseFloat(formData.claimAmount),
        status: 'pending',
        // Explicit structured fields
        policy_number: selectedPolicy?.policy_number || formData.nicOrPolicy || null,
        patient_name: selectedMember?.member_name || formData.nicOrPolicy || null,
        doctor_name: formData.doctorName || null,
        diagnosis: formData.diagnosis || null,
        treatment_date: formData.dateOfTreatment || formData.admissionDate || null,
        // Keep description for AI pipeline backward-compat
        description: `Doctor: ${formData.doctorName}, Diagnosis: ${formData.diagnosis}`,
      };
      const claimResponse = await api.post('/claims/', claimPayload);
      const newClaim = claimResponse.data;
      setCurrentClaimId(newClaim.id);
      setReferenceNumber(newClaim.reference_number);
      setProcessingProgress(30);
      setProcessingStatus("Uploading documents...");
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const uploadData = new FormData();
        uploadData.append('claim', newClaim.id);
        uploadData.append('file', doc.file);
        try {
          await api.post('/documents/upload/', uploadData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          setDocuments(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'processing' } : d));
        } catch (uploadErr) {
          console.error("Upload failed", uploadErr);
          setDocuments(prev => prev.map((d, idx) => idx === i ? { ...d, status: 'error' } : d));
        }
        setProcessingProgress(30 + ((i + 1) / documents.length) * 30);
      }
      setProcessingProgress(70);
      setProcessingStatus("Running AI analysis...");
      try {
        const pipelineResponse = await api.post('/claims/process/', { claimId: newClaim.id });
        const aiData = pipelineResponse.data;
        setAiResults(aiData);
        setProcessingProgress(100);
        setProcessingStatus("Complete!");
        toast.success("Claim processed with AI!");
      } catch (aiError) {
        console.error("AI Pipeline Failed:", aiError);
        toast.error("AI Analysis failed, sent for manual review.");
        setAiResults({
            pipeline_results: {
                decision: 'manual_review',
                validation_score: 0.0,
                fraud_score: 0.0,
                ai_summary: "AI Analysis unavailable. Pending manual check."
            }
        });
        setProcessingProgress(100);
        setProcessingStatus("Complete (Manual Review)");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit claim. Please try again.");
    }
    setIsLoading(false);
  };

  const handleReset = () => {
    setCurrentStep(0);
    setFormData({
      nicOrPolicy: "",
      policyId: "",
      claimType: "",
      memberId: "",
      mobileNumber: "",
      bankName: "",
      accountNumber: "",
      admissionDate: "",
      dischargeDate: "",
      dateOfTreatment: "",
      claimAmount: "",
    });
    setDocuments([]);
    setReferenceNumber("");
    setPolicies([]);
    setMembers([]);
    setSelectedPolicy(null);
    setSelectedMember(null);
    setAiResults(null);
    setProcessingProgress(0);
    setCurrentClaimId(null);
  };

  const handleResubmit = async () => {
    if (!currentClaimId) return;
    try {
      await api.post(`/claims/${currentClaimId}/resubmit/`);
      setDocuments([]);
      setProcessingProgress(0);
      setProcessingStatus("");
      setAiResults(null);
      setCurrentStep(3);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Resubmission failed.");
    }
  };

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    nextStep();
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-gradient-to-r from-orange-500 to-amber-400 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo variant="dark" onClick={() => navigate("/")} />
          <div className="flex items-center gap-4">
             <LanguageSelector variant="dark" />
             {user && (
                <Button variant="secondary" size="sm" onClick={() => { loginLoading ? null : logout(); navigate('/'); }} className="text-xs bg-white/20 text-white hover:bg-white/30 border-none">
                  Logout
                </Button>
             )}
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {authLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !user ? (
            <div className="max-w-md mx-auto">
              <div className="glass-card p-8 text-center">
                <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
                <p className="text-muted-foreground mt-1">Sign in to access your portal</p>
                <form onSubmit={handleBranchLogin} className="space-y-4 text-left mt-6">
                  <div>
                    <Label>Username</Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="text" placeholder="Enter username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <div>
                    <Label>Password</Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="password" placeholder="Enter password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pl-10" />
                    </div>
                  </div>
                  <Button type="submit" variant="hero" className="w-full" disabled={loginLoading}>
                    {loginLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Sign In
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t.customerPortalBranch}</h1>
                <p className="text-muted-foreground mt-1">{t.submitWithAI}</p>
              </div>
              <div className="flex justify-center items-center gap-4 md:gap-8 mb-8">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex flex-col items-center">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300", i < currentStep && "gradient-primary text-white shadow-md", i === currentStep && "gradient-primary text-white shadow-lg", i > currentStep && "bg-white border-2 border-border text-muted-foreground")}>
                      {i < currentStep ? <CheckCircle className="w-5 h-5" /> : i + 1}
                    </div>
                    <span className={cn("text-xs mt-2 hidden md:block", i === currentStep ? "text-primary font-medium" : "text-muted-foreground")}>{step}</span>
                  </div>
                ))}
              </div>
              <div className="glass-card p-6 md:p-8">
                <AnimatePresence mode="wait">
                  <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
                    {currentStep === 0 && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-xl font-bold text-foreground">{t.selectLanguage}</h2>
                          <p className="text-sm text-muted-foreground mt-1">{t.selectLanguageDesc}</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          {[{ code: "en" as Language, label: t.langEnglish }, { code: "si" as Language, label: t.langSinhala }, { code: "ta" as Language, label: t.langTamil }].map((lang) => (
                            <button key={lang.code} onClick={() => handleLanguageSelect(lang.code)} className="p-6 rounded-xl border-2 border-border text-center transition-all hover:border-primary hover:bg-secondary">
                              <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
                              <p className="font-semibold text-foreground">{lang.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentStep === 1 && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-xl font-bold text-foreground">{t.verifyPolicy}</h2>
                          <p className="text-sm text-muted-foreground mt-1">{t.verifyPolicyDesc}</p>
                        </div>
                        <div>
                          <Label>{t.labelNICPolicy}</Label>
                          <Input placeholder={t.placeholderNICPolicy} value={formData.nicOrPolicy} onChange={(e) => updateFormData("nicOrPolicy", e.target.value)} className="mt-1" />
                        </div>
                        {selectedPolicy && (
                          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="font-medium text-green-700">Policy Verified</span>
                            </div>
                            <div className="text-sm text-green-600 space-y-1">
                              <p>Policy: {selectedPolicy.policy_number}</p>
                              <p>Holder: {selectedPolicy.holder_name}</p>
                              <p>Type: {selectedPolicy.policy_type}</p>
                              <p>OPD Limit: LKR {parseFloat(selectedPolicy.opd_limit.toString()).toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                        {groupInsurance && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-5 h-5 text-blue-600" />
                              <span className="font-medium text-blue-700">Group Insurance Coverage</span>
                            </div>
                            <div className="text-sm text-blue-700 space-y-1">
                              <p><span className="font-medium">Member:</span> {groupInsurance.item_name}</p>
                              <p><span className="font-medium">Document No:</span> {groupInsurance.document_no}</p>
                              <p><span className="font-medium">Sum Insured:</span> LKR {parseFloat(groupInsurance.sum_insured).toLocaleString()}</p>
                              <p><span className="font-medium">Class:</span> {groupInsurance.main_class} &mdash; {groupInsurance.fund_type}</p>
                              <p><span className="font-medium">Commence:</span> {groupInsurance.commence_date}</p>
                            </div>
                            {groupRiders.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-semibold text-blue-600 mb-1">Riders / Additional Coverage</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {groupRiders.map((r) => (
                                    <div key={r.id} className="bg-white border border-blue-100 rounded px-2 py-1 text-xs">
                                      <span className="font-medium">{r.type}</span>
                                      {r.category && <span className="text-muted-foreground ml-1">({r.category})</span>}
                                      <br />
                                      LKR {parseFloat(r.sum_insured).toLocaleString()}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={prevStep}>{t.btnBack}</Button>
                          <Button variant="hero" onClick={verifyPolicy} disabled={!formData.nicOrPolicy || isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {t.btnContinue}
                          </Button>
                        </div>
                      </div>
                    )}

                {/* Step 2: Claim Details */}
                {currentStep === 2 && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-xl font-bold text-foreground">{t.claimDetails}</h2>
                          <p className="text-sm text-muted-foreground mt-1">{t.claimDetailsDesc}</p>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label>{t.labelClaimType} *</Label>
                            <Select value={formData.claimType} onValueChange={(v) => updateFormData("claimType", v)}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder={t.placeholderClaimType} /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="opd">{t.claimTypeOPD}</SelectItem>
                                <SelectItem value="dental">{t.claimTypeDental}</SelectItem>
                                <SelectItem value="spectacle">{t.claimTypeSpectacles}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>{t.labelRelationship} *</Label>
                            <Select value={formData.memberId} onValueChange={(v) => updateFormData("memberId", v)}>
                              <SelectTrigger className="mt-1"><SelectValue placeholder={t.placeholderRelationship} /></SelectTrigger>
                              <SelectContent>
                                {members.map((member) => (
                                  <SelectItem key={member.id} value={member.id.toString()}>
                                    {member.member_name} ({member.relationship})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Claim Amount (LKR) *</Label>
                            <Input type="number" placeholder="0.00" value={formData.claimAmount} onChange={(e) => updateFormData("claimAmount", e.target.value)} className="mt-1" />
                          </div>
                          <div>
                            <Label>{t.labelBankAccount} *</Label>
                            <Input placeholder={t.placeholderBankAccount} value={formData.accountNumber} onChange={(e) => updateFormData("accountNumber", e.target.value)} className="mt-1" required />
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={prevStep}>{t.btnBack}</Button>
                          <Button variant="hero" onClick={nextStep} disabled={!formData.claimType || !formData.memberId || !formData.claimAmount || !formData.accountNumber.trim()}>
                            {t.btnContinue}
                          </Button>
                        </div>
                      </div>
                    )}
                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="text-xl font-bold text-foreground">{t.uploadDocuments}</h2>
                          <p className="text-sm text-muted-foreground mt-1">{t.uploadDocumentsDesc}</p>
                        </div>
                        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-colors">
                          <input type="file" id="file-upload" className="hidden" multiple onChange={handleFileChange} accept="image/*,.pdf" />
                          <label htmlFor="file-upload" className="cursor-pointer">
                            <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-foreground font-medium">{t.dragDropFiles}</p>
                            <p className="text-sm text-muted-foreground mt-1">{t.supportedFormats}</p>
                          </label>
                        </div>
                        {documents.length > 0 && (
                          <div className="space-y-2">
                            {documents.map((doc, i) => (
                              <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-muted-foreground" />
                                  <span className="text-sm text-foreground">{doc.file.name}</span>
                                  {doc.status === 'processing' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                                  {doc.status === 'accepted' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                  {doc.status === 'error' && <X className="w-4 h-4 text-red-500" />}
                                </div>
                                <button onClick={() => removeFile(i)}><X className="w-4 h-4 text-muted-foreground hover:text-destructive" /></button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-3">
                          <Button variant="outline" onClick={prevStep}>{t.btnBack}</Button>
                          <Button variant="hero" onClick={handleSubmit} disabled={documents.length === 0 || isLoading}>
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {t.btnSubmitClaim2}
                          </Button>
                        </div>
                      </div>
                    )}
                    {currentStep === 4 && (
                      <div className="text-center py-8">
                        {isLoading ? (
                          <>
                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
                              <Brain className="w-10 h-10 text-white" />
                            </motion.div>
                            <h2 className="text-xl font-bold text-foreground mb-2">AI Processing Your Claim</h2>
                            <p className="text-muted-foreground mb-4">{processingStatus}</p>
                            <Progress value={processingProgress} className="max-w-md mx-auto" />
                          </>
                        ) : (
                          <>
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={cn("w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6", aiResults?.pipeline_results?.decision === "auto_approve" ? "bg-green-500" : aiResults?.pipeline_results?.decision === "reject" ? "bg-red-500" : "bg-amber-500")}>
                              {aiResults?.pipeline_results?.decision === "auto_approve" ? <CheckCircle className="w-10 h-10 text-white" /> : aiResults?.pipeline_results?.decision === "reject" ? <X className="w-10 h-10 text-white" /> : <AlertCircle className="w-10 h-10 text-white" />}
                            </motion.div>
                            <h2 className="text-2xl font-bold text-foreground mb-2">{t.claimSubmitted}</h2>
                            <div className="bg-muted rounded-xl p-4 inline-block mb-4">
                              <p className="text-sm text-muted-foreground">{t.claimReference}</p>
                              <p className="text-xl font-bold text-primary">{referenceNumber}</p>
                            </div>
                            <p className="text-muted-foreground mb-4">{t.claimReviewMsg}</p>

                            {/* Re-upload option for rejected / manual review — max 3 attempts */}
                            {aiResults?.pipeline_results?.decision !== 'auto_approve' &&
                             (aiResults?.pipeline_results?.attempts_remaining ?? 0) > 0 && (
                              <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 max-w-xs mx-auto">
                                <p className="text-xs text-amber-700 mb-2">
                                  Documents can be re-uploaded up to{' '}
                                  <strong>{aiResults?.pipeline_results?.attempts_remaining}</strong> more time(s).
                                </p>
                                <Button variant="outline" size="sm" onClick={handleResubmit} className="w-full text-amber-700 border-amber-400 hover:bg-amber-100">
                                  Re-upload Documents &amp; Retry
                                </Button>
                              </div>
                            )}

                            {aiResults?.pipeline_results?.decision !== 'auto_approve' &&
                             (aiResults?.pipeline_results?.attempts_remaining ?? 0) === 0 && (
                              <p className="text-xs text-red-500 mb-4">Maximum resubmissions reached. No further retries allowed.</p>
                            )}

                            <Button variant="hero" onClick={handleReset} className="w-full max-w-xs">{t.btnSubmitAnother}</Button>
                          </>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default BranchPortal;
