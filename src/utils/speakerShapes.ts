import { Feature, MultiPolygon, multiPolygon } from "@turf/helpers";
import { getRandomInRange } from "./math";

// Helper function to convert meters to latitude degrees
const metersToLatDegrees = (meters: number): number => {
  return meters / 111320; // 1 degree of latitude is approximately 111,320 meters
};

// Helper function to convert meters to longitude degrees
const metersToLngDegrees = (meters: number, lat: number): number => {
  return meters / (111320 * Math.cos((lat * Math.PI) / 180));
};

export const generateBeechLeafShape = (
  centerLocation: { lat: number; lng: number },
  options: { minSize?: number; maxSize?: number } = {}
): Feature<MultiPolygon> => {
  const { minSize = 10, maxSize = 30 } = options;
  const centerLat = centerLocation.lat;
  const centerLng = centerLocation.lng;

  // Random scale factor based on size range
  const scale = getRandomInRange(minSize, maxSize);

  // Random rotation angle in radians
  const rotation = getRandomInRange(0, Math.PI * 2);

  // Base points for a beech leaf shape (normalized)
  const basePoints = [
    { x: 0, y: -1 }, // Tip of leaf
    { x: 0.1, y: -0.95 }, // First serration on right
    { x: 0.2, y: -0.85 },
    { x: 0.3, y: -0.7 },
    { x: 0.4, y: -0.5 },
    { x: 0.5, y: -0.25 },
    { x: 0.55, y: 0 },
    { x: 0.5, y: 0.25 },
    { x: 0.4, y: 0.5 },
    { x: 0.25, y: 0.75 },
    { x: 0, y: 1 }, // Base of leaf
    { x: -0.25, y: 0.75 },
    { x: -0.4, y: 0.5 },
    { x: -0.5, y: 0.25 },
    { x: -0.55, y: 0 },
    { x: -0.5, y: -0.25 },
    { x: -0.4, y: -0.5 },
    { x: -0.3, y: -0.7 },
    { x: -0.2, y: -0.85 },
    { x: -0.1, y: -0.95 },
  ];

  // Transform points to actual coordinates
  const coordinates = basePoints.map((point) => {
    // Add slight randomness to each point (up to 10% variation)
    const randomX = point.x + getRandomInRange(-0.05, 0.05);
    const randomY = point.y + getRandomInRange(-0.05, 0.05);

    // Apply rotation
    const rotatedX =
      randomX * Math.cos(rotation) - randomY * Math.sin(rotation);
    const rotatedY =
      randomX * Math.sin(rotation) + randomY * Math.cos(rotation);

    // Scale and convert to lat/lng
    const latOffset = metersToLatDegrees(rotatedY * scale);
    const lngOffset = metersToLngDegrees(rotatedX * scale, centerLat);

    return [centerLng + lngOffset, centerLat + latOffset];
  });

  // Close the polygon by adding the first point at the end
  coordinates.push(coordinates[0]);

  // Create a MultiPolygon feature
  return multiPolygon([[coordinates]]);
};
