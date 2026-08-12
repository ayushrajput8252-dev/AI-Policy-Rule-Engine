import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AIAssistantWidget from "@/components/ai-assistant/AIAssistantWidget";
import CookieConsent from "@/components/CookieConsent";
import { AUTH_GATE_ENABLED, AuthProvider } from "@/contexts/AuthContext";
import AuthHeaderBar from "@/components/auth/AuthHeaderBar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Enterprise AI — Automation Platform for Modern Organizations",
  description:
    "Automate repetitive workflows, deploy AI agents, connect enterprise systems, and securely scale knowledge across your organization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-white text-zinc-900 selection:bg-blue-500/20 font-[var(--font-inter)]">
        <AuthProvider>
          {AUTH_GATE_ENABLED && <AuthHeaderBar />}
          {children}
          <AIAssistantWidget />
          <CookieConsent />
        </AuthProvider>
      </body>
    </html>
  );
}
