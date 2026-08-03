import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase.from('configuracoes').select('logo_url').eq('id', 1).single();

  return {
    title: "ArcoForte Orçamentos",
    description: "Sistema gerador de orçamentos ArcoForte",
    icons: {
      icon: data?.logo_url || "/favicon.ico",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50" suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
