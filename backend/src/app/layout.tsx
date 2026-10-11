import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DemocratAIze API",
  description: "Backend API for DemocratAIze",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
