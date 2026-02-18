import React from "react";
import type { Metadata } from "next";
import { Inter, Dongle } from "next/font/google";
import "./globals.css";

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin']
});

const dongle = Dongle({
    weight: ['300', '400', '700'],
    variable: '--font-dongle',
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
        className={`${inter.variable} ${dongle.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
