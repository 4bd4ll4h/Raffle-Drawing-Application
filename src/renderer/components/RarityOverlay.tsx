import React from "react";
import { CS2_RARITY_LEVELS } from "../../types";

interface RarityOverlayProps {
  rarity: string;
  children: React.ReactNode;
  className?: string;
  showGlow?: boolean;
  intensity?: "subtle" | "normal" | "intense";
  style?: React.CSSProperties;
}

/**
 * RarityOverlay component provides consistent rarity visual effects across all animation styles
 * Implements requirements 5.4, 5.5, 5.6 for visual consistency and color overlays
 */
export const RarityOverlay: React.FC<RarityOverlayProps> = ({
  rarity,
  children,
  className = "",
  showGlow = true,
  intensity = "normal",
  style = {},
}) => {
  const rarityInfo = CS2_RARITY_LEVELS[rarity];

  if (!rarityInfo) {
    // No rarity overlay for invalid rarity
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const { color, name } = rarityInfo;

  // Convert hex to RGB for opacity calculations
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 };
  };

  const rgb = hexToRgb(color);

  // Calculate intensity-based opacity and glow
  const getIntensityValues = () => {
    switch (intensity) {
      case "subtle":
        return { borderOpacity: 0.3, glowOpacity: 0.2, glowBlur: 5 };
      case "intense":
        return { borderOpacity: 0.8, glowOpacity: 0.6, glowBlur: 15 };
      default:
        return { borderOpacity: 0.5, glowOpacity: 0.4, glowBlur: 10 };
    }
  };

  const { borderOpacity, glowOpacity, glowBlur } = getIntensityValues();

  // Create gradient background
  const createGradient = () => {
    return `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3) 100%)`;
  };

  const overlayStyle: React.CSSProperties = {
    position: "relative",
    border: `2px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${borderOpacity})`,
    borderRadius: "8px",
    background: createGradient(),
    boxShadow: showGlow
      ? `0 0 ${glowBlur}px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${glowOpacity}), inset 0 1px 0 rgba(255, 255, 255, 0.1)`
      : "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
    transition: "all 0.3s ease",
    ...style,
  };

  return (
    <div
      className={`rarity-overlay rarity-${rarity} ${className}`}
      style={overlayStyle}
      data-rarity={rarity}
      data-rarity-name={name}
      title={`${name} (${(rarityInfo.chance * 100).toFixed(3)}%)`}
    >
      {children}

      {/* Rarity indicator badge */}
      <div
        className="rarity-badge"
        style={{
          position: "absolute",
          top: "-8px",
          right: "-8px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          backgroundColor: color,
          border: "2px solid white",
          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
          zIndex: 10,
        }}
        title={name}
      />
    </div>
  );
};

/**
 * RarityBorder component for simpler border-only rarity indication
 */
interface RarityBorderProps {
  rarity: string;
  children: React.ReactNode;
  className?: string;
  thickness?: number;
  style?: React.CSSProperties;
}

export const RarityBorder: React.FC<RarityBorderProps> = ({
  rarity,
  children,
  className = "",
  thickness = 2,
  style = {},
}) => {
  const rarityInfo = CS2_RARITY_LEVELS[rarity];

  if (!rarityInfo) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const borderStyle: React.CSSProperties = {
    border: `${thickness}px solid ${rarityInfo.color}`,
    borderRadius: "4px",
    ...style,
  };

  return (
    <div
      className={`rarity-border rarity-${rarity} ${className}`}
      style={borderStyle}
      data-rarity={rarity}
      title={rarityInfo.name}
    >
      {children}
    </div>
  );
};

/**
 * RarityGlow component for glow-only effects
 */
interface RarityGlowProps {
  rarity: string;
  children: React.ReactNode;
  className?: string;
  intensity?: "subtle" | "normal" | "intense";
  style?: React.CSSProperties;
}

export const RarityGlow: React.FC<RarityGlowProps> = ({
  rarity,
  children,
  className = "",
  intensity = "normal",
  style = {},
}) => {
  const rarityInfo = CS2_RARITY_LEVELS[rarity];

  if (!rarityInfo) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const getGlowIntensity = () => {
    switch (intensity) {
      case "subtle":
        return { blur: 5, opacity: 0.3 };
      case "intense":
        return { blur: 20, opacity: 0.8 };
      default:
        return { blur: 10, opacity: 0.5 };
    }
  };

  const { blur } = getGlowIntensity();

  const glowStyle: React.CSSProperties = {
    filter: `drop-shadow(0 0 ${blur}px ${rarityInfo.color})`,
    transition: "filter 0.3s ease",
    ...style,
  };

  return (
    <div
      className={`rarity-glow rarity-${rarity} ${className}`}
      style={glowStyle}
      data-rarity={rarity}
    >
      {children}
    </div>
  );
};

/**
 * RarityText component for text with rarity colors
 */
interface RarityTextProps {
  rarity: string;
  children: React.ReactNode;
  className?: string;
  variant?: "solid" | "gradient" | "outline";
  style?: React.CSSProperties;
}

export const RarityText: React.FC<RarityTextProps> = ({
  rarity,
  children,
  className = "",
  variant = "solid",
  style = {},
}) => {
  const rarityInfo = CS2_RARITY_LEVELS[rarity];

  if (!rarityInfo) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }

  const { color } = rarityInfo;

  const getTextStyle = () => {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 255, g: 255, b: 255 };
    };

    const rgb = hexToRgb(color);
    const lighterColor = `rgb(${Math.min(255, rgb.r + 50)}, ${Math.min(255, rgb.g + 50)}, ${Math.min(255, rgb.b + 50)})`;

    switch (variant) {
      case "gradient":
        return {
          background: `linear-gradient(45deg, ${color}, ${lighterColor})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        };
      case "outline":
        return {
          color: "transparent",
          WebkitTextStroke: `1px ${color}`,
          textStroke: `1px ${color}`,
        };
      default:
        return {
          color: color,
        };
    }
  };

  const textStyle: React.CSSProperties = {
    fontWeight: "bold",
    textShadow: `0 0 5px ${rarityInfo.color}40`,
    ...getTextStyle(),
    ...style,
  };

  return (
    <span
      className={`rarity-text rarity-${rarity} ${className}`}
      style={textStyle}
      data-rarity={rarity}
    >
      {children}
    </span>
  );
};

/**
 * Utility function to get rarity CSS class name
 */
export const getRarityClassName = (rarity: string): string => {
  return `rarity-${rarity}`;
};

/**
 * Utility function to get rarity CSS variables for custom styling
 */
export const getRarityCSSVariables = (
  rarity: string
): Record<string, string> => {
  const rarityInfo = CS2_RARITY_LEVELS[rarity];

  if (!rarityInfo) {
    return {};
  }

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 };
  };

  const rgb = hexToRgb(rarityInfo.color);

  return {
    "--rarity-color": rarityInfo.color,
    "--rarity-rgb": `${rgb.r}, ${rgb.g}, ${rgb.b}`,
    "--rarity-name": rarityInfo.name,
    "--rarity-chance": rarityInfo.chance.toString(),
  };
};
