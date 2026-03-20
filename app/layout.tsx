import type { Metadata } from "next";
import { Nunito, Righteous } from "next/font/google";
import "./globals.css";

const righteous = Righteous({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-righteous",
  display: "swap",
});

const nunito = Nunito({
  weight: ["400", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "QuizBlitz — Live Quiz for Students",
  description: "Host live quiz games for your students. Create a quiz, share a code, and compete in real time. Built for ages 8–18.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${righteous.variable} ${nunito.variable} antialiased font-body`}
      >
        {children}
      </body>
    </html>
  );
}
