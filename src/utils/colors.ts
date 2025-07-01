import finalConfig from '@/config';
import { ParsedColor } from '@/types';

/**
 * Parses a hex color string with optional alpha channel
 * @param hexColor - Hex color string like "#FF0000" or "#FF000080"
 * @returns ParsedColor object with color, alpha, and hasAlpha properties
 */
export function parseHexColor(hexColor: string): ParsedColor {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  if (hex.length === 6) {
    // No alpha channel
    return {
      color: `#${hex}`,
      alpha: null,
      hasAlpha: false
    };
  } else if (hex.length === 8) {
    // Has alpha channel
    const color = `#${hex.substring(0, 6)}`;
    const alphaHex = hex.substring(6, 8);
    const alpha = parseInt(alphaHex, 16) / 255;
    
    return {
      color,
      alpha,
      hasAlpha: true
    };
  } else {
    throw new Error(`Invalid hex color format: ${hexColor}`);
  }
}

/**
 * Checks if the config uses color pairs format vs simple color array
 */
export function isColorPairsFormat(colors: string[] | [string, string][]): colors is [string, string][] {
  return Array.isArray(colors[0]);
}

/**
 * Gets all fill colors from config (backward compatibility)
 * @returns Array of fill color strings
 */
export function getFillColorsFromConfig(): string[] {
  const colors = finalConfig.map.speakerPolygonColors;
  if (isColorPairsFormat(colors)) {
    return colors.map(pair => pair[0]); // First color is fill
  }
  return colors;
}

/**
 * Selects a random color from the configured speaker polygon colors (backward compatibility)
 * @returns A hex color string from the configuration (fill color only)
 */
export function getRandomSpeakerColor(): string {
  const fillColors = getFillColorsFromConfig();
  const randomIndex = Math.floor(Math.random() * fillColors.length);
  return fillColors[randomIndex];
}

/**
 * Selects a random color pair from the configured speaker polygon colors
 * @returns Object with fill_color and border_color, or just fill_color if old format
 */
export function getRandomSpeakerColorPair(): { fill_color: string; border_color?: string } {
  const colors = finalConfig.map.speakerPolygonColors;
  const randomIndex = Math.floor(Math.random() * colors.length);
  
  if (isColorPairsFormat(colors)) {
    const [fillColor, borderColor] = colors[randomIndex];
    return {
      fill_color: fillColor,
      border_color: borderColor
    };
  } else {
    return {
      fill_color: colors[randomIndex]
    };
  }
}

/**
 * Checks if a color value is valid (not null, undefined, or empty)
 * @param color - The color value to check
 * @returns True if the color is valid
 */
export function isValidColor(color: string | null | undefined): color is string {
  return typeof color === 'string' && color.trim().length > 0;
}

/**
 * Gets the fill opacity for a speaker polygon
 * @param fillColor - The fill color (may include alpha)
 * @param defaultOpacity - Default opacity to use if no alpha channel
 * @returns The opacity value to use
 */
export function getFillOpacity(fillColor: string | undefined, defaultOpacity: number = 0.25): number {
  if (!isValidColor(fillColor)) {
    return defaultOpacity;
  }
  
  try {
    const parsed = parseHexColor(fillColor);
    return parsed.hasAlpha && parsed.alpha !== null ? parsed.alpha : defaultOpacity;
  } catch {
    return defaultOpacity;
  }
}

/**
 * Gets the stroke opacity for a speaker polygon border
 * @param borderColor - The border color (may include alpha)
 * @param defaultOpacity - Default opacity to use if no alpha channel
 * @returns The opacity value to use
 */
export function getStrokeOpacity(borderColor: string | undefined, defaultOpacity: number = 1): number {
  if (!isValidColor(borderColor)) {
    return 0; // No border if no color
  }
  
  try {
    const parsed = parseHexColor(borderColor);
    return parsed.hasAlpha && parsed.alpha !== null ? parsed.alpha : defaultOpacity;
  } catch {
    return defaultOpacity;
  }
}

/**
 * Gets the base color without alpha channel
 * @param color - The color (may include alpha)
 * @returns The color without alpha channel
 */
export function getBaseColor(color: string | undefined): string | undefined {
  if (!isValidColor(color)) {
    return undefined;
  }
  
  try {
    const parsed = parseHexColor(color);
    return parsed.color;
  } catch {
    return color;
  }
} 