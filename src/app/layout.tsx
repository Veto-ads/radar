import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Veto Ads — منصة رصد الإعلانات",
  description: "منصة رصد الإعلانات الخارجية والداخلية",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@200;300;400;500;600;700&family=Roboto:wght@400;500;700&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
