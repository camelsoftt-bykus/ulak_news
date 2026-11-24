
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ULAK’TAN HABERLER | Türkiye’den ve dünyadan",
  description:
    "Türkiye’den ve dünyadan önemli gelişmeler. Doğru haberin adresi.",
  applicationName: "ULAK’TAN HABERLER",
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  appleWebApp: {
    capable: true,
    title: "ULAK’TAN HABERLER",
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
