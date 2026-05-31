import { createContext, useContext, useState, useEffect } from "react";

type ColorTheme = "green" | "ocean" | "violet";
type DarkMode = "light" | "dark";

interface ThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (t: ColorTheme) => void;
  darkMode: DarkMode;
  setDarkMode: (m: DarkMode) => void;
  toggleDark: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  colorTheme: "green",
  setColorTheme: () => {},
  darkMode: "light",
  setDarkMode: () => {},
  toggleDark: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    return (localStorage.getItem("zira3a-color-theme") as ColorTheme) || "green";
  });

  const [darkMode, setDarkModeState] = useState<DarkMode>(() => {
    return (localStorage.getItem("zira3a-dark-mode") as DarkMode) || "light";
  });

  const applyTheme = (color: ColorTheme, dark: DarkMode) => {
    const root = document.documentElement;
    root.classList.remove("dark");
    root.setAttribute("data-theme", color);
    if (dark === "dark") root.classList.add("dark");
  };

  const setColorTheme = (t: ColorTheme) => {
    setColorThemeState(t);
    localStorage.setItem("zira3a-color-theme", t);
    applyTheme(t, darkMode);
  };

  const setDarkMode = (m: DarkMode) => {
    setDarkModeState(m);
    localStorage.setItem("zira3a-dark-mode", m);
    applyTheme(colorTheme, m);
  };

  const toggleDark = () => setDarkMode(darkMode === "dark" ? "light" : "dark");

  useEffect(() => {
    applyTheme(colorTheme, darkMode);
  }, []);

  return (
    <ThemeContext.Provider value={{ colorTheme, setColorTheme, darkMode, setDarkMode, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
