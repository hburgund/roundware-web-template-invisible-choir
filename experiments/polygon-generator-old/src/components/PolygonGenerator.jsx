import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

// Bedford, MA coordinates
const BEDFORD_CENTER = { lat: 42.4913, lng: -71.2767 };

const PolygonGenerator = () => {
  const [map, setMap] = useState(null);
  const [polygon, setPolygon] = useState(null);
  const [minSides, setMinSides] = useState(3);
  const [maxSides, setMaxSides] = useState(8);
  const [minLength, setMinLength] = useState(100);
  const [maxLength, setMaxLength] = useState(500);

  const mapRef = useRef(null);
  const googleMapRef = useRef(null);

  // Initialize Google Maps
  useEffect(() => {
    // Check if the script is already loaded or loading
    if (!window.google && !document.querySelector('script[src*="maps.googleapis.com/maps/api"]')) {
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCmYUeVE8rq7no5-uWa1Js1JCY154WM8Is&libraries=geometry';
      script.async = true;
      script.defer = true;
      script.id = 'google-maps-script'; // Add an ID to easily identify it
      script.onload = initMap;
      document.head.appendChild(script);
    } else if (window.google) {
      initMap();
    } else {
      // Script is loading but not ready yet, wait for it
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api"]');
      existingScript.addEventListener('load', initMap);
    }

    // Cleanup function to handle component unmounting
    return () => {
      if (googleMapRef.current && map) {
        // Clean up any event listeners or resources if needed
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

  // Generate a random polygon
  const generatePolygon = () => {
    if (!map) return;

    // Clear existing polygon
    if (polygon) {
      polygon.setMap(null);
    }

    // Random number of sides within range
    const sides = Math.floor(getRandomInRange(minSides, maxSides + 1));

    // Create a random center point near Bedford
    const centerLat = BEDFORD_CENTER.lat + getRandomInRange(-0.01, 0.01);
    const centerLng = BEDFORD_CENTER.lng + getRandomInRange(-0.01, 0.01);
    const center = { lat: centerLat, lng: centerLng };

    // Generate vertices for the polygon
    const vertices = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i * 2 * Math.PI / sides);
      const length = getRandomInRange(minLength, maxLength);

      // Convert meters to degrees for lat/lng
      const latOffset = metersToLatDegrees(length * Math.sin(angle));
      const lngOffset = metersToLngDegrees(length * Math.cos(angle), centerLat);

      vertices.push({
        lat: centerLat + latOffset,
        lng: centerLng + lngOffset
      });
    }

    // Create and display the polygon
    const newPolygon = new window.google.maps.Polygon({
      paths: vertices,
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      map: map
    });

    setPolygon(newPolygon);

    // Fit the map to the polygon bounds
    const bounds = new window.google.maps.LatLngBounds();
    vertices.forEach(vertex => bounds.extend(vertex));
    map.fitBounds(bounds);
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
          <CardTitle>Random Polygon Generator - Bedford, MA</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Min Sides: {minSides}
              </label>
              <input
                type="range"
                min="3"
                max="20"
                value={minSides}
                onChange={handleInputChange(setMinSides)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Sides: {maxSides}
              </label>
              <input
                type="range"
                min="3"
                max="20"
                value={maxSides}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= minSides) {
                    setMaxSides(value);
                  }
                }}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Min Length (meters): {minLength}
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={minLength}
                onChange={handleInputChange(setMinLength)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Max Length (meters): {maxLength}
              </label>
              <input
                type="range"
                min="50"
                max="1000"
                step="50"
                value={maxLength}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= minLength) {
                    setMaxLength(value);
                  }
                }}
                className="w-full"
              />
            </div>
          </div>
          <button
            onClick={generatePolygon}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Generate New Polygon
          </button>
        </CardContent>
      </Card>
      <div ref={mapRef} className="flex-grow" />
    </div>
  );
};

export default PolygonGenerator;
