import type { Metadata, Viewport } from "next";
import { Sarabun } from "next/font/google";
import { getServerSession } from "next-auth";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PwaRegister } from "@/components/pwa-register";
import { authOptions } from "@/lib/auth";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sarabun",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Business Ops Tracker",
  description: "ระบบติดตามรายจ่ายธุรกิจ จัดการใบเสร็จและรายงานการเงิน",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "Receipt Reader",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#0d736b"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="th" className={`${sarabun.variable} bg-background`}>
      <body className="font-sans">
        <AuthProvider session={session}>
          <PwaRegister />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
