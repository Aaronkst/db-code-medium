"use client";

import { createContext, useEffect, useState } from "react";

type colorTheme = "dark" | "light" | "system";

// TODO: add user creds later.
const AppContext = createContext<{
  colorTheme: colorTheme;
  setColorTheme: (colorTheme: colorTheme) => void;
}>({
  colorTheme: "system",
  setColorTheme: () => {},
});

const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("light");
  const [colorTheme, _setColorTheme] = useState<colorTheme>("light");

  useEffect(() => {
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    setCurrentTheme(prefersDarkScheme.matches ? "dark" : "light");
  }, []);

  function setColorTheme(theme: colorTheme) {
    _setColorTheme(theme === "system" ? currentTheme : theme);
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
