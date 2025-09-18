import React, { createContext, useState, useEffect } from "react";
import { platformThemes } from "../shared/utils/themeColorUtils";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("Vibrant");

  useEffect(() => {
    document.body.className = `theme-${theme.toLowerCase()}`;
  }, [theme]);

  const themeColors = platformThemes[theme] || platformThemes["Vibrant"];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeColors }}>
      {children}
    </ThemeContext.Provider>
  );
};