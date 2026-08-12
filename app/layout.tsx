import type { Metadata } from "next";
import { Noto_Sans_Khmer } from "next/font/google";
import "./globals.css";

const notoKhmer = Noto_Sans_Khmer({
  subsets: ["khmer"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ហាងខ្ញុំ - ប្រព័ន្ធគ្រប់គ្រងស្តុក",
  description: "ប្រព័ន្ធគ្រប់គ្រងស្តុកសម្រាប់ហាង",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="km">
      <body className={`${notoKhmer.className} antialiased`}>{children}</body>
    </html>
  );
}
