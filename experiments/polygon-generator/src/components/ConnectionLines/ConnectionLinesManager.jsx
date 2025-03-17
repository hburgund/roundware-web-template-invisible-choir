// components/ConnectionLines/ConnectionLinesManager.jsx
import React, { useState, useEffect } from 'react';

const ConnectionLinesManager = ({ map, markers, curveType, curveIntensity }) => {
  const [centerLines, setCenterLines] = useState([]);

  // Clean up lines when component unmounts
  useEffect(() => {
    return () => {
      clearAllCenterLines();
    };
  }, []);

  // Redraw lines when markers, curveType or intensity changes
  useEffect(() => {
    if (map && markers && markers.length > 1) {
      redrawAllCurves();
    }
  }, [markers, curveType, curveIntensity]);

  // Calculate bezier curve points
  const calculateCurvePoints = (start, end) => {
    const points = [];
    const numPoints = 50; // Number of points for a smooth curve

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
    const controlLat = midLat + normalizedOffsetLat * distance * curveIntensity;
    const controlLng = midLng + normalizedOffsetLng * distance * curveIntensity;

    // Calculate points based on curve type
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
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
        const height = Math.sin(Math.PI * t) * curveIntensity * distance * 0.5;
        const lat = baseLat + normalizedOffsetLat * height;
        const lng = baseLng + normalizedOffsetLng * height;
        points.push({ lat, lng });
      } else if (curveType === 'wave') {
        // Wavy line with multiple oscillations
        const baseLat = start.lat + t * (end.lat - start.lat);
        const baseLng = start.lng + t * (end.lng - start.lng);
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
    if (!map || !center1 || !center2 || !window.google) return null;

    const curvePoints = calculateCurvePoints(center1, center2);

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
    for (let i = 0; i < markers.length - 1; i++) {
      const current = markers[i].getPosition();
      const next = markers[i + 1].getPosition();

      const currentLatLng = { lat: current.lat(), lng: current.lng() };
      const nextLatLng = { lat: next.lat(), lng: next.lng() };

      drawCurveBetweenCenters(currentLatLng, nextLatLng);
    }
  };

  // Clear all center lines from the map
  const clearAllCenterLines = () => {
    centerLines.forEach(line => {
      line.setMap(null);
    });
    setCenterLines([]);
  };

  return null; // This is a non-visual component for managing lines
};

export { ConnectionLinesManager };
