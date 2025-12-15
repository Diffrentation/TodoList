import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { ThemeProvider } from "@/components/theme-provider";
import { AntDesignProvider, MaterialUIProvider } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "To-Do List App",
  description:
    "Production-ready To-Do List Application with OTP Authentication",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AntDesignProvider>
            <MaterialUIProvider>
              {children}
              <Toaster position="top-right" />
            </MaterialUIProvider>
          </AntDesignProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
