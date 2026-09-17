import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "여수 관광지 추천",
  description:
    "여행 취향을 고르면 AI Agent가 여수 관광지 20곳 중 3곳을 추천합니다.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#d9eefb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
