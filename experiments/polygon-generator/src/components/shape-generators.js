// shape-generators.js
import * as turf from '@turf/turf';

// Helper functions
const getRandomInRange = (min, max) => {
  return Math.random() * (max - min) + min;
};

const metersToLngDegrees = (meters, latitude) => {
  return meters / (111320 * Math.cos(latitude * Math.PI / 180));
};

const metersToLatDegrees = (meters) => {
  return meters / 111320;
};

// Calculate the centroid of a polygon
const calculateCentroid = (vertices) => {
  // Convert Google Maps LatLng array to GeoJSON format for turf.js
  const coordinates = vertices.map(vertex => [vertex.lng, vertex.lat]);
  // Close the polygon by adding the first vertex at the end
  coordinates.push(coordinates[0]);

  // Create a GeoJSON polygon
  const polygon = turf.polygon([coordinates]);

  // Calculate the centroid
  const centroid = turf.centroid(polygon);

  // Return the centroid as a Google Maps LatLng object
  return {
    lat: centroid.geometry.coordinates[1],
    lng: centroid.geometry.coordinates[0]
  };
};

// Base shape generator class
class ShapeGenerator {
  constructor(google, map) {
    this.google = google;
    this.map = map;
  }

  generateShape(centerLocation, options) {
    throw new Error('Method not implemented');
  }

  createPolygon(vertices, color) {
    return new this.google.maps.Polygon({
      paths: vertices,
      strokeColor: color.stroke || color.fill || '#000000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color.fill || '#000000',
      fillOpacity: 0.35,
      map: this.map
    });
  }

  getRandomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return {
      fill: `rgb(${r}, ${g}, ${b})`,
      stroke: `rgb(${r}, ${g}, ${b})`
    };
  }
}

// BeechLeaf shape generator
class BeechLeafGenerator extends ShapeGenerator {
  generateShape(centerLocation, options = {}) {
    const { minSize = 100, maxSize = 300 } = options;

    const centerLat = centerLocation.lat;
    const centerLng = centerLocation.lng;

    // Random scale factor based on size range
    const scale = getRandomInRange(minSize, maxSize);

    // Random rotation angle in radians
    const rotation = getRandomInRange(0, Math.PI * 2);

    // Base points for a beech leaf shape (normalized)
    const basePoints = [
      {x: 0, y: -1},      // Tip of leaf
      {x: 0.1, y: -0.95}, // First serration on right
      {x: 0.2, y: -0.85},
      {x: 0.3, y: -0.7},
      {x: 0.4, y: -0.5},
      {x: 0.5, y: -0.25},
      {x: 0.55, y: 0},
      {x: 0.5, y: 0.25},
      {x: 0.4, y: 0.5},
      {x: 0.25, y: 0.75},
      {x: 0, y: 1},       // Base of leaf
      {x: -0.25, y: 0.75},
      {x: -0.4, y: 0.5},
      {x: -0.5, y: 0.25},
      {x: -0.55, y: 0},
      {x: -0.5, y: -0.25},
      {x: -0.4, y: -0.5},
      {x: -0.3, y: -0.7},
      {x: -0.2, y: -0.85},
      {x: -0.1, y: -0.95}
    ];

    // Add some randomness to make each leaf slightly different
    const vertices = basePoints.map(point => {
      // Add slight randomness to each point (up to 10% variation)
      const randomX = point.x + getRandomInRange(-0.05, 0.05);
      const randomY = point.y + getRandomInRange(-0.05, 0.05);

      // Apply rotation
      const rotatedX = randomX * Math.cos(rotation) - randomY * Math.sin(rotation);
      const rotatedY = randomX * Math.sin(rotation) + randomY * Math.cos(rotation);

      // Scale and convert to lat/lng
      const latOffset = metersToLatDegrees(rotatedY * scale);
      const lngOffset = metersToLngDegrees(rotatedX * scale, centerLat);

      return {
        lat: centerLat + latOffset,
        lng: centerLng + lngOffset
      };
    });

    // Generate a green-yellow color within a natural leaf color range
    const g = Math.floor(getRandomInRange(100, 180)); // Green component
    const r = Math.floor(getRandomInRange(50, 120)); // Red component (less than green for green tint)
    const b = Math.floor(getRandomInRange(0, 50));  // Low blue for natural look

    const color = {
      fill: `rgb(${r}, ${g}, ${b})`,
      stroke: '#2E2E2E'
    };

    return {
      vertices,
      color,
      opacity: { stroke: 0.1, fill: 0.4 },
      weight: 1.0
    };
  }
}

// Orbicular Leaf shape generator
class OrbicularLeafGenerator extends ShapeGenerator {
  generateShape(centerLocation, options = {}) {
    const { minSize = 100, maxSize = 300 } = options;

    const centerLat = centerLocation.lat;
    const centerLng = centerLocation.lng;

    // Random scale factor based on size range
    const scale = getRandomInRange(minSize, maxSize);

    // Random rotation angle in radians
    const rotation = getRandomInRange(0, Math.PI * 2);

    // Number of points to create the rounded outline
    const numPoints = 28;

    // Base points for an orbicular (round) leaf shape
    const basePoints = [];

    // Generate a more circular leaf shape with slight sinusoidal variation for natural edges
    for (let i = 0; i < numPoints; i++) {
      const angle = (i * 2 * Math.PI / numPoints);

      // Create the basic circle
      let radius = 0.8;

      // Add small scalloped edges for a natural leaf look
      // Less pronounced serrations than beech leaf
      const edgeVariation = 0.08;
      const variationFrequency = 6; // Number of scallops around the edge
      radius += Math.sin(angle * variationFrequency) * edgeVariation;

      // Add slight bulge at the base for leaf stem attachment point
      if (angle > Math.PI * 0.8 && angle < Math.PI * 1.2) {
        radius += 0.15 * Math.sin((angle - Math.PI) * 2.5);
      }

      // Add point
      basePoints.push({
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle)
      });
    }

    // Add some randomness to make each leaf slightly different
    const vertices = basePoints.map(point => {
      // Add slight randomness to each point (up to 5% variation)
      const randomX = point.x + getRandomInRange(-0.03, 0.03);
      const randomY = point.y + getRandomInRange(-0.03, 0.03);

      // Apply rotation
      const rotatedX = randomX * Math.cos(rotation) - randomY * Math.sin(rotation);
      const rotatedY = randomX * Math.sin(rotation) + randomY * Math.cos(rotation);

      // Scale and convert to lat/lng
      const latOffset = metersToLatDegrees(rotatedY * scale);
      const lngOffset = metersToLngDegrees(rotatedX * scale, centerLat);

      return {
        lat: centerLat + latOffset,
        lng: centerLng + lngOffset
      };
    });

    // Generate a green color within a natural leaf color range
    // Orbicular leaves often have a deeper green color
    const g = Math.floor(getRandomInRange(120, 180)); // Green component
    const r = Math.floor(getRandomInRange(30, 100)); // Red component (less than green for green tint)
    const b = Math.floor(getRandomInRange(20, 80));  // Slightly more blue than beech leaves

    const color = {
      fill: `rgb(${r}, ${g}, ${b})`,
      stroke: '#2E2E2E'
    };

    return {
      vertices,
      color,
      opacity: { stroke: 0.1, fill: 0.4 },
      weight: 1.0
    };
  }
}

// Random polygon generator
class RandomPolygonGenerator extends ShapeGenerator {
  generateShape(centerLocation, options = {}) {
    const { minSize = 100, maxSize = 300 } = options;

    // Random number of sides between 3 and 8
    const sides = Math.floor(getRandomInRange(3, 9));

    const centerLat = centerLocation.lat;
    const centerLng = centerLocation.lng;

    // Generate vertices for the polygon
    const vertices = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI / sides);
      const length = getRandomInRange(minSize, maxSize);

      // Convert meters to degrees for lat/lng
      const latOffset = metersToLatDegrees(length * Math.sin(angle));
      const lngOffset = metersToLngDegrees(length * Math.cos(angle), centerLat);

      vertices.push({
        lat: centerLat + latOffset,
        lng: centerLng + lngOffset
      });
    }

    return {
      vertices,
      color: this.getRandomColor(),
      opacity: { stroke: 0.8, fill: 0.35 },
      weight: 2
    };
  }
}

/**
 * Expands a polygon outward from its centroid by a specified distance in meters
 * @param {Array} vertices - Array of {lat, lng} objects representing polygon vertices
 * @param {number} expansionMeters - Distance in meters to expand the polygon
 * @param {Object} [options] - Optional configuration
 * @param {boolean} [options.preserveShape=true] - If true, expansion maintains the original shape's character
 * @returns {Array} - New array of vertices representing the expanded polygon
 */
const expandPolygon = (vertices, expansionMeters, options = {}) => {
  const { preserveShape = true } = options;

  // Calculate the centroid of the polygon
  const centroid = calculateCentroid(vertices);

  // Expand each vertex outward from the centroid
  const expandedVertices = vertices.map(vertex => {
    // Vector from centroid to vertex (in lat/lng space)
    const vectorLat = vertex.lat - centroid.lat;
    const vectorLng = vertex.lng - centroid.lng;

    // Calculate the current distance from centroid to vertex in meters
    // Convert lat/lng differences to approximate meters
    const latMeters = vectorLat * 111320; // approx meters per degree latitude
    const lngMeters = vectorLng * 111320 * Math.cos(centroid.lat * Math.PI / 180); // adjusting for longitude

    // Euclidean distance in meters
    const currentDistanceMeters = Math.sqrt(latMeters * latMeters + lngMeters * lngMeters);

    // Calculate the expansion factor
    let expansionFactor;

    if (preserveShape) {
      // Add the expansion amount to the current distance
      expansionFactor = (currentDistanceMeters + expansionMeters) / currentDistanceMeters;
    } else {
      // Fixed expansion amount (less accurate for shape preservation)
      expansionFactor = 1 + (expansionMeters / currentDistanceMeters);
    }

    // Apply the expansion factor to get new lat/lng
    const newLat = centroid.lat + (vectorLat * expansionFactor);
    const newLng = centroid.lng + (vectorLng * expansionFactor);

    return {
      lat: newLat,
      lng: newLng
    };
  });

  return expandedVertices;
};

// Factory function to get the appropriate generator
const createShapeGenerator = (type, google, map) => {
  switch (type) {
    case 'beechLeaf':
      return new BeechLeafGenerator(google, map);
    case 'orbicularLeaf':
      return new OrbicularLeafGenerator(google, map);
    case 'random':
    default:
      return new RandomPolygonGenerator(google, map);
  }
};

export {
  createShapeGenerator,
  calculateCentroid,
  getRandomInRange,
  metersToLngDegrees,
  metersToLatDegrees,
  expandPolygon
};
