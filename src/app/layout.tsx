import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AudioProvider } from "@/components/providers/AudioProvider";
import { GameProvider } from "@/components/providers/GameProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Realms of War — Пошаговая стратегия",
  description: "Hex-based turn-based 4X strategy game in a fantasy setting. Build your empire, research technologies, and conquer rivals.",
  keywords: ["strategy", "4X", "turn-based", "hex", "fantasy", "game"],
  authors: [{ name: "Realms of War Team" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <GameProvider>
          <AudioProvider>
            {children}
          </AudioProvider>
        </GameProvider>
        <Toaster />
      </body>
    </html>
  );
}
