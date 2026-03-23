import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Valkyrie DCF - AI-Powered DCF Valuation for Indian Equities",
  description:
    "Automated DCF valuation tool for Indian equities. Upload annual reports and get AI-powered financial analysis with sensitivity analysis and PDF export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>{children}</body>
    </html>
  );
}
