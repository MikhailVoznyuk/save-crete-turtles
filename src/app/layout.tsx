import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Save Crete turtles',
  description: 'Contribute to saving turtles on Crete',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
