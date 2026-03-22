import type { Metadata } from "next";
import {
  Playfair_Display,
  DM_Sans,
  JetBrains_Mono,
} from "next/font/google";
import { Sidebar } from "@/components/ui/Sidebar";
import { MobileHeader } from "@/components/ui/MobileHeader";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// ─── Fonts ──────────────────────────────────────────────────────────

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

// ─── Metadata ───────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Valkyrie DCF — AI-Powered Valuation Agent",
  description:
    "Upload an Indian company's Annual Report and get a full FCFF-based DCF valuation with integrated 3-statement model, sensitivity analysis, and professional report.",
  keywords: [
    "DCF valuation",
    "Indian equities",
    "financial modelling",
    "FCFF",
    "annual report analysis",
  ],
};

// ─── Root Layout ────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} ${jetbrainsMono.variable} h-full dark`}
    >
      <body className="min-h-full flex">
        <Sidebar />
        <MobileHeader />
        <main className="flex-1 ml-0 md:ml-64 min-h-screen pt-14 md:pt-0">
          <TooltipProvider delayDuration={300}>
            <ErrorBoundary>{children}</ErrorBoundary>
          </TooltipProvider>
        </main>
      </body>
    </html>
  );
}
