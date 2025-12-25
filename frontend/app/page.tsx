"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowRight, 
  Brain, 
  MessageSquare, 
  Video, 
  Accessibility, 
  Zap, 
  LayoutDashboard 
} from "lucide-react";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in (client-side only)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-mono bg-[var(--neo-bg)] overflow-x-hidden">
      
      {/* 1. NAVBAR */}
      <nav className="w-full border-b-[3px] border-black bg-white p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[var(--neo-primary)] border-[3px] border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Brain className="text-white" size={24} />
          </div>
          <div className="text-3xl font-black tracking-tighter uppercase hidden md:block">
            Saarthi<span className="text-[var(--neo-primary)]">.AI</span>
          </div>
        </div>

        {/* Dynamic Button Logic */}
        <div>
          {isLoggedIn ? (
            <Link href="/dashboard">
              <button className="flex items-center gap-2 bg-[var(--neo-secondary)] text-black border-[3px] border-black px-6 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                <LayoutDashboard size={20} /> DASHBOARD
              </button>
            </Link>
          ) : (
            <Link href="/signup">
              <button className="flex items-center gap-2 bg-[var(--neo-primary)] text-white border-[3px] border-black px-6 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
                GET STARTED <ArrowRight size={20} />
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header className="grid grid-cols-1 lg:grid-cols-2 gap-12 px-6 py-20 max-w-7xl mx-auto items-center">
        
        {/* Left: Text */}
        <div className="flex flex-col gap-6 z-10">
          <div className="bg-[var(--neo-accent)] border-[3px] border-black px-4 py-2 w-fit font-black text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-2">
            🚀 HACKATHON BUILD 2025
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase leading-[0.9] drop-shadow-sm">
            Master <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--neo-primary)] to-[var(--neo-secondary)] stroke-black text-stroke-3">Any Skill</span>
          </h1>
          <p className="text-xl font-bold border-l-[6px] border-black pl-6 py-2 text-gray-800 bg-white shadow-neo">
            The Agentic AI Tutor that adapts to YOU. 
            <span className="block mt-2 text-sm text-gray-500 font-normal">// Video to Quiz • Flashcards • Sign Language</span>
          </p>
          
          <div className="mt-4">
             {isLoggedIn ? (
                <Link href="/dashboard">
                    <button className="w-full md:w-auto bg-[var(--neo-secondary)] text-black border-[3px] border-black px-8 py-4 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all">
                        CONTINUE LEARNING
                    </button>
                </Link>
             ) : (
                <Link href="/signup">
                    <button className="w-full md:w-auto bg-[var(--neo-primary)] text-white border-[3px] border-black px-8 py-4 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[4px] hover:translate-y-[4px] transition-all">
                        START FOR FREE
                    </button>
                </Link>
             )}
          </div>
        </div>

        {/* Right: Mock UI (The "App Preview") */}
        <div className="relative hidden lg:block scale-90 hover:scale-100 transition-transform duration-500">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-full h-full bg-black translate-x-4 translate-y-4"></div>
          
          <div className="relative bg-white border-[3px] border-black p-4 h-[500px] flex flex-col">
            {/* Window Header */}
            <div className="border-b-[3px] border-black pb-2 flex justify-between mb-4 bg-gray-100 p-2">
              <div className="flex gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-black"></div>
                <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-black"></div>
                <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-black"></div>
              </div>
              <div className="font-bold text-xs uppercase tracking-widest">Saarthi_Agent_v1.0</div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-[var(--neo-bg)] border-[3px] border-black p-4 overflow-hidden relative">
              {/* Message 1 */}
              <div className="flex gap-3 mb-6 items-start">
                 <div className="w-10 h-10 bg-black border-2 border-black flex-shrink-0"></div>
                 <div className="bg-white border-[3px] border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-[80%]">
                    <p className="font-bold text-sm">Summarize this 1-hour Physics lecture for me.</p>
                 </div>
              </div>

              {/* Message 2 (AI) */}
              <div className="flex gap-3 mb-4 items-start flex-row-reverse">
                 <div className="w-10 h-10 bg-[var(--neo-primary)] border-[3px] border-black flex-shrink-0 flex items-center justify-center">
                    <Brain className="text-white" size={20} />
                 </div>
                 <div className="bg-[var(--neo-secondary)] border-[3px] border-black p-4 shadow-[-4px_4px_0px_0px_rgba(0,0,0,1)] max-w-[80%]">
                    <p className="font-bold text-sm">Here is the summary! I also created 5 Flashcards and a Quiz to test your knowledge.</p>
                 </div>
              </div>

               {/* Floater Element */}
              <div className="absolute bottom-4 right-4 bg-[var(--neo-accent)] border-[3px] border-black p-2 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce">
                <span className="font-black text-xs uppercase">⚡ Generating Quiz...</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. SCROLLING TICKER */}
      <div className="bg-[var(--neo-accent)] border-y-[3px] border-black py-4 overflow-hidden">
        <div className="animate-scroll whitespace-nowrap">
          {[...Array(10)].map((_, i) => (
             <span key={i} className="text-3xl font-black mx-8 uppercase flex items-center gap-6">
                <Zap className="fill-black" size={30}/> AI Powered Learning
                <Zap className="fill-black" size={30}/> Instant Quizzes
                <Zap className="fill-black" size={30}/> Sign Language
             </span>
          ))}
        </div>
      </div>

      {/* 4. FEATURES GRID */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
        <h2 className="text-5xl font-black mb-16 text-center uppercase">
            <span className="bg-white px-6 py-2 border-[3px] border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                Why Saarthi?
            </span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Feature 1 */}
          <div className="card-neo bg-[#FFCCF9] hover:-translate-y-2 transition-transform cursor-pointer group">
            <div className="border-[3px] border-black w-16 h-16 flex items-center justify-center bg-white mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                <MessageSquare size={32} />
            </div>
            <h3 className="text-2xl font-black mb-3 uppercase">AI Chat Tutor</h3>
            <p className="font-bold text-sm leading-relaxed">
                Stuck on a concept? Chat with Saarthi. It remembers your history and explains things like a friend, not a robot.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card-neo bg-[#CCFFD6] hover:-translate-y-2 transition-transform cursor-pointer group">
             <div className="border-[3px] border-black w-16 h-16 flex items-center justify-center bg-white mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                <Video size={32} />
            </div>
            <h3 className="text-2xl font-black mb-3 uppercase">Video to Quiz</h3>
            <p className="font-bold text-sm leading-relaxed">
                Don't just watch lectures. Upload them. We extract key concepts and test you immediately.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card-neo bg-[#CCDFFF] hover:-translate-y-2 transition-transform cursor-pointer group">
             <div className="border-[3px] border-black w-16 h-16 flex items-center justify-center bg-white mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-shadow">
                <Accessibility size={32} />
            </div>
            <h3 className="text-2xl font-black mb-3 uppercase">Inclusive Design</h3>
            <p className="font-bold text-sm leading-relaxed">
                Education is for everyone. Our Sign Language Avatar translates text in real-time for deaf learners.
            </p>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="mt-auto border-t-[3px] border-black bg-black text-white p-10 font-bold">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl uppercase tracking-widest">
                Saarthi<span className="text-[var(--neo-primary)]">.AI</span>
            </div>
            <div className="flex gap-6 text-sm">
                <a href="#" className="hover:text-[var(--neo-secondary)] hover:underline">GITHUB</a>
                <a href="#" className="hover:text-[var(--neo-secondary)] hover:underline">DEMO</a>
                <a href="#" className="hover:text-[var(--neo-secondary)] hover:underline">TEAM</a>
            </div>
            <div className="text-gray-500 text-xs">
                © 2025 // HACKATHON BUILD
            </div>
        </div>
      </footer>
    </div>
  );
}