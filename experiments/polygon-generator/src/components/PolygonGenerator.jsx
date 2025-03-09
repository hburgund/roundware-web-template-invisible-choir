import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// Bedford, MA coordinates
const BEDFORD_CENTER = { lat: 42.4913, lng: -71.2767 };

const PolygonGenerator = () => {
  const [map, setMap] = useState(null);
  const [polygons, setPolygons] = useState([]);
  const [minSize, setMinSize] = useState(100);
  const [maxSize, setMaxSize] = useState(300);
  const [keepPolygons, setKeepPolygons] = useState(false);
  const [generatorMode, setGeneratorMode] = useState('random'); // 'random' or 'beechLeaf'

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
      script.onload = initMap;
      document.head.appendChild(script);
    } else if (window.google) {
      initMap();
    } else {
      // Script is loading but not ready yet, wait for it
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api"]');
      existingScript.addEventListener('load', initMap);
    }

    // Cleanup function
    return () => {
      if (polygons.length > 0) {
        clearAllPolygons();
      }
    };
  }, []);

  const initMap = () => {
    if (!googleMapRef.current) {
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: BEDFORD_CENTER,
        zoom: 14,
        mapTypeId: 'roadmap',
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

  // Generate a beech leaf-shaped polygon
  const generateBeechLeafPolygon = () => {
    if (!map) return;

    // Clear existing polygons if not keeping them
    if (!keepPolygons) {
      clearAllPolygons();
    }

    // Create a random center point near Bedford
    const centerLat = BEDFORD_CENTER.lat + getRandomInRange(-0.005, 0.005);
    const centerLng = BEDFORD_CENTER.lng + getRandomInRange(-0.005, 0.005);

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
      strokeOpacity: 0.8,
      strokeWeight: 1.5,
      fillColor: color,
      fillOpacity: 0.7,
      map: map
    });

    setPolygons(prev => [...prev, newPolygon]);

    // Fit the map to the polygon bounds
    const bounds = new window.google.maps.LatLngBounds();
    vertices.forEach(vertex => bounds.extend(vertex));
    map.fitBounds(bounds);
  };

  // Generate a random polygon (original function)
  const generateRandomPolygon = () => {
    if (!map) return;

    // Clear existing polygons if not keeping them
    if (!keepPolygons) {
      clearAllPolygons();
    }

    // Random number of sides between 3 and 8
    const sides = Math.floor(getRandomInRange(3, 9));

    // Create a random center point near Bedford
    const centerLat = BEDFORD_CENTER.lat + getRandomInRange(-0.01, 0.01);
    const centerLng = BEDFORD_CENTER.lng + getRandomInRange(-0.01, 0.01);

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

    setPolygons(prev => [...prev, newPolygon]);

    // Fit the map to the polygon bounds
    const bounds = new window.google.maps.LatLngBounds();
    vertices.forEach(vertex => bounds.extend(vertex));
    map.fitBounds(bounds);
  };

  // Generate polygon based on selected mode
  const generatePolygon = () => {
    if (generatorMode === 'beechLeaf') {
      generateBeechLeafPolygon();
    } else {
      generateRandomPolygon();
    }
  };

  // Clear all polygons from the map
  const clearAllPolygons = () => {
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

          <div className="flex space-x-2">
            <button
              onClick={generatePolygon}
              className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Generate {generatorMode === 'beechLeaf' ? 'Leaf' : 'Polygon'}
            </button>
            <button
              onClick={clearAllPolygons}
              className="flex-1 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
            >
              Clear All Shapes
            </button>
          </div>
        </CardContent>
      </Card>
      <div ref={mapRef} className="flex-grow w-full" />
    </div>
  );
};

export default PolygonGenerator;
