"use client";

import { createContext, useState } from "react";

const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
const currentTheme = prefersDarkScheme.matches ? "dark" : "light";

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
  const [colorTheme, _setColorTheme] = useState<colorTheme>("system");

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
