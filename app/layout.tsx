import type { Metadata } from "next";
import { Providers } from "./providers";
import { Shell } from "./components/chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "TruthMarket",
  description: "Markets settled by evidence, not trust.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
