import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Esports Matchmaking & ELO Leaderboard",
  description: "Competitive esports matchmaking and ELO leaderboard platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <Nav />
        <main className="container">{children}</main>
        <footer className="site-footer">
          DBMS Level 3 Project, Team 22, PES University
        </footer>
      </body>
    </html>
  );
}
