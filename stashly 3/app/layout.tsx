import type { Metadata, Viewport } from "next";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Stashly", template: "%s · Stashly" },
  description: "Collect what you love. / 好きを集めて、わたしの棚をつくる。",
};
export const viewport: Viewport = { themeColor: "#faf8f5" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* ロゴ専用のレトロな筆記体。"Stashly" の文字だけ配信して軽量にしている */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pacifico&text=Stashly&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
