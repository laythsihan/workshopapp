import React, { useState } from "react";
import { supabase } from "../lib/supabase.js";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Blocks, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let result;
    
    if (isSignUp) {
      // Create new account
      result = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      });
    } else {
      // Existing user login
      result = await supabase.auth.signInWithPassword({ email, password });
    }
    
    const { data, error } = result;

    if (error) {
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    } else {
      if (isSignUp && !data.session) {
        toast({
          title: "Check your email",
          description: "We've sent you a confirmation link to finish creating your account.",
        });
        setLoading(false);
      } else {
        // Success! The AuthContext will pick up the session automatically
        toast({ title: isSignUp ? "Account created!" : "Welcome back!" });
        navigate("/dashboard");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 p-4 font-sans">
      <Card className="w-full max-w-md border-stone-200 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
             <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white shadow-lg">
                <Blocks className="w-8 h-8" />
             </div>
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight font-serif">
            {isSignUp ? "Join Workshop" : "Workshop Login"}
          </CardTitle>
          <CardDescription className="text-stone-500">
            {isSignUp ? "Create an account to start writing" : "Enter your credentials to access your writing"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Input 
                type="email" 
                placeholder="email@example.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                className="border-stone-200 focus:ring-stone-500"
              />
            </div>
            <div className="space-y-2">
              <Input 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                className="border-stone-200 focus:ring-stone-500"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-black hover:bg-stone-800 text-white py-6 text-lg transition-all" 
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                isSignUp ? "Create Account" : "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-stone-600 hover:text-black hover:underline underline-offset-4 transition-colors"
            >
              {isSignUp 
                ? "Already have an account? Sign In" 
                : "Need an account? Create one"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}