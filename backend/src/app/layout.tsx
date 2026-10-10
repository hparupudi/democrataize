import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BallotMatch NC API",
  description: "Backend API for BallotMatch NC",
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
