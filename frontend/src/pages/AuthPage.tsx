import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LanguageSelector from "@/components/shared/LanguageSelector";
import { toast } from "sonner";
import api from "../services/api"; 
import { useAuth } from "@/hooks/useAuth"; // Import the hook we just made

const AuthPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth(); // Get the login function from our global hook
  const [isLoading, setIsLoading] = useState(false);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 1. Call Backend
      const response = await api.post("/login/", {
        username: username,
        password: password,
      });

      // 2. Update Global State using our hook
      // The response.data now contains { access, refresh, role, username }
      login(response.data);

      toast.success(`Welcome back, ${response.data.username}!`);

      // 3. Redirect based on Role
      const role = response.data.role;

      if (role === 'branch') {
        navigate("/branch");
      } else if (role === 'admin') {
        navigate("/admin");  
      } else {
        navigate("/");       
      }

    } catch (error: any) {
      console.error("Login Failed:", error);
      const errorMessage = error.response?.data?.detail || "Invalid username or password";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background */}
      {/* <div className="absolute inset-0 bg-gradient-to-br from-green-100 via-background to-teal-100" /> */}
      {/* <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-br from-green-200/50 to-transparent" /> */}
      <div className="absolute bottom-0 right-0 w-full h-full bg-teal-200/50" />

      {/* Top Bar */}
      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector variant="light" />
      </div>

      {/* Login Card */}
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-card/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 text-center border border-border/50">
            
            <div className="flex justify-center mb-6">
               <img 
                 src="/opd-logo.png" 
                 alt="OPD Logo" 
                 className="h-24 w-auto object-contain"
               />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground mb-8">
              Sign in to OPD Smart Claims
            </p>

            <form onSubmit={handleLogin} className="space-y-5 text-left">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground font-medium">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text" 
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-border/50 bg-background/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12 rounded-xl border-border/50 bg-background/50"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-600 hover:to-emerald-500 text-white shadow-lg" 
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default AuthPage;