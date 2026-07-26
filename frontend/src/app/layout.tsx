import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
    <html lang="en" className={`${inter.variable} antialiased dark`}>
      <body className="min-h-screen bg-[#090909] text-white selection:bg-indigo-500/30 font-[var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
