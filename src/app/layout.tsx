import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Baio Systems | Portfólio & Hub de Apps",
  description: "Portfólio de Igor Baio e hub de aplicativos utilitários em baiosystems.com.br",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        {/* AdSense GLOBAL – troque pelo seu client */}
        <Script
          id="adsense-global"
          strategy="afterInteractive"
          async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9674908168811233"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-neutral-950 text-neutral-50 min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
