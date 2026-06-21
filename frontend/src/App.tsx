import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/lib/i18n";
import { AuthProvider } from "@/hooks/useAuth";

// Import Pages
import LandingPage from "@/pages/LandingPage";
import AuthPage from "@/pages/AuthPage";
import DigitalPortal from "@/pages/DigitalPortal";
import ClaimDetails from "@/pages/ClaimDetails";
import BranchPortal from "@/pages/BranchPortal";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminClaimReview from "@/pages/AdminClaimReview";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          
          <BrowserRouter>
            <Routes>
              {/* --- Public Routes --- */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* --- Customer Portal --- */}
              <Route path="/digital-portal" element={<DigitalPortal />} />
              {/* Route for customer to view their specific claim details */}
              <Route path="/digital-portal/claim/:claimId" element={<ClaimDetails />} />

              {/* --- Branch Portal --- */}
              <Route path="/branch" element={<BranchPortal />} />

              {/* --- Admin Portal --- */}
              <Route path="/admin" element={<AdminDashboard />} />
              
              {/* THIS IS THE CRITICAL ROUTE FOR THE EYE BUTTON: */}
              <Route path="/admin/claim/:claimId" element={<AdminClaimReview />} />

              {/* --- Fallback (404) --- */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;