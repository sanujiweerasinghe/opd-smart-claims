import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Search, Download, Filter, User as UserIcon, ScanLine, ShieldAlert, TrendingUp, RefreshCw, FileText, AlertTriangle, Shield, Activity, Upload, BookOpen, Trash2, CheckCircle, XCircle, Clock, GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Navbar from "@/components/shared/Navbar";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { motion } from "framer-motion";
import api from "@/services/api"; 
import { useAuth } from "@/hooks/useAuth"; 
import { toast } from "sonner";

// Types
interface DashboardStats {
  total_claims: number;
  high_risk: number;
  fraud_alerts: number;
  avg_risk_score: number;
  
  // OCR Stats
  avg_ocr: number;
  ocr_high: number;
  ocr_medium: number;
  ocr_low: number;

  // Fraud Stats
  fraud_flagged: number;
  fraud_suspicious: number;
  fraud_clean: number;

  // Processing Stats (Updated)
  automation_rate: number;
  auto_approved: number;
  manual_review: number;
  pending: number;
  rejected: number; // <--- New Field
}

interface Claim {
  id: number;
  reference_number: string;
  claim_type: string;
  claim_amount: string;
  status: string;
  risk_level: string;
  fraud_score: number;
  validation_score: number;
  created_at: string;
  patient_name: string;
}

interface PolicyRuleDoc {
  id: number;
  policy_number: string;
  holder_name: string;
  policy_type: string;
  cover_start: string | null;
  cover_end: string | null;
  extraction_status: 'pending' | 'processing' | 'success' | 'failed';
  extraction_error: string;
  is_active: boolean;
  uploaded_at: string;
  uploaded_by: string;
}

interface OverlapEntry {
  type: string;
  severity: 'error' | 'warning';
  policy_type: string;
  message: string;
  document_ids: number[];
  documents?: object[];
  claim_key?: string;
  limits?: Record<string, number>;
}

interface OverlapReport {
  total_documents_analysed: number;
  overlap_count: number;
  has_errors: boolean;
  has_warnings: boolean;
  overlaps: OverlapEntry[];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, login, logout, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Policy Rules (Dynamic RAG)
  const [policyDocs, setPolicyDocs] = useState<PolicyRuleDoc[]>([]);
  const [policyDocsLoading, setPolicyDocsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Overlap analysis
  const [overlapReport, setOverlapReport] = useState<OverlapReport | null>(null);
  const [overlapLoading, setOverlapLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && (user.role === 'admin' || (user.role as string) === 'staff')) {
      fetchDashboardData();
      fetchPolicyDocs();
    }
  }, [user, authLoading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const response = await api.post('/login/', { username, password });
      const userData = response.data;
      
      if (userData.role !== 'admin' && (userData.role as string) !== 'staff') {
        toast.error("Access Denied: Admin privileges required.");
        setLoginLoading(false);
        return;
      }
      
      login(userData); 
      toast.success("Admin Login Successful");
    } catch (error) {
      toast.error("Invalid credentials");
    } finally {
      setLoginLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const statsRes = await api.get('/admin/stats/');
      setStats(statsRes.data);
      const claimsRes = await api.get('/admin/claims/');
      setClaims(claimsRes.data);
    } catch (error) {
      console.error("Dashboard Error:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPolicyDocs = async () => {
    try {
      setPolicyDocsLoading(true);
      const res = await api.get('/admin/policy-rules/');
      setPolicyDocs(res.data);
    } catch (e) {
      console.error("Failed to load policy documents", e);
    } finally {
      setPolicyDocsLoading(false);
    }
  };

  const handlePolicyUpload = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('pdf_file', uploadFile);
    try {
      setUploading(true);
      await api.post('/admin/policy-rules/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Policy rules extracted and saved!');
      setUploadFile(null);
      // reset file input
      const input = document.getElementById('policy-pdf-input') as HTMLInputElement;
      if (input) input.value = '';
      fetchPolicyDocs();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const togglePolicyDoc = async (id: number) => {
    try {
      const res = await api.patch(`/admin/policy-rules/${id}/toggle/`);
      setPolicyDocs(prev => prev.map(d => d.id === id ? { ...d, is_active: res.data.is_active } : d));
    } catch {
      toast.error('Failed to toggle policy document.');
    }
  };

  const deletePolicyDoc = async (id: number) => {
    try {
      await api.delete(`/admin/policy-rules/${id}/`);
      setPolicyDocs(prev => prev.filter(d => d.id !== id));
      toast.success('Policy document deleted.');
    } catch {
      toast.error('Failed to delete policy document.');
    }
  };

  const checkOverlaps = async () => {
    try {
      setOverlapLoading(true);
      const res = await api.get('/admin/policy-rules/overlaps/');
      setOverlapReport(res.data);
    } catch {
      toast.error('Failed to run overlap check.');
    } finally {
      setOverlapLoading(false);
    }
  };

  // --- LOGIN SCREEN ---
  if (!user || (user.role !== 'admin' && (user.role as string) !== 'staff')) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="gradient" />
        <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 rounded-full gradient-primary mx-auto mb-6 flex items-center justify-center">
                <UserIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t.adminLogin}</h1>
              <p className="text-muted-foreground mb-6">{t.adminLoginSubtitle}</p>
              
              <form onSubmit={handleLogin} className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label htmlFor="username">{t.username}</Label>
                  <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t.password}</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading ? "Verifying..." : t.login}
                </Button>
              </form>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // --- HELPERS ---
  const getRiskBadge = (level: string) => {
    const colors: any = {
      Low: "bg-green-100 text-green-700 hover:bg-green-100/80",
      Medium: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80",
      High: "bg-red-100 text-red-700 hover:bg-red-100/80",
      Unknown: "bg-gray-100 text-gray-600 hover:bg-gray-100/80"
    };
    return (
      <Badge variant="outline" className={cn("text-xs border-transparent", colors[level] || colors.Unknown)}>
        {level}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      approved: "bg-green-100 text-green-700 border-green-200",
      pending: "bg-emerald-100 text-emerald-700 border-emerald-200",
      rejected: "bg-red-100 text-red-700 border-red-200",
    };
    return (
      <Badge variant="outline" className={cn("text-xs capitalize", styles[status] || "bg-gray-100")}>
        {status}
      </Badge>
    );
  };

  const filteredClaims = claims.filter(c => {
    const matchesSearch = c.reference_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="gradient" showLogout onLogout={() => { logout(); navigate("/"); }} />

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">AI-powered claims management & fraud detection</p>
          </div>
          <Button variant="outline" onClick={fetchDashboardData} disabled={isLoading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* --- TOP STATS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="Total Claims" 
            value={stats?.total_claims || 0} 
            subtitle="All submitted claims"
            icon={<FileText className="w-5 h-5 text-primary" />}
            iconBg="bg-primary/10"
            valueColor="text-primary"
          />
          <StatCard 
            title="High Risk" 
            value={stats?.high_risk || 0} 
            subtitle="Require immediate review"
            icon={<AlertTriangle className="w-5 h-5 text-destructive" />}
            iconBg="bg-destructive/10"
            valueColor="text-destructive"
          />
          <StatCard 
            title="Fraud Alerts" 
            value={stats?.fraud_alerts || 0} 
            subtitle="Flagged for verification"
            icon={<Shield className="w-5 h-5 text-emerald-500" />}
            iconBg="bg-emerald-100"
            valueColor="text-emerald-500"
          />
          <StatCard 
            title="Avg Risk Score" 
            value={stats?.avg_risk_score || 0} 
            subtitle="Low risk overall"
            icon={<Activity className="w-5 h-5 text-green-500" />}
            iconBg="bg-green-100"
            valueColor="text-green-500"
          />
        </div>

        {/* --- DETAILED METRICS ROW --- */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <DetailedMetricCard 
            title="OCR Accuracy"
            mainValue={`${stats?.avg_ocr || 0}%`}
            subtitle="Average document recognition rate"
            icon={<ScanLine className="w-5 h-5 text-primary" />}
            mainColor="text-primary"
            items={[
              { label: "High Confidence (90%+)", value: stats?.ocr_high || 0 },
              { label: "Medium (50-89%)", value: stats?.ocr_medium || 0 },
              { label: "Low (<50%)", value: stats?.ocr_low || 0 },
            ]}
          />
          
          <DetailedMetricCard 
            title="Fraud Detection"
            mainValue={`${stats?.fraud_alerts || 0} Alerts`}
            subtitle="AI-powered fraud patterns detected"
            icon={<ShieldAlert className="w-5 h-5 text-destructive" />}
            mainColor="text-destructive"
            items={[
              { label: "Flagged (High Risk)", value: stats?.fraud_flagged || 0 },
              { label: "Suspicious", value: stats?.fraud_suspicious || 0 },
              { label: "Clean", value: stats?.fraud_clean || 0 },
            ]}
          />

          <DetailedMetricCard 
            title="Processing Status"
            mainValue={`${stats?.automation_rate || 0}% Auto`}
            subtitle="AI automation rate"
            icon={<TrendingUp className="w-5 h-5 text-green-500" />}
            mainColor="text-primary"
            items={[
              { label: "Auto-Approved", value: stats?.auto_approved || 0 },
              { label: "Pending", value: stats?.pending || 0 },
              { label: "Manual Review", value: stats?.manual_review || 0 },
              { label: "Rejected", value: stats?.rejected || 0 }, // <--- ADDED THIS
            ]}
          />
        </div>

        {/* --- CLAIMS TABLE --- */}
        <div className="glass-card p-6">
          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div>
                <h2 className="text-xl font-bold text-foreground">All Claims</h2>
                <p className="text-sm text-muted-foreground">Review and manage submitted claims</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by ID, Customer..." 
                  className="pl-9" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchDashboardData}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[120px]">Claim ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Fraud Check</TableHead>
                  <TableHead>OCR</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12">Loading...</TableCell></TableRow>
                ) : filteredClaims.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-12">No claims found.</TableCell></TableRow>
                ) : (
                  filteredClaims.map((claim) => (
                    <TableRow key={claim.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-primary">{claim.reference_number}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                            <span className="font-medium text-foreground">{claim.patient_name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">ID Verified</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">{claim.claim_type}</TableCell>
                      <TableCell>LKR {parseFloat(claim.claim_amount).toLocaleString()}</TableCell>
                      <TableCell>{getRiskBadge(claim.risk_level)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`
                            ${claim.fraud_score > 0.5 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}
                        `}>
                            {claim.fraud_score > 0.5 ? 'Suspicious' : 'Clean'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                            {Math.round(claim.validation_score)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(claim.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => navigate(`/admin/claim/${claim.id}`)}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* POLICY RULES & OVERLAP CHECKER (HIDDEN)                            */}
        {/* ------------------------------------------------------------------ */}
        {false && (
          <>
        <div className="glass-card p-6 mt-8">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Policy Rules</h2>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
              RAG Knowledge Base
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Upload a OPD policy PDF â€” Gemini extracts coverage rules that the AI claim checker will use immediately.
            DB rules override the static JSON file for matching policy types.
          </p>

          {/* Upload Row */}
          <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-muted/40 rounded-xl border border-dashed border-border">
            <input
              id="policy-pdf-input"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById('policy-pdf-input')?.click()}
            >
              <FileText className="w-4 h-4 mr-2" />
              {uploadFile ? uploadFile.name : 'Choose PDF...'}
            </Button>

            {uploadFile && (
              <Button
                size="sm"
                onClick={handlePolicyUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Extracting rules...</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Upload &amp; Extract Rules</>
                )}
              </Button>
            )}

            {uploadFile && !uploading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setUploadFile(null);
                  const input = document.getElementById('policy-pdf-input') as HTMLInputElement;
                  if (input) input.value = '';
                }}
              >
                Cancel
              </Button>
            )}

            {uploading && (
              <p className="text-xs text-muted-foreground italic">
                Gemini is reading the PDF â€” this may take 15â€“30 seconds.
              </p>
            )}
          </div>

          {/* Table */}
          {policyDocsLoading ? (
            <div className="text-center py-10 text-muted-foreground">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin opacity-40" />
              Loading policy documents...
            </div>
          ) : policyDocs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="font-medium">No policy documents uploaded yet.</p>
              <p className="text-xs mt-1">Upload a OPD policy PDF above â€” the static JSON rules remain active as a fallback.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Policy No.</TableHead>
                    <TableHead>Holder</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cover Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policyDocs.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/50">
                      <TableCell className="font-mono text-sm">{doc.policy_number || 'â€”'}</TableCell>
                      <TableCell>
                        <span className="font-medium">{doc.holder_name || 'â€”'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{doc.policy_type}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {doc.cover_start && doc.cover_end
                          ? `${doc.cover_start} â†’ ${doc.cover_end}`
                          : 'â€”'}
                      </TableCell>
                      <TableCell>
                        {doc.extraction_status === 'success' && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                            <CheckCircle className="w-3 h-3" /> Success
                          </Badge>
                        )}
                        {doc.extraction_status === 'failed' && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1" title={doc.extraction_error}>
                            <XCircle className="w-3 h-3" /> Failed
                          </Badge>
                        )}
                        {(doc.extraction_status === 'processing' || doc.extraction_status === 'pending') && (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                            <Clock className="w-3 h-3" /> {doc.extraction_status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div>{doc.uploaded_at}</div>
                        <div className="opacity-60">by {doc.uploaded_by}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <button
                          onClick={() => togglePolicyDoc(doc.id)}
                          title={doc.is_active ? 'Active â€” click to deactivate' : 'Inactive â€” click to activate'}
                          className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                            doc.is_active ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              doc.is_active ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePolicyDoc(doc.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* OVERLAP / CONFLICT CHECKER                                         */}
        {/* ------------------------------------------------------------------ */}
        <div className="glass-card p-6 mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <GitMerge className="w-5 h-5 text-emerald-500" />
              <div>
                <h2 className="text-xl font-bold text-foreground">Rule Overlap Checker</h2>
                <p className="text-sm text-muted-foreground">
                  Detect conflicting rules across your uploaded policy documents.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkOverlaps}
              disabled={overlapLoading}
            >
              {overlapLoading
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analysing...</>
                : <><GitMerge className="w-4 h-4 mr-2" />Run Overlap Check</>
              }
            </Button>
          </div>

          {!overlapReport && !overlapLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <GitMerge className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Click <strong>Run Overlap Check</strong> to analyse your {policyDocs.length} uploaded policy document{policyDocs.length !== 1 ? 's' : ''}.</p>
            </div>
          )}

          {overlapReport && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="flex flex-wrap gap-3">
                <Badge variant="outline" className="bg-muted text-foreground">
                  {overlapReport.total_documents_analysed} documents analysed
                </Badge>
                {overlapReport.overlap_count === 0 ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                    <CheckCircle className="w-3 h-3" /> No conflicts found â€” rules are clean
                  </Badge>
                ) : (
                  <>
                    {overlapReport.has_errors && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1">
                        <XCircle className="w-3 h-3" />
                        {overlapReport.overlaps.filter(o => o.severity === 'error').length} error(s)
                      </Badge>
                    )}
                    {overlapReport.has_warnings && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {overlapReport.overlaps.filter(o => o.severity === 'warning').length} warning(s)
                      </Badge>
                    )}
                  </>
                )}
              </div>

              {/* Individual overlap cards */}
              {overlapReport.overlaps.map((o, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 ${
                    o.severity === 'error'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {o.severity === 'error'
                      ? <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                      : <AlertTriangle className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${
                          o.severity === 'error' ? 'text-red-600' : 'text-emerald-600'
                        }`}>
                          {o.type.replace(/_/g, ' ')}
                        </span>
                        <Badge variant="outline" className="text-xs py-0">{o.policy_type}</Badge>
                        {o.claim_key && (
                          <Badge variant="secondary" className="text-xs py-0">{o.claim_key}</Badge>
                        )}
                      </div>
                      <p className={`text-sm ${o.severity === 'error' ? 'text-red-800' : 'text-emerald-800'}`}>
                        {o.message}
                      </p>
                      <p className="text-xs mt-1 opacity-70">
                        Affected document IDs: #{o.document_ids.join(', #')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
          </>
        )}

      </main>
    </div>
  );
};

// --- RESTORED GLASS-CARD COMPONENTS ---

const StatCard = ({ title, value, subtitle, icon, iconBg, valueColor }: any) => (
  <div className="glass-card p-6 flex flex-col justify-between h-full">
    <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${iconBg || "bg-muted"}`}>
            {icon}
        </div>
    </div>
    <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <h3 className={cn("text-3xl font-bold mt-1", valueColor || "text-foreground")}>{value}</h3>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  </div>
);

const DetailedMetricCard = ({ title, mainValue, subtitle, icon, mainColor, items }: any) => (
  <div className="glass-card p-6">
    <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold text-foreground">{title}</h3>
    </div>
    
    <div className="mb-6">
        <h2 className={cn("text-4xl font-bold mb-1", mainColor)}>{mainValue}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>

    <div className="space-y-3">
        {items.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold text-foreground">{item.value}</span>
            </div>
        ))}
    </div>
  </div>
);

export default AdminDashboard;