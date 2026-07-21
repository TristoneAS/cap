import { Roboto, Geist_Mono } from "next/font/google";
import "./globals.css";
import MuiAppThemeProvider from "./ui/MuiAppThemeProvider";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CAP · Auditorías LPA",
  description: "Sistema de gestión de auditorías LPA - Tristone",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${roboto.variable} ${geistMono.variable} ${roboto.className}`}
      >
        <MuiAppThemeProvider>{children}</MuiAppThemeProvider>
      </body>
    </html>
  );
}
