import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "BallotMatch NC",
  description:
    "North Carolina midterm candidate matching with voice-enabled questionnaire and district maps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="site-nav">
            <Link className="brand" href="/">
              BallotMatch NC
            </Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
