import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allocation — Portfolio Planner",
  description: "Plan contributions and track your investment allocation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
