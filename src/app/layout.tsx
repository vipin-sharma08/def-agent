import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Valkyrie DCF - AI-Powered Valuation Agent",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="bg-app text-primary">
        <TooltipProvider delayDuration={300}>
          <ErrorBoundary>
            <AppShell>{children}</AppShell>
          </ErrorBoundary>
        </TooltipProvider>
      </body>
    </html>
  );
}
