import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AudioProvider } from "@/components/providers/AudioProvider";
import { GameProvider } from "@/components/providers/GameProvider";

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
      <body className="antialiased bg-background text-foreground">
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
