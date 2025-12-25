"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import axios from "axios";
import toast from "react-hot-toast";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback - Supabase uses URL hash
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // If no session, try to get it from the URL hash
        if (!session) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken && refreshToken) {
            // Set the session manually
            const { data: { session: newSession }, error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (setError || !newSession) {
              console.error("Set session error:", setError);
              toast.error("Authentication failed");
              router.push("/login");
              return;
            }
            
            // Get the updated session
            const { data: { session: updatedSession } } = await supabase.auth.getSession();
            if (!updatedSession?.user) {
              toast.error("No user session found");
              router.push("/login");
              return;
            }
            
            // Continue with the session
            const email = updatedSession.user.email;
            const fullName = updatedSession.user.user_metadata?.full_name || 
                            updatedSession.user.user_metadata?.name ||
                            updatedSession.user.user_metadata?.display_name ||
                            null;

            if (!email) {
              toast.error("Email not found in Google account");
              await supabase.auth.signOut();
              router.push("/login");
              return;
            }

            // Call backend
            try {
              const res = await axios.post(
                "http://127.0.0.1:8000/api/auth/clerk-callback",
                { email, full_name: fullName },
                {
                  headers: { "Content-Type": "application/json" },
                  timeout: 10000,
                }
              );

              localStorage.setItem("token", res.data.access_token);
              await supabase.auth.signOut();
              toast.success("Signed in with Google successfully!");
              window.location.href = "/dashboard";
            } catch (backendError) {
              console.error("Backend error:", backendError);
              if (axios.isAxiosError(backendError)) {
                if (backendError.code === 'ECONNREFUSED' || backendError.message.includes('Network Error')) {
                  toast.error("Backend server is not running. Please start the backend server.");
                } else {
                  toast.error(backendError.response?.data?.detail || "Failed to connect to backend");
                }
              } else {
                toast.error("Failed to connect to backend server");
              }
              await supabase.auth.signOut();
              router.push("/login");
            }
            return;
          }
        }
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          toast.error("Authentication failed");
          router.push("/login");
          return;
        }

        if (!session?.user) {
          toast.error("No user session found");
          router.push("/login");
          return;
        }

        // Get user email and name
        const email = session.user.email;
        const fullName = session.user.user_metadata?.full_name || 
                        session.user.user_metadata?.name ||
                        session.user.user_metadata?.display_name ||
                        null;

        if (!email) {
          toast.error("Email not found in Google account");
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }

        // Call backend to create/update user and get JWT
        try {
          const res = await axios.post(
            "http://127.0.0.1:8000/api/auth/clerk-callback",
            {
              email,
              full_name: fullName,
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 10000, // 10 second timeout
            }
          );

          // Save JWT token
          localStorage.setItem("token", res.data.access_token);
          
          // Sign out from Supabase (we use our own JWT)
          await supabase.auth.signOut();
          
          toast.success("Signed in with Google successfully!");
          
          // Redirect to dashboard
          window.location.href = "/dashboard";
        } catch (backendError) {
          console.error("Backend error:", backendError);
          if (axios.isAxiosError(backendError)) {
            if (backendError.code === 'ECONNREFUSED' || backendError.message.includes('Network Error')) {
              toast.error("Backend server is not running. Please start the backend server.");
            } else {
              const errorMsg = backendError.response?.data?.detail || "Failed to connect to backend";
              toast.error(errorMsg);
            }
          } else {
            toast.error("Failed to connect to backend server");
          }
          await supabase.auth.signOut();
          router.push("/login");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        toast.error("Authentication failed");
        await supabase.auth.signOut();
        router.push("/login");
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--neo-bg)] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Completing sign in...</h1>
        <p className="text-gray-600">Please wait while we set up your account.</p>
      </div>
    </div>
  );
}

