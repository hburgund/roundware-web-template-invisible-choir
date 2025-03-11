import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import * as turf from '@turf/turf';

// Bedford, MA coordinates
const BEDFORD_CENTER = { lat: 42.4913, lng: -71.2767 };

const PolygonGenerator = () => {
  const [map, setMap] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [centerMarkers, setCenterMarkers] = useState([]);
  const [centerLines, setCenterLines] = useState([]);
  const [minSize, setMinSize] = useState(100);
  const [maxSize, setMaxSize] = useState(300);
  const [keepPolygons, setKeepPolygons] = useState(true);
  const [generatorMode, setGeneratorMode] = useState('beechLeaf');
  const [lastCenterMarker, setLastCenterMarker] = useState(null);
  const [clickListener, setClickListener] = useState(null);
  const [polygonClickListeners, setPolygonClickListeners] = useState([]);
  const [curveIntensity, setCurveIntensity] = useState(0.5); // New state for curve intensity
  const [curveType, setCurveType] = useState('bezier'); // New state for curve type

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);

  // Initialize Google Maps
  useEffect(() => {
    // Check if the script is already loaded or loading
    if (!window.google && !document.querySelector('script[src*="maps.googleapis.com/maps/api"]')) {
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=geometry';
      script.async = true;
      script.defer = true;
      script.id = 'google-maps-script';
      script.onload = () => {
        // Load Turf.js after Google Maps is loaded
        const turfScript = document.createElement('script');
        turfScript.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
        turfScript.onload = initMap;
        document.head.appendChild(turfScript);
      };
      document.head.appendChild(script);
    } else if (window.google) {
      if (window.turf) {
        initMap();
      } else {
        // Load Turf.js if Google Maps is already loaded
        const turfScript = document.createElement('script');
        turfScript.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
        turfScript.onload = initMap;
        document.head.appendChild(turfScript);
      }
    } else {
      // Script is loading but not ready yet, wait for it
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api"]');
      existingScript.addEventListener('load', () => {
        const turfScript = document.createElement('script');
        turfScript.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
        turfScript.onload = initMap;
        document.head.appendChild(turfScript);
      });
    }

    // Cleanup function
    return () => {
      if (polygons.length > 0) {
        clearAllPolygons();
      }
      if (centerMarkers.length > 0) {
        clearAllCenterMarkers();
      }
      if (centerLines.length > 0) {
        clearAllCenterLines();
      }
      if (clickListener) {
        window.google?.maps.event.removeListener(clickListener);
      }
      // Clean up polygon click listeners
      if (polygonClickListeners.length > 0) {
        polygonClickListeners.forEach(listener => {
          window.google?.maps.event.removeListener(listener);
        });
      }
    };
  }, []);

  // Set up map click listener when map is ready
  useEffect(() => {
    if (map) {
      // Remove any existing click listener
      if (clickListener) {
        window.google.maps.event.removeListener(clickListener);
      }

      // Add new click listener
      const listener = map.addListener('click', (event) => {
        const clickedLocation = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng()
        };
        generatePolygonAtLocation(clickedLocation);
      });

      setClickListener(listener);

      return () => {
        window.google.maps.event.removeListener(listener);
      };
    }
  }, [map, minSize, maxSize, generatorMode, keepPolygons]); // Re-add listener when these params change

  // Update curves when curve intensity changes
  useEffect(() => {
    if (map && centerMarkers.length > 1) {
      redrawAllCurves();
    }
  }, [curveIntensity, curveType]);

  const initMap = () => {
    if (!googleMapRef.current) {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: BEDFORD_CENTER,
        zoom: 14,
        mapTypeId: 'roadmap',
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER
        }
      });
      googleMapRef.current = newMap;
      setMap(newMap);
    }
  };

  // Generate a random number within a range
  const getRandomInRange = (min, max) => {
    return Math.random() * (max - min) + min;
  };

  // Convert meters to degrees at a specific latitude
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

  // Clear all center lines from the map
  const clearAllCenterLines = () => {
    centerLines.forEach(line => {
      line.setMap(null);
    });
    setCenterLines([]);
  };

  // Calculate bezier curve points
  const calculateBezierPoints = (start, end) => {
    const points = [];
    const numPoints = 50; // Number of points to create a smooth curve

    // Calculate midpoint for control point positioning
    const midLat = (start.lat + end.lat) / 2;
    const midLng = (start.lng + end.lng) / 2;

    // Calculate distance for determining control point offset
    const latDiff = end.lat - start.lat;
    const lngDiff = end.lng - start.lng;
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    // Perpendicular offset direction (rotate 90 degrees)
    const offsetLat = -lngDiff;
    const offsetLng = latDiff;

    // Normalize the offset vector and scale by distance and curve intensity
    const offsetLength = Math.sqrt(offsetLat * offsetLat + offsetLng * offsetLng);
    const normalizedOffsetLat = offsetLat / offsetLength;
    const normalizedOffsetLng = offsetLng / offsetLength;

    // Control point - perpendicular to the middle of the line
    // The curve intensity controls how far away the control point is
    const controlLat = midLat + normalizedOffsetLat * distance * curveIntensity;
    const controlLng = midLng + normalizedOffsetLng * distance * curveIntensity;

    // For quadratic Bezier curve
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;

      // Quadratic Bezier curve formula: B(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
      const oneMinusT = 1 - t;
      const oneMinusTSquared = oneMinusT * oneMinusT;
      const tSquared = t * t;

      if (curveType === 'bezier') {
        // Quadratic Bezier curve with one control point
        const lat = oneMinusTSquared * start.lat + 2 * oneMinusT * t * controlLat + tSquared * end.lat;
        const lng = oneMinusTSquared * start.lng + 2 * oneMinusT * t * controlLng + tSquared * end.lng;
        points.push({ lat, lng });
      } else if (curveType === 'arcuate') {
        // Simple arc using sine function for height
        const baseLat = start.lat + t * (end.lat - start.lat);
        const baseLng = start.lng + t * (end.lng - start.lng);

        // Apply a sine wave transformation for height
        const height = Math.sin(Math.PI * t) * curveIntensity * distance * 0.5;
        const lat = baseLat + normalizedOffsetLat * height;
        const lng = baseLng + normalizedOffsetLng * height;
        points.push({ lat, lng });
      } else if (curveType === 'wave') {
        // Wavy line with multiple oscillations
        const baseLat = start.lat + t * (end.lat - start.lat);
        const baseLng = start.lng + t * (end.lng - start.lng);

        // Multiple oscillations (3 waves)
        const oscillations = 3;
        const height = Math.sin(Math.PI * t * oscillations) * curveIntensity * distance * 0.3;
        const lat = baseLat + normalizedOffsetLat * height;
        const lng = baseLng + normalizedOffsetLng * height;
        points.push({ lat, lng });
      }
    }

    return points;
  };

  // Draw a curved line between two center markers
  const drawCurveBetweenCenters = (center1, center2) => {
    if (!map || !center1 || !center2) return;

    const curvePoints = calculateBezierPoints(center1, center2);

    const line = new window.google.maps.Polyline({
      path: curvePoints,
      geodesic: true,
      strokeColor: '#FFFFFF',
      strokeOpacity: 0.7,
      strokeWeight: 1,
      map: map
    });

    setCenterLines(prev => [...prev, line]);
    return line;
  };

  // Redraw all curves with current curve intensity
  const redrawAllCurves = () => {
    // Clear existing lines
    clearAllCenterLines();

    // Redraw lines between adjacent markers
    for (let i = 0; i < centerMarkers.length - 1; i++) {
      const current = centerMarkers[i].getPosition();
      const next = centerMarkers[i + 1].getPosition();

      const currentLatLng = { lat: current.lat(), lng: current.lng() };
      const nextLatLng = { lat: next.lat(), lng: next.lng() };

      drawCurveBetweenCenters(currentLatLng, nextLatLng);
    }
  };

  // Add a center marker to the polygon
  const addCenterMarker = (vertices) => {
    const center = calculateCentroid(vertices);

    const marker = new window.google.maps.Marker({
      position: center,
      map: map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#FFFFFF',
        fillOpacity: 1,
        strokeColor: '#000000',
        strokeWeight: 0,
        scale: 3
      }
    });

    // If there's a previous center marker, draw a curve connecting them
    if (lastCenterMarker) {
      const lastPosition = lastCenterMarker.getPosition();
      const lastLatLng = { lat: lastPosition.lat(), lng: lastPosition.lng() };
      drawCurveBetweenCenters(lastLatLng, center);
    }

    // Update the last center marker
    setLastCenterMarker(marker);
    setCenterMarkers(prev => [...prev, marker]);
    return marker;
  };

  // Generate a beech leaf-shaped polygon at a specific location
  const generateBeechLeafPolygonAtLocation = (centerLocation) => {
    if (!map) return;

    // Clear existing polygons if not keeping them
    if (!keepPolygons) {
      clearAllPolygons();
      clearAllCenterMarkers();
      clearAllCenterLines();
      setLastCenterMarker(null);
    }

    const centerLat = centerLocation.lat;
    const centerLng = centerLocation.lng;

    // Random scale factor based on size range - directly use the slider values
    const scale = getRandomInRange(minSize, maxSize);

    // Random rotation angle in radians
    const rotation = getRandomInRange(0, Math.PI * 2);

    // Base points for a beech leaf shape (normalized)
    // These points define the characteristic elliptical shape with serrated edges
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

      // Scale and convert to lat/lng - multiply by scale directly
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
    const color = `rgb(${r}, ${g}, ${b})`;

    const newPolygon = new window.google.maps.Polygon({
      paths: vertices,
      strokeColor: '#2E2E2E',
      strokeOpacity: 0.1,
      strokeWeight: 1.0,
      fillColor: color,
      fillOpacity: 0.4,
      map: map
    });

    // Add click listener to the polygon
    const polygonClickListener = newPolygon.addListener('click', (event) => {
      const clickedLocation = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      // Prevent event from propagating to the map
      event.stop();
      // Generate a new polygon at the clicked location
      generatePolygonAtLocation(clickedLocation);
    });

    // Add to polygon click listeners array for cleanup
    setPolygonClickListeners(prev => [...prev, polygonClickListener]);

    // Add center marker
    const centerMarker = addCenterMarker(vertices);

    setPolygons(prev => [...prev, newPolygon]);
  };

  // Generate a random polygon at a specific location
  const generateRandomPolygonAtLocation = (centerLocation) => {
    if (!map) return;

    // Clear existing polygons if not keeping them
    if (!keepPolygons) {
      clearAllPolygons();
      clearAllCenterMarkers();
      clearAllCenterLines();
      setLastCenterMarker(null);
    }

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

    // Random color for the polygon
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    const color = `rgb(${r}, ${g}, ${b})`;

    const newPolygon = new window.google.maps.Polygon({
      paths: vertices,
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: color,
      fillOpacity: 0.35,
      map: map
    });

    // Add click listener to the polygon
    const polygonClickListener = newPolygon.addListener('click', (event) => {
      const clickedLocation = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
      // Prevent event from propagating to the map
      event.stop();
      // Generate a new polygon at the clicked location
      generatePolygonAtLocation(clickedLocation);
    });

    // Add to polygon click listeners array for cleanup
    setPolygonClickListeners(prev => [...prev, polygonClickListener]);

    // Add center marker
    const centerMarker = addCenterMarker(vertices);

    setPolygons(prev => [...prev, newPolygon]);
  };

  // Generate polygon at clicked location based on selected mode
  const generatePolygonAtLocation = (location) => {
    if (generatorMode === 'beechLeaf') {
      generateBeechLeafPolygonAtLocation(location);
    } else {
      generateRandomPolygonAtLocation(location);
    }
  };

  // Generate polygon with random location based on selected mode
  const generatePolygon = () => {
    // Create a random center point near Bedford
    const randomLocation = {
      lat: BEDFORD_CENTER.lat + getRandomInRange(-0.005, 0.005),
      lng: BEDFORD_CENTER.lng + getRandomInRange(-0.005, 0.005)
    };

    generatePolygonAtLocation(randomLocation);
  };

  // Clear all center markers from the map
  const clearAllCenterMarkers = () => {
    centerMarkers.forEach(marker => {
      marker.setMap(null);
    });
    setCenterMarkers([]);
    setLastCenterMarker(null);
  };

  // Clear all polygons from the map
  const clearAllPolygons = () => {
    // Remove click listeners first
    polygonClickListeners.forEach(listener => {
      window.google.maps.event.removeListener(listener);
    });
    setPolygonClickListeners([]);

    // Then remove the polygons
    polygons.forEach(polygon => {
      polygon.setMap(null);
    });
    setPolygons([]);
  };

  const handleInputChange = (setter) => (e) => {
    let value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setter(value);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Card className="m-4">
        <CardHeader>
          <CardTitle>Polygon Generator - Bedford, MA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Polygon Type:</label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      name="polygonType"
                      value="random"
                      checked={generatorMode === 'random'}
                      onChange={() => setGeneratorMode('random')}
                    />
                    <span className="ml-2">Random Polygons</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio"
                      name="polygonType"
                      value="beechLeaf"
                      checked={generatorMode === 'beechLeaf'}
                      onChange={() => setGeneratorMode('beechLeaf')}
                    />
                    <span className="ml-2">Beech Leaf Shapes</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Min Size (meters): {minSize}
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={minSize}
                  onChange={handleInputChange(setMinSize)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Max Size (meters): {maxSize}
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={maxSize}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= minSize) {
                      setMaxSize(value);
                    }
                  }}
                  className="w-full"
                />
              </div>
            </div>

            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Connection Curve Settings:</label>
                <div className="mb-2">
                  <label className="block text-sm font-medium mb-1">
                    Curve Type:
                  </label>
                  <select
                    value={curveType}
                    onChange={(e) => setCurveType(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="bezier">Bezier Curve</option>
                    <option value="arcuate">Simple Arc</option>
                    <option value="wave">Wavy Line</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Curve Intensity: {curveIntensity.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={curveIntensity}
                    onChange={(e) => setCurveIntensity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                <div className="mt-2">
                  <button
                    onClick={redrawAllCurves}
                    className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded w-full"
                  >
                    Apply Curve Changes
                  </button>
                </div>
              </div>

              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="keepPolygons"
                  checked={keepPolygons}
                  onChange={(e) => setKeepPolygons(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="keepPolygons" className="text-sm font-medium">
                  Keep previous polygons when generating new ones
                </label>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 mt-4">
            <button
              onClick={generatePolygon}
              className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Generate {generatorMode === 'beechLeaf' ? 'Leaf' : 'Polygon'}
            </button>
            <button
              onClick={() => {
                clearAllPolygons();
                clearAllCenterMarkers();
                clearAllCenterLines();
              }}
              className="flex-1 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Clear All Shapes
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p>Click anywhere on the map or on existing shapes to create a new shape at that location.</p>
          </div>
        </CardContent>
      </Card>
      <div ref={mapRef} className="flex-grow w-full" />
    </div>
  );
};

export default PolygonGenerator;
