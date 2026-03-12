import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: 'RISS [Royal iron steel supply]',
  description: 'Production-grade industrial ledger and analytics suite for scrap trade businesses.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-bg" />
        {children}
      </body>
    </html>
  );
}
