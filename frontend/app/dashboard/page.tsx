"use client";
import Link from "next/link";
import { MessageSquare, Video, FileText, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";
import { getApiUrl } from "@/lib/api";

export default function DashboardHome() {
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/login";
          return;
        }

        const response = await axios.get(getApiUrl("api/auth/me"), {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setUserName(response.data.full_name || response.data.email.split("@")[0]);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        localStorage.removeItem("token");
        window.location.href = "/login";
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      
      {/* Welcome Banner */}
      <div className="mb-10 bg-white border-[3px] border-black p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-4xl font-black uppercase mb-2">
                {loading ? (
                  "Loading..."
                ) : (
                  <>
                    Welcome Back, <span className="text-[var(--neo-primary)] underline decoration-4 underline-offset-4">{userName}!</span>
                  </>
                )}
            </h1>
            <p className="font-bold text-gray-600">Select a tool below to start your session.</p>
        </div>
        <div className="bg-[var(--neo-secondary)] px-4 py-2 border-[3px] border-black font-bold text-sm transform -rotate-2">
            STREAK: 0 DAYS 🔥
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Card 1: AI Chat */}
        <Link href="/dashboard/chat">
            <div className="card-neo h-full hover:bg-yellow-50 transition-colors cursor-pointer group relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight size={24} />
                </div>
                <div className="w-14 h-14 bg-[var(--neo-primary)] border-[3px] border-black flex items-center justify-center mb-4 text-white">
                    <MessageSquare size={28} />
                </div>
                <h2 className="text-2xl font-black uppercase mb-2">AI Tutor</h2>
                <p className="font-bold text-gray-600 text-sm">
                    Chat with Gemini. Ask doubts, get summaries, and clarify concepts instantly.
                </p>
            </div>
        </Link>

        {/* Card 2: Video */}
        <Link href="/dashboard/video">
            <div className="card-neo h-full hover:bg-blue-50 transition-colors cursor-pointer group relative">
                 <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight size={24} />
                </div>
                <div className="w-14 h-14 bg-[var(--neo-secondary)] border-[3px] border-black flex items-center justify-center mb-4 text-black">
                    <Video size={28} />
                </div>
                <h2 className="text-2xl font-black uppercase mb-2">Video Lab</h2>
                <p className="font-bold text-gray-600 text-sm">
                    Upload lectures. We will extract the text, generate quizzes, and summaries for you.
                </p>
            </div>
        </Link>

        {/* Card 3: Flashcards */}
        <Link href="/dashboard/flashcards">
            <div className="card-neo h-full hover:bg-pink-50 transition-colors cursor-pointer group relative">
                 <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight size={24} />
                </div>
                <div className="w-14 h-14 bg-[var(--neo-accent)] border-[3px] border-black flex items-center justify-center mb-4 text-black">
                    <FileText size={28} />
                </div>
                <h2 className="text-2xl font-black uppercase mb-2">Flashcards</h2>
                <p className="font-bold text-gray-600 text-sm">
                    Revise quickly. Generate smart flashcards from your notes or video transcripts.
                </p>
            </div>
        </Link>
      </div>
    </div>
  );
}