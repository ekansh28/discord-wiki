import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ballscord Wiki",
  description: "A retro wiki with Windows 98 styling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/98.css" />
      </head>
      <body
        suppressHydrationWarning={true}
      >
        {children}
      </body>
    </html>
  );
}