import type { Metadata, Viewport } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const title = "Tazama — Listen together. Anywhere.";
const description =
  "Create a room, share a link, and everyone hears the same song at the same moment. Tazama is social listening, in real time.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tazama.fm"),
  title: {
    default: title,
    template: "%s — Tazama",
  },
  description,
  applicationName: "Tazama",
  keywords: [
    "Tazama",
    "listen together",
    "social music",
    "listening rooms",
    "synced music",
    "real-time music",
  ],
  openGraph: {
    title,
    description,
    type: "website",
    siteName: "Tazama",
    locale: "en_US",
    images: [
      {
        url: "/brand/logo-stacked.png",
        width: 2000,
        height: 2000,
        alt: "Tazama — Vibe & Connect",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/brand/logo-stacked.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background dark:bg-black text-foreground dark:text-white">
        <a
          href="#content"
          className="sr-only rounded-lg focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
