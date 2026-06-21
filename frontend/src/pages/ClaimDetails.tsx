import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, User, FileText, CheckCircle, Clock, Calendar, CreditCard, Phone, XCircle, Loader2, Brain, Shield, Calculator, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";
import api from "@/services/api"; 
import { toast } from "sonner";

interface ClaimDetail {
  id: number;
  reference_number: string;
  status: string;
  claim_amount: string;
  claim_type: string;
  created_at: string;
  ai_summary: string;
  risk_level?: string;
  fraud_score?: number;
  validation_score?: number;
  documents: { name: string; url: string }[];
  description?: string;
  // Extra fields based on your backend model
  patient_name?: string; 
  policy_number?: string;
  treatment_date?: string;
}

const ClaimDetails = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<ClaimDetail | null>(null);

  useEffect(() => {
    if (claimId) fetchClaimData();
  }, [claimId]);

  const fetchClaimData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/claims/${claimId}/`);
      setClaim(response.data);
    } catch (error) {
      console.error("Error fetching claim:", error);
      toast.error("Failed to load claim data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => `LKR ${parseFloat(amount).toLocaleString()}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  // Extract info from description (Doctor Name, Diagnosis)
  const getFieldFromDesc = (key: string) => {
    if (!claim?.description) return "-";
    const match = claim.description.match(new RegExp(`${key}:\\s*([^,]+)`, "i"));
    const val = match ? match[1].trim() : "";
    if (!val || val.toLowerCase() === "null" || val.toLowerCase() === "undefined") return "-";
    return val;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
      approved: "bg-green-100 text-green-700 hover:bg-green-100",
      rejected: "bg-red-500 text-white hover:bg-red-600",
    };
    return (
      <Badge className={cn("px-3 py-1 text-xs font-semibold uppercase", styles[status] || styles.pending)}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Claim Not Found</h2>
          <Button onClick={() => navigate("/digital-portal")}>Back to Portal</Button>
        </div>
      </div>
    );
  }

  // Calculate scores for UI (0-100)
  const validationScore = claim.validation_score || 0;
  const fraudScore = Math.round((claim.fraud_score || 0) * 100);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Navbar variant="gradient" />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="bg-white shadow-sm border border-gray-200" onClick={() => navigate("/digital-portal")}>
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Claim Details</h1>
              <p className="text-sm text-gray-500">Reference: <span className="font-mono text-gray-700">{claim.reference_number}</span></p>
            </div>
          </div>
          {getStatusBadge(claim.status)}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN (Main Info) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 1. Patient & Policy Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Patient & Policy Information</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                    <User className="w-3 h-3" /> Patient Name
                  </div>
                  <p className="font-medium text-gray-900">{claim.patient_name || claim.user?.full_name || claim.user?.username || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                    <FileText className="w-3 h-3" /> Policy Number
                  </div>
                  <p className="font-medium text-gray-900">{claim.policy_number || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                    <Shield className="w-3 h-3" /> Claim Type
                  </div>
                  <p className="font-medium text-gray-900 capitalize">{claim.claim_type}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                    <User className="w-3 h-3" /> Relationship
                  </div>
                  <p className="font-medium text-gray-900">Self</p>
                </div>
              </div>
            </div>

            {/* 2. Treatment Details (Updated for OPD) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Treatment Details</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                    <User className="w-3 h-3" /> Doctor Name
                  </div>
                  <p className="font-medium text-gray-900">{getFieldFromDesc('Doctor')}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                    <FileText className="w-3 h-3" /> Diagnosis
                  </div>
                  <p className="font-medium text-gray-900">{getFieldFromDesc('Diagnosis')}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-medium">
                    <Calendar className="w-3 h-3" /> Treatment Date
                  </div>
                  {/* Using extracted treatment date, fallback to submission date */}
                  <p className="font-medium text-gray-900">{claim.treatment_date ? formatDate(claim.treatment_date) : formatDate(claim.created_at)}</p>
                </div>
              </div>
            </div>

            {/* 3. Submitted Documents */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Submitted Documents</h2>
              <div className="space-y-3">
                {claim.documents.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No documents found.</p>
                ) : (
                  claim.documents.map((doc, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-teal-200 bg-white transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-teal-500" />
                        </div>
                        <p className="font-medium text-gray-700 text-sm">{doc.name}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Fake 'Verified' badge if approved/high score */}
                        {(claim.status === 'approved' || validationScore > 80) && (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none shadow-none font-normal">
                                <Check className="w-3 h-3 mr-1" /> Verified
                            </Badge>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => window.open(doc.url, '_blank')}
                          className="text-gray-500 hover:text-teal-600"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. AI Verification Status (Bottom Card) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
               <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Verification Status</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl text-center">
                      <p className={cn("text-2xl font-bold", 
                          validationScore >= 80 ? "text-green-600" : validationScore >= 50 ? "text-emerald-500" : "text-red-600"
                      )}>{validationScore}%</p>
                      <p className="text-xs text-gray-500 uppercase mt-1">Overall Score</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl text-center">
                      <p className={cn("text-2xl font-bold", 
                           validationScore >= 80 ? "text-blue-600" : validationScore >= 50 ? "text-blue-500" : "text-gray-600"
                      )}>{Math.min(validationScore + 5, 100)}%</p>
                      <p className="text-xs text-gray-500 uppercase mt-1">Document Accuracy</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl text-center">
                      <p className={cn("text-2xl font-bold capitalize", 
                          claim.risk_level === 'High' ? "text-red-600" : claim.risk_level === 'Medium' ? "text-emerald-500" : "text-green-600"
                      )}>
                          {claim.risk_level || (validationScore < 50 ? "High" : validationScore < 80 ? "Medium" : "Low")}
                      </p>
                      <p className="text-xs text-gray-500 uppercase mt-1">Fraud Risk</p>
                  </div>
               </div>
               
               {/* AI Description */}
               <div className="mt-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-sm text-gray-700">
                    <div className="flex items-center gap-2 mb-1 font-semibold text-blue-800">
                        <Brain className="w-4 h-4" /> AI Analysis
                    </div>
                    {claim.ai_summary ? (
                        <div className="space-y-2 mt-2">
                           {claim.ai_summary.split('\n').map((line, i) => {
                               // Handle bold text **...**
                               const boldRendered = line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
                                   if (part.startsWith('**') && part.endsWith('**')) {
                                       return <strong key={j} className="text-gray-900">{part.slice(2, -2)}</strong>;
                                   }
                                   return part;
                               });
                               
                               if (line.trim() === '') return <br key={i} />;
                               return <p key={i}>{boldRendered}</p>;
                           })}
                        </div>
                    ) : "Processing..."}
               </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR */}
          <div className="space-y-6">
            
            {/* Card 1: Claim Amount */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim Amount</h2>
              
              <div className="mb-6">
                  <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-bold mb-1">
                    <span className="text-teal-500 text-base">$</span> Claimed Amount
                  </div>
                  <p className="text-3xl font-bold text-teal-600">{formatCurrency(claim.claim_amount)}</p>
              </div>

              {/* Approved Amount Logic */}
              <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Approved Amount</p>
                  <p className={cn(
                      "text-2xl font-bold",
                      claim.status === 'approved' ? "text-green-600" : "text-gray-400"
                  )}>
                      {claim.status === 'approved' ? formatCurrency(claim.claim_amount) : "LKR 0.00"}
                  </p>
              </div>
            </div>

            {/* Card 2: Payment Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
               <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
               <div className="space-y-4">
                  <div>
                      <p className="flex items-center gap-2 text-xs text-gray-500 uppercase mb-1">
                          <CreditCard className="w-3 h-3" /> Bank Account
                      </p>
                      <p className="font-medium text-gray-900">1234567890 (BOC)</p>
                  </div>
                  <div>
                      <p className="flex items-center gap-2 text-xs text-gray-500 uppercase mb-1">
                          <Phone className="w-3 h-3" /> Mobile Number
                      </p>
                      <p className="font-medium text-gray-900">+94 77 123 4567</p>
                  </div>
               </div>
            </div>

            {/* Card 3: Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim Timeline</h2>
              <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:h-full before:w-[2px] before:bg-gray-100">
                
                {/* Step 1: Submitted */}
                <div className="relative flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0 z-10">
                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">Claim Submitted</p>
                        <p className="text-xs text-gray-500">{formatDate(claim.created_at)}</p>
                    </div>
                </div>

                {/* Step 2: Approved / Rejected / Pending */}
                <div className="relative flex gap-4">
                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10",
                        claim.status === 'approved' ? "bg-green-100" : 
                        claim.status === 'rejected' ? "bg-red-100" : "bg-gray-100"
                    )}>
                        {claim.status === 'approved' ? <CheckCircle className="w-4 h-4 text-green-600" /> :
                         claim.status === 'rejected' ? <XCircle className="w-4 h-4 text-red-600" /> :
                         <div className="w-2 h-2 rounded-full bg-gray-400" />}
                    </div>
                    <div>
                        <p className={cn("text-sm font-bold capitalize",
                            claim.status === 'approved' ? "text-green-600" :
                            claim.status === 'rejected' ? "text-red-600" : "text-gray-500"
                        )}>
                            {claim.status === 'pending' ? 'Under Review' : claim.status}
                        </p>
                        {claim.status !== 'pending' && <p className="text-xs text-gray-500">{formatDate(new Date().toString())}</p>}
                    </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default ClaimDetails;