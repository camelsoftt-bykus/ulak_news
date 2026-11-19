
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ULAK | Şehrinden dünyaya",
  description:
    "Her sabah şehrinden ve dünyadan önemli gelişmeler. Güne hazır ol.",
  applicationName: "ULAK",
  appleWebApp: {
    capable: true,
    title: "ULAK",
    statusBarStyle: "default"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
