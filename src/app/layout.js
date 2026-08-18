import "./globals.css";
import AppToaster from "@/components/AppToaster";
import PageReloadButton from "@/components/PageReloadButton";
import { ThemeProvider } from "@/components/theme-provider";
import { AntDesignProvider, MaterialUIProvider } from "@/components/providers";

export const metadata = {
  title: {
    default: "Taskspace | Private task management",
    template: "%s | Taskspace",
  },
  description: "A responsive, private workspace for managing tasks, projects, priorities, and deadlines.",
  applicationName: "Taskspace",
  robots: { index: false, follow: false },
  formatDetection: { email: false, address: false, telephone: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AntDesignProvider>
            <MaterialUIProvider>
              {children}
              <PageReloadButton />
              <AppToaster />
            </MaterialUIProvider>
          </AntDesignProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
