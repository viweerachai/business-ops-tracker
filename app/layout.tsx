import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

export const metadata: Metadata = {
  title: "Receipt Reader",
  description: "Local-first receipt OCR and resale item review for Japan resellers",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Receipt Reader",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  themeColor: "#0d736b"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>
          <PwaRegister />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
