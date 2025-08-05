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

/**
 * Normalizes a hex color for case-insensitive comparison
 * @param color - Hex color string
 * @returns Normalized hex color in uppercase
 */
export function normalizeHexColor(color: string): string {
  return color.trim().toUpperCase();
}

/**
 * Groups speakers by their fill_color (case-insensitive)
 * @param speakers - Array of speakers with color data
 * @returns Map of normalized fill_color to array of speakers
 */
export function groupSpeakersByFillColor(speakers: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  for (const speaker of speakers) {
    // Skip speakers with invalid fill_color
    if (!isValidColor(speaker.fill_color)) {
      continue;
    }
    
    const normalizedColor = normalizeHexColor(speaker.fill_color);
    
    if (!groups.has(normalizedColor)) {
      groups.set(normalizedColor, []);
    }
    groups.get(normalizedColor)!.push(speaker);
  }
  
  return groups;
}

/**
 * Selects color pair using cascading logic based on parent speakers
 * @param parentSpeakers - Array of parent speakers
 * @returns Color pair object or null if should fall back to random config selection
 */
export function selectCascadingColorPair(parentSpeakers: any[]): { fill_color: string; border_color?: string } | null {
  // No parents - fall back to random config selection
  if (!parentSpeakers || parentSpeakers.length === 0) {
    return null;
  }
  
  // Group parents by fill_color
  const colorGroups = groupSpeakersByFillColor(parentSpeakers);
  
  // No parents with valid colors - fall back to random config selection
  if (colorGroups.size === 0) {
    return null;
  }
  
  // Find the group(s) with the most parents
  const maxGroupSize = Math.max(...Array.from(colorGroups.values()).map(group => group.length));
  const largestGroups = Array.from(colorGroups.entries()).filter(([_, group]) => group.length === maxGroupSize);
  
  // For ties, randomly select one of the tied groups
  const randomIndex = Math.floor(Math.random() * largestGroups.length);
  const [selectedColor, selectedGroup] = largestGroups[randomIndex];
  
  // Use the color pair from any speaker in the selected group (they all share the same fill_color)
  const representativeSpeaker = selectedGroup[0];
  
  return {
    fill_color: representativeSpeaker.fill_color,
    border_color: isValidColor(representativeSpeaker.border_color) ? representativeSpeaker.border_color : undefined
  };
}

/**
 * Selects a color pair for a new speaker using cascading logic
 * @param parentSpeakers - Array of parent speakers
 * @returns Color pair object with fill_color and optional border_color
 * 
 * @example
 * // Scenario 1: One parent
 * getNewSpeakerColorPair([{fill_color: "#7F1D1D", border_color: "#B45309"}])
 * // Returns: {fill_color: "#7F1D1D", border_color: "#B45309"}
 * 
 * // Scenario 2: Multiple parents, clear predominance
 * getNewSpeakerColorPair([
 *   {fill_color: "#7F1D1D", border_color: "#B45309"},  // red
 *   {fill_color: "#7F1D1D", border_color: "#B45309"},  // red  
 *   {fill_color: "#059669", border_color: "#065F46"}   // green
 * ])
 * // Returns: {fill_color: "#7F1D1D", border_color: "#B45309"} (red wins 2-1)
 * 
 * // Scenario 3: Tie between colors
 * getNewSpeakerColorPair([
 *   {fill_color: "#7F1D1D", border_color: "#B45309"},  // red
 *   {fill_color: "#059669", border_color: "#065F46"}   // green
 * ])
 * // Returns: randomly either red or green color pair
 * 
 * // Scenario 4: No parents
 * getNewSpeakerColorPair([])
 * // Returns: random color pair from config
 */
export function getNewSpeakerColorPair(parentSpeakers: any[] = []): { fill_color: string; border_color?: string } {
  // Try cascading selection first
  const cascadingColors = selectCascadingColorPair(parentSpeakers);
  
  if (cascadingColors) {
    return cascadingColors;
  }
  
  // Fall back to random config selection
  return getRandomSpeakerColorPair();
} 