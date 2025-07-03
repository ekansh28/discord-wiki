import type { Metadata } from "next";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  title: "Ballscord Wiki – Lesbian Hangout & Thug Shaker Central",
  description: "Ballscord is the ultimate Discord server for lesbian hangouts, thug shaker memes, chaos, and community-driven wiki content.",
  keywords: [
    "Ballscord", 
    "lesbian hangout", 
    "Discord server", 
    "thug shaker", 
    "Ballscord Wiki", 
    "LGBTQ Discord", 
    "meme community", 
    "Ballscord memes", 
    "chaotic discord servers"
  ],
  metadataBase: new URL("https://ballscord.online"),
  openGraph: {
    title: "Ballscord Wiki – Lesbian Hangout & Thug Shaker Central",
    description: "A community-powered wiki for the most chaotic Discord server: Ballscord. Explore memes, drama, and everything else.",
    url: "https://ballscord.online",
    siteName: "Ballscord Wiki",
    type: "website",
    images: [
      {
        url: "/favicon.png", // put a cool OG image at public/favicon.png
        width: 1200,
        height: 630,
        alt: "Ballscord Logo with chaos in background",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ballscord Wiki",
    description: "Lesbian hangout and thug shaker central. Read the lore.",
    creator: "@ballscord", // if you have a Twitter account
    images: ["/favicon.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Ballscord",
              url: "https://ballscord.online",
              sameAs: [
                "https://discord.gg/gayporn",
                "https://instagram.com/ballscordofficial"
              ],
              description: "Ballscord is a wild, chaotic Discord server that hosts lesbians, memes, and thug shaker culture. Explore its community wiki here.",
              logo: "https://ballscord.online/favicon.ico"
            }),
          }}
        />
      </head>
      <body suppressHydrationWarning={true}>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
