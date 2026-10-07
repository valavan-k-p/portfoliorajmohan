import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Rajmohan",
  description: "Rajmohan, Government of Tamil Nadu.",
};

export const viewport: Viewport = {
  themeColor: "#0b0406",
  colorScheme: "dark",
};

// Without JavaScript there is no gate or film: the opening renders as a still, in-flow composition
// and Enter jumps to #main.
const noScriptStyles = `
.op-root{position:relative;height:100vh}
.op-gate{display:none}
.op-shot:first-child,.op-atmosphere,.op-vignette,.op-fg-frame,.op-title,.op-subtitle,.op-enter,.op-meta{opacity:1!important;visibility:visible!important}
.op-fg-frame{--fg-reveal:1}
.main-reveal{opacity:1!important;transform:none!important}
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={archivo.variable}>
      <head>
        <noscript>
          <style>{noScriptStyles}</style>
        </noscript>
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
