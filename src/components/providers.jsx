"use client";

import { ConfigProvider, theme } from "antd";
import { ThemeProvider as MUIThemeProvider, createTheme } from "@mui/material/styles";
import { useTheme } from "next-themes";

export function AntDesignProvider({ children }) {
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "hsl(var(--color-primary))",
          borderRadius: 12,
          fontFamily: "var(--font-sans)",
        },
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}

export function MaterialUIProvider({ children }) {
  const { resolvedTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  const muiTheme = createTheme({
    palette: {
      mode: isDark ? "dark" : "light",
      primary: {
        main: "hsl(var(--color-primary))",
      },
      secondary: {
        main: "hsl(var(--color-secondary))",
      },
      background: {
        default: isDark ? "hsl(0 0% 8%)" : "hsl(0 0% 100%)",
        paper: isDark ? "hsl(0 0% 10%)" : "hsl(0 0% 100%)",
      },
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: "var(--font-sans)",
    },
  });

  return <MUIThemeProvider theme={muiTheme}>{children}</MUIThemeProvider>;
}

