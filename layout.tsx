import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Digest — Real Estate Trend Scanner",
  description:
    "Scan online communities to identify what real estate professionals are discussing, struggling with, and wishing existed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
