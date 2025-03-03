"use client";

import { createContext, useEffect, useState } from "react";

type colorTheme = "dark" | "light" | "system";

const AppContext = createContext<{
  colorTheme: colorTheme;
  setColorTheme: (colorTheme: colorTheme) => void;
}>({
  colorTheme: "system",
  setColorTheme: () => {},
});

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [systemTheme, setSystemTheme] = useState<"dark" | "light">("light");
  const [colorTheme, _setColorTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    let theme = localStorage.getItem("theme") as "dark" | "light";
    if (!theme) {
      const prefersDarkScheme = window.matchMedia(
        "(prefers-color-scheme: dark)",
      );
      theme = prefersDarkScheme.matches ? "dark" : "light";
    }
    setSystemTheme(theme);
    setColorTheme(theme);
    if (document) {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
  }, []);

  function setColorTheme(theme: colorTheme) {
    theme === "system" ? systemTheme : theme;
    if (document) {
      document.documentElement.classList.toggle("dark", theme === "dark");
    }
    localStorage.setItem("theme", theme);
    _setColorTheme(theme as "dark" | "light");
  }

  return (
    <AppContext.Provider
      value={{
        colorTheme,
        setColorTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export { AppContext, AppProvider };
