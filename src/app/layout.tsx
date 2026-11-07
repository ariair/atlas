import type { Metadata } from "next";
import { Host_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Type from the taste skill's software pairing: Host Grotesk for text and headings,
// JetBrains Mono for numbers and codes.
const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "atlas: your whole degree, mapped", template: "%s · atlas" },
  description:
    "Atlas turns your syllabi, slides and notes into one map of everything you learn, collects every deadline, and builds study guides from your own material.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${hostGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
