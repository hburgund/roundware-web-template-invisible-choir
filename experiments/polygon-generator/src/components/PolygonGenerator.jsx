import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import * as turf from '@turf/turf';
import { createShapeGenerator, calculateCentroid } from './shape-generators';

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
  const [curveIntensity, setCurveIntensity] = useState(0.5);
  const [curveType, setCurveType] = useState('bezier');

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const shapeGeneratorRef = useRef(null);

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

      // Initialize shape generator
      shapeGeneratorRef.current = createShapeGenerator(generatorMode, window.google, map);

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

  // Update shape generator when mode changes
  useEffect(() => {
    if (map && window.google) {
      shapeGeneratorRef.current = createShapeGenerator(generatorMode, window.google, map);
    }
  }, [generatorMode, map]);

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

  // Generate polygon at clicked location based on selected mode
  const generatePolygonAtLocation = (location) => {
    if (!map || !shapeGeneratorRef.current) return;

    // Clear existing polygons if not keeping them
    if (!keepPolygons) {
      clearAllPolygons();
      clearAllCenterMarkers();
      clearAllCenterLines();
      setLastCenterMarker(null);
    }

    // Generate shape using the appropriate generator
    const shapeInfo = shapeGeneratorRef.current.generateShape(location, { minSize, maxSize });

    // Create the polygon
    const newPolygon = new window.google.maps.Polygon({
      paths: shapeInfo.vertices,
      strokeColor: shapeInfo.color.stroke,
      strokeOpacity: shapeInfo.opacity?.stroke || 0.8,
      strokeWeight: shapeInfo.weight || 2,
      fillColor: shapeInfo.color.fill,
      fillOpacity: shapeInfo.opacity?.fill || 0.35,
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
    const centerMarker = addCenterMarker(shapeInfo.vertices);

    setPolygons(prev => [...prev, newPolygon]);
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

  // Get random number in range
  const getRandomInRange = (min, max) => {
    return Math.random() * (max - min) + min;
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
