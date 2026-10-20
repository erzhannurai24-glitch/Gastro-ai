import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gasto — Personal dining",
  description: "Personalized dining and restaurant operations",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
