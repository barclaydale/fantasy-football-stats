import type { Metadata } from "next";
import { SiteHeader } from "./site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fantasy Football Stats",
  description: "In-depth fantasy football stats dashboard.",
};

// The header reads live sync status on every request; without this, Next
// tries to statically prerender routes with no other dynamic API (just
// /_not-found today) and that prerender fails if the database isn't
// reachable at build time.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex h-full flex-col bg-background text-foreground">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
