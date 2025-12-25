"use client";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[var(--neo-primary)] border-[3px] border-black flex items-center justify-center text-white">
            <MessageSquare size={24} />
          </div>
          <h1 className="text-4xl font-black uppercase">AI Tutor</h1>
        </div>
        <p className="font-bold text-gray-600">Chat with your AI tutor. Ask questions, get explanations, and learn faster.</p>
      </div>

      <div className="card-neo bg-white min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <MessageSquare size={64} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-black uppercase mb-2">Chat Interface Coming Soon</h2>
          <p className="font-bold text-gray-600">AI-powered tutoring experience</p>
        </div>
      </div>
    </div>
  );
}
