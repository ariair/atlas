import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Host_Grotesk, JetBrains_Mono } from "next/font/google";
import SettingsApplier from "@/components/SettingsApplier";
import { SETTINGS_BOOT_SCRIPT } from "@/lib/settings";
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

// Optional readable font, switched on in Settings (kept next to the others so it loads from the same place).
const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  weight: ["400", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "atlas",
  description:
    "Atlas turns your syllabi, slides and notes into one map of everything you learn, collects every deadline, and builds study guides from your own material.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${hostGrotesk.variable} ${jetbrainsMono.variable} ${atkinson.variable} h-full antialiased`}
      // The boot script below sets data-* attributes before React loads, so React must not complain about them.
      suppressHydrationWarning
    >
      <head>
        {/* Applies saved display settings before the first paint (no flash of the wrong theme). */}
        <script dangerouslySetInnerHTML={{ __html: SETTINGS_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SettingsApplier />
        {children}
      </body>
    </html>
  );
}
