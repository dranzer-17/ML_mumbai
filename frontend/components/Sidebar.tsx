"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Video, 
  FileText, 
  Brain,
  LogOut,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Presentation,
  Lightbulb
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/"; // Hard refresh to clear state
  };

  const menuItems = [
    { name: "Overview", icon: LayoutDashboard, href: "/dashboard" },
    { name: "AI Tutor", icon: MessageSquare, href: "/dashboard/chat" },
    { name: "Video Lab", icon: Video, href: "/dashboard/video" },
    { name: "AI Explainer", icon: Lightbulb, href: "/dashboard/explainer" },
    { name: "Flashcards", icon: FileText, href: "/dashboard/flashcards" },
    { name: "Quiz", icon: ClipboardList, href: "/dashboard/quiz" },
    { name: "PPT Maker", icon: Presentation, href: "/dashboard/presentation" },
    { name: "Workflow", icon: GitBranch, href: "/dashboard/workflow" },
  ];

  return (
    <aside className={`hidden md:flex flex-col bg-[var(--neo-bg)] h-full flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-28' : 'w-72'}`}>
        
        {/* Logo Area */}
        <div className={`p-6 bg-[var(--neo-bg)] flex items-center gap-3 justify-center ${!isCollapsed ? 'border-b-[3px] border-black' : ''}`}>
          <div className="flex-shrink-0 bg-black p-2 rounded-lg">
            <Image 
              src="/logo.png" 
              alt="Saarthi Logo" 
              width={40} 
              height={40}
              className="object-contain"
              unoptimized
            />
          </div>
          {!isCollapsed && (
            <h1 className="text-2xl font-black uppercase tracking-tighter whitespace-nowrap">
              Saarthi<span className="text-[var(--neo-primary)]">.AI</span>
            </h1>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-6 flex flex-col gap-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  className={`
                    flex items-center gap-4 px-5 py-4 font-bold text-lg rounded-lg transition-all cursor-pointer
                    ${isActive 
                      ? "bg-[var(--neo-primary)] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-[3px] border-black" 
                      : "text-gray-700 hover:bg-white/50"}
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon size={24} className="flex-shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User / Logout Area */}
        <div className={`p-4 bg-[var(--neo-bg)] ${!isCollapsed ? 'border-t-[3px] border-black' : ''}`}>
          {!isCollapsed ? (
            <div className="mb-4 px-2 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase">Logged in as</div>
                <div className="font-black text-sm truncate">Student</div>
              </div>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <div className="flex items-center gap-0.5">
                  <ChevronLeft size={16} strokeWidth={3} />
                  <ChevronLeft size={16} strokeWidth={3} className="-ml-2" />
                  <ChevronLeft size={16} strokeWidth={3} className="-ml-2" />
                </div>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full p-2 hover:bg-gray-200 rounded-lg transition-colors mb-4 flex justify-center"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <div className="flex items-center gap-0.5">
                <ChevronRight size={16} strokeWidth={3} />
                <ChevronRight size={16} strokeWidth={3} className="-ml-2" />
                <ChevronRight size={16} strokeWidth={3} className="-ml-2" />
              </div>
            </button>
          )}
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center justify-center gap-2 font-bold bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-50 hover:text-red-600 p-2 transition-all active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${isCollapsed ? 'px-3' : ''}`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut size={20} /> {!isCollapsed && "Logout"}
          </button>
        </div>
      </aside>
  );
}