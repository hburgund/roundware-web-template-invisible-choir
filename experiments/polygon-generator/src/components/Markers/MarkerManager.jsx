// components/Markers/MarkerManager.jsx
import React, { useState, useEffect } from 'react';
import { calculateCentroid } from '../shape-generators';

const MarkerManager = ({ map, onMarkersChanged }) => {
  const [centerMarkers, setCenterMarkers] = useState([]);

  // Clean up markers when component unmounts
  useEffect(() => {
    return () => {
      clearAllCenterMarkers();
    };
  }, []);

  // Effect to notify parent when markers change
  useEffect(() => {
    if (onMarkersChanged) {
      console.log("MarkerManager: Notifying parent of marker changes, count:", centerMarkers.length);
      onMarkersChanged(centerMarkers);
    }
  }, [centerMarkers, onMarkersChanged]);

  // Add a center marker to the polygon
  const addCenterMarker = (vertices) => {
    if (!map || !window.google) {
      console.warn("Cannot add marker: map or google not available");
      return null;
    }

    try {
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

      // Update markers
      setCenterMarkers(prev => {
        const newMarkers = [...prev, marker];
        console.log("MarkerManager: Added new marker, total:", newMarkers.length);
        return newMarkers;
      });

      return marker;
    } catch (error) {
      console.error("Error adding center marker:", error);
      return null;
    }
  };

  // Clear all center markers from the map
  const clearAllCenterMarkers = () => {
    centerMarkers.forEach(marker => {
      try {
        marker.setMap(null);
      } catch (error) {
        console.error("Error clearing marker:", error);
      }
    });
    setCenterMarkers([]);
  };

  return null; // This is a non-visual component for managing markers
};

export { MarkerManager };
