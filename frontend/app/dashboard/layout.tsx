"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/Sidebar"; // Defined previously
import { Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 1. Protect the Route (Kick out if no token)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex h-screen bg-[var(--neo-bg)] overflow-hidden font-mono">
      
      {/* 2. SIDEBAR (Stays here forever) */}
      <Sidebar />

      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-0 w-full z-50 bg-[var(--neo-accent)] border-b-[3px] border-black p-4 flex justify-between items-center shadow-neo">
         <h1 className="text-xl font-black uppercase">Saarthi</h1>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
         </button>
      </div>

      {/* 3. DYNAMIC CONTENT (Chat, Quiz, etc. loads here) */}
      <main className="flex-1 overflow-y-auto p-6 md:p-10 pt-24 md:pt-10 relative">
        {children}
      </main>

    </div>
  );
}