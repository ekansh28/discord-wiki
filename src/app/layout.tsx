import type { Metadata } from "next";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
export const metadata: Metadata = {
  title: "Ballscord Wiki",
    icons: {
    icon: '/favicon.ico',
  },
  description: "Ballscord wiki for the ballscord discord server",
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