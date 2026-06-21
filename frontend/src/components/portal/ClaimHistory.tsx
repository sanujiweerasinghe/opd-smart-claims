import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, Clock, XCircle, AlertCircle, 
  Brain, Shield, FileText, ChevronRight, RefreshCw, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api";

// Define the Claim type matching the Django response
interface Claim {
  id: number;
  reference_number: string;
  status: string; // 'pending', 'approved', 'rejected'
  claim_type: string;
  claim_amount: string; // Django sends decimals as strings
  created_at: string;
  
  // Optional AI fields from backend
  risk_level?: string;
  fraud_score?: number;
  ai_summary?: string;
}

const ClaimHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    approved: 0,
    processing: 0,
    rejected: 0,
    totalClaimed: 0,
    totalApproved: 0,
  });

  useEffect(() => {
    if (user) {
      fetchClaims();
    }
  }, [user]);

  const fetchClaims = async () => {
    try {
      setIsLoading(true);
      // Call Django API 
      const response = await api.get('/claims/');
      const data: Claim[] = response.data;
      
      setClaims(data);
      
      // Calculate stats locally
      const approved = data.filter(c => c.status === "approved").length;
      const processing = data.filter(c => c.status === "pending").length;
      const rejected = data.filter(c => c.status === "rejected").length;
      
      // Sum up amounts (parsing string to float)
      const totalClaimed = data.reduce((sum, c) => sum + (parseFloat(c.claim_amount) || 0), 0);
      
      // Estimate approved amount (Only count if status is approved)
      const totalApproved = data.reduce((sum, c) => 
        c.status === "approved" ? sum + (parseFloat(c.claim_amount) || 0) : sum, 0);
      
      setStats({ approved, processing, rejected, totalClaimed, totalApproved });
    } catch (error) {
      console.error("Error fetching claims:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "pending":
        return <Clock className="w-5 h-5 text-emerald-600" />;
      case "rejected":
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved: "bg-green-100 text-green-700 hover:bg-green-200",
      pending: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
      rejected: "bg-red-100 text-red-700 hover:bg-red-200",
    };
    return (
      <Badge variant="outline" className={cn("capitalize border-transparent", styles[status] || "bg-muted text-muted-foreground")}>
        {status}
      </Badge>
    );
  };

  const getRiskBadge = (riskLevel?: string) => {
    if (!riskLevel || riskLevel === 'Unknown') return null;
    
    if (riskLevel === "High") {
      return (
        <Badge variant="destructive" className="text-xs ml-2">
          <Shield className="w-3 h-3 mr-1" /> High Risk
        </Badge>
      );
    }
    if (riskLevel === "Low") {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200 ml-2">
          <Shield className="w-3 h-3 mr-1" /> Low Risk
        </Badge>
      );
    }
    return (
       <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 ml-2">
          <Shield className="w-3 h-3 mr-1" /> Medium Risk
        </Badge>
    );
  };

  const quickStats = [
    { label: "Approved", value: stats.approved, bgColor: "bg-green-100", textColor: "text-green-600", icon: CheckCircle },
    { label: "Processing", value: stats.processing, bgColor: "bg-emerald-100", textColor: "text-emerald-600", icon: Clock },
    { label: "Total Approved", value: `LKR ${stats.totalApproved.toLocaleString()}`, bgColor: "bg-blue-50", textColor: "text-blue-600", icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="glass-card p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading your claims...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="glass-card p-6 text-center">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Please Log In</h3>
        <p className="text-muted-foreground">Log in to view your claim history</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickStats.map((stat, i) => (
            <div key={i} className={cn("glass-card p-4 text-center flex flex-col items-center justify-center", stat.bgColor)}>
              <stat.icon className={cn("w-6 h-6 mb-2", stat.textColor)} />
              <p className={cn("text-2xl font-bold", stat.textColor)}>{stat.value}</p>
              <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
            </div>
          ))}
      </div>

      {/* Claim History List */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">Claim History</h2>
            <p className="text-sm text-muted-foreground">View and track all your submitted claims</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchClaims}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {claims.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-1">No Claims Yet</h3>
            <p className="text-muted-foreground">Submit your first claim to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="group flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-teal-200 hover:shadow-md bg-white transition-all cursor-pointer"
                onClick={() => navigate(`/digital-portal/claim/${claim.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1">{getStatusIcon(claim.status)}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">{claim.reference_number}</span>
                      {getStatusBadge(claim.status)}
                      {getRiskBadge(claim.risk_level)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="capitalize font-medium text-gray-700">{claim.claim_type}</span>
                      <span>â€¢</span>
                      {new Date(claim.created_at).toLocaleDateString()}
                    </p>
                    
                    {claim.ai_summary && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground bg-gray-50 px-2 py-1 rounded w-fit">
                        <Brain className="w-3 h-3 text-teal-500" />
                        <span className="line-clamp-1 max-w-[250px]">{claim.ai_summary}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="font-bold text-foreground text-lg">
                        LKR {parseFloat(claim.claim_amount).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Claimed</p>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClaimHistory;