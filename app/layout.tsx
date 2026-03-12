import type { Metadata } from "next";

import { Navigation } from "@/components/navigation";
import { APP_NAME } from "@/lib/constants";
import { ensureRuntimeReady } from "@/lib/runtime";
import { getUiLanguage } from "@/lib/ui-language";
import { DM_Sans, Playfair_Display } from "next/font/google";

import "./globals.css";
import "./ui-ux-pro-max.css";

const bodyFont = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const displayFont = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "LAN-ready e-commerce image generation studio powered by Gemini.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  ensureRuntimeReady();
  const language = await getUiLanguage();

  return (
    <html lang={language}>
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        <div className="app-shell">
          <Navigation language={language} />
          <main className="main-content">{children}</main>
        </div>
      </body>
    </html>
  );
}
