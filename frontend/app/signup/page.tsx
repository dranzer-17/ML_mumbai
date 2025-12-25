"use client";
import { useState } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, UserPlus, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import toast from "react-hot-toast";
import { useSignIn } from "@clerk/nextjs";

export default function SignupPage() {
  const { signIn } = useSignIn();
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/auth/signup", formData, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      localStorage.setItem("token", res.data.access_token);
      toast.success("Account created successfully!");
      
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
      
    } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
          let errorMessage = "Signup failed. Please try again.";
          if (err.response?.data?.detail) {
            const detail = err.response.data.detail;
            if (typeof detail === 'string') {
              errorMessage = detail;
            } else if (Array.isArray(detail)) {
              errorMessage = detail.map((e: any) => e.msg || e).join(', ');
            }
          }
          toast.error(errorMessage);
        } else {
          toast.error("An unexpected error occurred. Please try again.");
        }
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn?.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/dashboard",
      });
    } catch (err) {
      console.error("Error signing in:", err);
      toast.error("Failed to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--neo-bg)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-20 right-10 w-20 h-20 bg-[var(--neo-secondary)] border-[3px] border-black -rotate-12 opacity-40"></div>
      <div className="absolute bottom-10 left-10 w-28 h-28 bg-[var(--neo-accent)] border-[3px] border-black rotate-6 opacity-50"></div>
      <div className="absolute top-1/2 left-20 w-16 h-16 bg-[var(--neo-primary)] border-[3px] border-black -rotate-45 opacity-30"></div>
      
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-10">
        <Link href="/">
          <button className="btn-neo flex items-center gap-2 text-sm hover:shadow-neo-hover transition-all">
            <ArrowLeft size={16} /> Back
          </button>
        </Link>
      </div>

      <div className="max-w-md w-full z-10">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black uppercase mb-3 tracking-tight">Join Saarthi</h1>
          <p className="font-bold text-gray-700 text-lg">Create your AI Tutor account today!</p>
        </div>

        {/* Card */}
        <div className="card-neo relative bg-white">
            {/* Decorative Icon */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-[var(--neo-primary)] border-[3px] border-black flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                <UserPlus className="text-black" size={40} strokeWidth={2.5} />
            </div>

            <form onSubmit={handleSubmit} className="mt-12 flex flex-col gap-5">

                {/* Full Name Input */}
                <div>
                  <label className="block font-bold text-sm mb-2 uppercase">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="John Doe"
                      className="input-neo w-full pl-12"
                      required
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div>
                  <label className="block font-bold text-sm mb-2 uppercase">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="you@example.com"
                      className="input-neo w-full pl-12"
                      required
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block font-bold text-sm mb-2 uppercase">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="input-neo w-full pl-12 pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-neo bg-[var(--neo-primary)] w-full py-4 font-black uppercase text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>

                {/* OR Divider */}
                <div className="flex items-center gap-4 my-2">
                  <div className="flex-1 h-[3px] bg-black"></div>
                  <span className="font-black uppercase text-sm">OR</span>
                  <div className="flex-1 h-[3px] bg-black"></div>
                </div>

                {/* Google Sign-In Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white hover:bg-gray-50 text-black font-bold uppercase py-4 px-6 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign up with Google
                </button>
              
                <p className="mt-2 text-center text-sm font-bold text-gray-600">
                  Already have an account?{" "}
                  <Link href="/login" className="text-[var(--neo-primary)] hover:underline">
                    Login here
                  </Link>
                </p>
            </form>
        </div>
      </div>
    </div>
  );
}
