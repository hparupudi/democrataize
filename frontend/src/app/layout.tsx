import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Democratize — Find candidates who match your views",
  description:
    "Rate where you stand on key issues and see your % match with real North Carolina candidates on your ballot.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="map-texture min-h-screen">{children}</body>
    </html>
  );
}
