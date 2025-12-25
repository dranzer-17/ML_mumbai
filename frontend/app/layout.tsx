import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Saarthi.AI",
  description: "AI-Powered Learning Platform",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              border: '3px solid #000',
              boxShadow: '6px 6px 0px 0px #000',
              fontWeight: '700',
              fontFamily: 'Courier New, Courier, monospace',
              fontSize: '14px',
              padding: '16px 20px',
              borderRadius: '0',
              maxWidth: '400px',
            },
            success: {
              style: {
                background: '#4ECDC4',
                color: '#000',
                border: '3px solid #000',
                boxShadow: '6px 6px 0px 0px #000',
              },
            },
            error: {
              style: {
                background: '#FF6B6B',
                color: '#fff',
                border: '3px solid #000',
                boxShadow: '6px 6px 0px 0px #000',
              },
            },
          }}
        />
        {children}
      </body>
    </html>
    </ClerkProvider>
  );
}
