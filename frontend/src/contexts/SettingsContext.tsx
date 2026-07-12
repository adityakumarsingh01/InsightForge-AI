"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface SettingsState {
  profile: {
    name: string;
    email: string;
  };
  appearance: {
    theme: "dark" | "light" | "system";
    accentColor: string;
  };
  workspace: {
    defaultAlgorithm: string;
  };
  notifications: {
    reportReady: boolean;
    modelTraining: boolean;
  };
}

const defaultSettings: SettingsState = {
  profile: {
    name: "Admin User",
    email: "admin@insightforge.ai",
  },
  appearance: {
    theme: "dark",
    accentColor: "blue", // "blue", "emerald", "purple", "rose"
  },
  workspace: {
    defaultAlgorithm: "random_forest_clf",
  },
  notifications: {
    reportReady: true,
    modelTraining: true,
  },
};

interface SettingsContextType {
  settings: SettingsState;
  updateSettings: (newSettings: Partial<SettingsState>) => void;
  updateProfile: (profile: Partial<SettingsState["profile"]>) => void;
  updateAppearance: (appearance: Partial<SettingsState["appearance"]>) => void;
  updateWorkspace: (workspace: Partial<SettingsState["workspace"]>) => void;
  updateNotifications: (notifications: Partial<SettingsState["notifications"]>) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("insightforge_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("insightforge_settings", JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  // Apply theme to DOM
  useEffect(() => {
    const applyTheme = () => {
      let isDark = settings.appearance.theme === "dark";
      if (settings.appearance.theme === "system") {
        isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      }
      
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };

    applyTheme();

    // Listen for system theme changes if set to system
    if (settings.appearance.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    // Inject accent color palette to override Tailwind's default blue
    const palettes = {
      blue: {
        50: "#eff6ff", 100: "#dbeafe", 200: "#bfdbfe", 300: "#93c5fd",
        400: "#60a5fa", 500: "#3b82f6", 600: "#2563eb", 700: "#1d4ed8",
        800: "#1e40af", 900: "#1e3a8a", 950: "#172554",
      },
      emerald: {
        50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7",
        400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857",
        800: "#065f46", 900: "#064e3b", 950: "#022c22",
      },
      purple: {
        50: "#faf5ff", 100: "#f3e8ff", 200: "#e9d5ff", 300: "#d8b4fe",
        400: "#c084fc", 500: "#a855f7", 600: "#9333ea", 700: "#7e22ce",
        800: "#6b21a8", 900: "#581c87", 950: "#3b0764",
      },
      rose: {
        50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af",
        400: "#fb7185", 500: "#f43f5e", 600: "#e11d48", 700: "#be123c",
        800: "#9f1239", 900: "#881337", 950: "#4c0519",
      }
    };
    
    const selectedPalette = palettes[settings.appearance.accentColor as keyof typeof palettes] || palettes.blue;
    
    // Override Tailwind's blue variables globally
    Object.entries(selectedPalette).forEach(([shade, color]) => {
      document.documentElement.style.setProperty(`--color-blue-${shade}`, color);
    });
    
    // Keep --accent for backwards compatibility where it was used inline
    document.documentElement.style.setProperty("--accent", selectedPalette[500]);
  }, [settings.appearance]);

  const updateSettings = (newSettings: Partial<SettingsState>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateProfile = (profile: Partial<SettingsState["profile"]>) => {
    setSettings((prev) => ({ ...prev, profile: { ...prev.profile, ...profile } }));
  };

  const updateAppearance = (appearance: Partial<SettingsState["appearance"]>) => {
    setSettings((prev) => ({ ...prev, appearance: { ...prev.appearance, ...appearance } }));
  };

  const updateWorkspace = (workspace: Partial<SettingsState["workspace"]>) => {
    setSettings((prev) => ({ ...prev, workspace: { ...prev.workspace, ...workspace } }));
  };

  const updateNotifications = (notifications: Partial<SettingsState["notifications"]>) => {
    setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, ...notifications } }));
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        settings, 
        updateSettings, 
        updateProfile, 
        updateAppearance, 
        updateWorkspace, 
        updateNotifications 
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
