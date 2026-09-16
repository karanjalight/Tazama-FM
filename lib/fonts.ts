import { Geist, Geist_Mono } from "next/font/google";

/**
 * Marketing typefaces (homepage, site header, footer). The app itself keeps
 * Outfit; these only define CSS variables, consumed via the `font-display` /
 * `font-tech` utilities declared in globals.css.
 */
export const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const marketingFontVars = `${geistSans.variable} ${geistMono.variable}`;
