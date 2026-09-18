import "./globals.css";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "Recall Forge",
  description: "A single-user deliberate-practice cockpit for Microsoft SWE preparation.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
