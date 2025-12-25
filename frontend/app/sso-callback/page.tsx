"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

export default function SSOCallback() {
  const { handleRedirectCallback } = useClerk();

  useEffect(() => {
    void handleRedirectCallback();
  }, [handleRedirectCallback]);

  return (
    <div className="min-h-screen bg-[var(--neo-bg)] flex items-center justify-center">
      <div className="card-neo bg-white p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-lg">Signing you in...</p>
        </div>
      </div>
    </div>
  );
}
