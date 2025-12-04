import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { Header } from "./_components/Header";
import { Footer } from "./_components/Footer";
import ExtensionBridge from "./_components/extensionBridge";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gambit mail monitor",
  description: "Track your reservations and monitors for better deals",
  icons: {
    icon: "/convex.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider dynamic>
      <ConvexClientProvider>
        <html lang="en">
          <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
            <Header />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
            <ExtensionBridge />
          </body>
        </html>
      </ConvexClientProvider>
    </ClerkProvider>
  );
}
