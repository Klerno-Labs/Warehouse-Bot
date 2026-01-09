import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

interface Branding {
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  favicon?: string;
  customCSS?: string;
}

export function useBranding() {
  const { data, isLoading } = useQuery<{ branding: Branding }>({
    queryKey: ["/api/tenant/branding"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (!data?.branding) return;

    const branding = data.branding;

    // Apply primary color as CSS variable
    if (branding.primaryColor) {
      document.documentElement.style.setProperty("--brand-primary", branding.primaryColor);

      // Convert hex to HSL for better theme integration
      const hsl = hexToHSL(branding.primaryColor);
      if (hsl) {
        document.documentElement.style.setProperty("--primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
      }
    }

    // Apply secondary color
    if (branding.secondaryColor) {
      document.documentElement.style.setProperty("--brand-secondary", branding.secondaryColor);
    }

    // Update favicon
    if (branding.favicon) {
      const link: HTMLLinkElement = document.querySelector("link[rel*='icon']") || document.createElement("link");
      link.type = "image/x-icon";
      link.rel = "shortcut icon";
      link.href = branding.favicon;
      if (!document.querySelector("link[rel*='icon']")) {
        document.head.appendChild(link);
      }
    }

    // Inject custom CSS
    if (branding.customCSS) {
      let styleElement = document.getElementById("custom-branding-css") as HTMLStyleElement;

      if (!styleElement) {
        styleElement = document.createElement("style");
        styleElement.id = "custom-branding-css";
        document.head.appendChild(styleElement);
      }

      styleElement.textContent = branding.customCSS;
    }

    // Cleanup function
    return () => {
      // Remove custom CSS on unmount
      const styleElement = document.getElementById("custom-branding-css");
      if (styleElement) {
        styleElement.textContent = "";
      }
    };
  }, [data]);

  return {
    branding: data?.branding,
    isLoading,
  };
}

// Helper function to convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, "");

  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
