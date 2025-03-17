// components/Markers/MarkerManager.jsx
import React, { useState, useEffect } from 'react';
import { calculateCentroid } from '../shape-generators';

const MarkerManager = ({ map, onMarkersChanged }) => {
  const [centerMarkers, setCenterMarkers] = useState([]);
  const [lastCenterMarker, setLastCenterMarker] = useState(null);

  // Clean up markers when component unmounts
  useEffect(() => {
    return () => {
      clearAllCenterMarkers();
    };
  }, []);

  // Effect to notify parent when markers change
  useEffect(() => {
    if (onMarkersChanged) {
      onMarkersChanged(centerMarkers, lastCenterMarker);
    }
  }, [centerMarkers, lastCenterMarker, onMarkersChanged]);

  // Add a center marker to the polygon
  const addCenterMarker = (vertices) => {
    if (!map || !window.google) return null;

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

    // Update the last center marker
    setLastCenterMarker(marker);
    setCenterMarkers(prev => [...prev, marker]);
    return marker;
  };

  // Clear all center markers from the map
  const clearAllCenterMarkers = () => {
    centerMarkers.forEach(marker => {
      marker.setMap(null);
    });
    setCenterMarkers([]);
    setLastCenterMarker(null);
  };

  return null; // This is a non-visual component for managing markers
};

export { MarkerManager };
