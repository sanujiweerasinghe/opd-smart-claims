import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Mail, Lock, Loader2, User as UserIcon, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/shared/Navbar";
import ClaimHistory from "@/components/portal/ClaimHistory";
import NewClaimWizard from "@/components/portal/NewClaimWizard";
import { useAuth } from "@/hooks/useAuth";
import api from "@/services/api"; 
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  // phone can be optional
});

const DigitalPortal = () => {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  // We keep the "fullName" state to preserve the UI input, 
  // though we might not send it if backend doesn't need it yet.
  const [fullName, setFullName] = useState(""); 
  
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [activeTab, setActiveTab] = useState("my-claims");
  
  const navigate = useNavigate();
  const { user, loading, login, logout } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "branch") {
        navigate("/branch");
      }
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      loginSchema.parse({ username, password });
      const response = await api.post("/login/", {
        username: username,
        password: password,
      });
      login(response.data);
      toast.success("Welcome back!");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        console.error("Login error", err);
        const msg = err.response?.data?.detail || "Invalid username or password";
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Validate
      signupSchema.parse({ email, password, username });

      // Call Django API
      await api.post("/register/", {
        username: username,
        email: email,
        password: password,
        role: 'customer'
      });
      toast.success("Account created successfully! You can now log in.");
      setAuthMode("login");
      setPassword("");
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        console.error("Signup error", err);
        const errorData = err.response?.data;
        if(errorData) {
           const firstKey = Object.keys(errorData)[0];
           toast.error(`${firstKey}: ${errorData[firstKey]}`);
        } else {
           toast.error("An error occurred during signup");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    logout();
    navigate("/");
    toast.success("Logged out successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar variant="gradient" />
        <main className="container mx-auto px-4 py-16 flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="glass-card p-8 text-center">
              <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-6">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Digital Portal</h1>
              <p className="text-muted-foreground mb-6">
                {authMode === "login" ? "Sign in to access your account" : "Create a new account"}
              </p>
              <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as "login" | "signup")} className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 text-left mt-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <div className="relative mt-1">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="username" type="text" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4 text-left mt-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input id="fullName" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="usernameSignup">Username</Label>
                      <Input id="usernameSignup" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1" required />
                    </div>
                    <div>
                      <Label htmlFor="emailSignup">Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="emailSignup" type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="passwordSignup">Password</Label>
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="passwordSignup" type="password" placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    <Button type="submit" variant="hero" className="w-full" disabled={isLoading}>
                      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              <p className="text-xs text-muted-foreground mt-4">By continuing, you agree to our Terms of Service and Privacy Policy</p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="gradient" showLogout onLogout={handleLogout} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Digital Portal</h1>
          <p className="text-muted-foreground mt-1">Manage your claims online</p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="my-claims">My Claims</TabsTrigger>
            <TabsTrigger value="new-claim">New Claim</TabsTrigger>
          </TabsList>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <TabsContent value="my-claims" className="mt-0"><ClaimHistory /></TabsContent>
              <TabsContent value="new-claim" className="mt-0"><NewClaimWizard onComplete={() => setActiveTab("my-claims")} /></TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>
    </div>
  );
};

export default DigitalPortal;
