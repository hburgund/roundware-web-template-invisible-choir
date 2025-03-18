// components/ConnectionLines/ConnectionLineAnimationManager.jsx
import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const ConnectionLineAnimationManager = forwardRef(({
  map,
  markers,
  curveType,
  curveIntensity,
  animateConnections = false,
  animationSpeed = 1.0,
  waveAmplitude = 1.0,
  waveFrequency = 1.0,
  animationPattern = 'sine'
}, ref) => {
  const animationRef = useRef(null);
  const connectionLinesRef = useRef([]);
  const animationDataRef = useRef({
    startTime: performance.now(),
    lines: []
  });

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    addLine,
    removeLine,
    removeAllLines,
    startAnimation,
    stopAnimation,
    updateAnimationSettings
  }));

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      removeAllLines();
    };
  }, []);

  // Start/stop animation based on prop
  useEffect(() => {
    if (animateConnections) {
      startAnimation();
    } else {
      stopAnimation();
    }
  }, [animateConnections]);

  // Update line configurations when markers or curve settings change
  useEffect(() => {
    if (map && markers && markers.length > 1) {
      recreateAllLines();
    }
  }, [map, markers, curveType, curveIntensity]);

  // Calculate bezier curve points with time-based variation
  const calculateAnimatedCurvePoints = useCallback((start, end, timeOffset = 0) => {
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

    // Normalize the offset vector
    const offsetLength = Math.sqrt(offsetLat * offsetLat + offsetLng * offsetLng);
    const normalizedOffsetLat = offsetLat / offsetLength;
    const normalizedOffsetLng = offsetLng / offsetLength;

    // Apply time-based animation to curve intensity
    // This is where the undulation magic happens
    let animatedIntensity = curveIntensity;

    if (animationPattern === 'sine') {
      // Sinusoidal wave pattern
      animatedIntensity = curveIntensity * (1 + Math.sin(timeOffset * animationSpeed * 0.001 * waveFrequency) * waveAmplitude * 0.5);
    } else if (animationPattern === 'pulse') {
      // Pulsing pattern
      const pulse = Math.sin(timeOffset * animationSpeed * 0.001 * waveFrequency) * 0.5 + 0.5;
      animatedIntensity = curveIntensity * (1 + pulse * waveAmplitude * 0.5);
    } else if (animationPattern === 'flow') {
      // Flowing pattern with phase shift along the curve
      // Each point will have its own phase based on position
    }

    // Control point - perpendicular to the middle of the line with animated intensity
    const controlLat = midLat + normalizedOffsetLat * distance * animatedIntensity;
    const controlLng = midLng + normalizedOffsetLng * distance * animatedIntensity;

    // Calculate points based on curve type
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const oneMinusT = 1 - t;
      const oneMinusTSquared = oneMinusT * oneMinusT;
      const tSquared = t * t;

      let lat, lng;

      if (curveType === 'bezier') {
        // Quadratic Bezier curve with one control point
        lat = oneMinusTSquared * start.lat + 2 * oneMinusT * t * controlLat + tSquared * end.lat;
        lng = oneMinusTSquared * start.lng + 2 * oneMinusT * t * controlLng + tSquared * end.lng;
      } else if (curveType === 'arcuate') {
        // Simple arc using sine function for height
        const baseLat = start.lat + t * (end.lat - start.lat);
        const baseLng = start.lng + t * (end.lng - start.lng);

        // For the flow animation pattern, apply a traveling wave
        let pointHeightFactor = 1.0;
        if (animationPattern === 'flow') {
          // Create a traveling wave effect along the line
          pointHeightFactor = 1 + Math.sin(t * Math.PI * 5 + timeOffset * animationSpeed * 0.001) * waveAmplitude * 0.3;
        }

        const height = Math.sin(Math.PI * t) * animatedIntensity * distance * 0.5 * pointHeightFactor;
        lat = baseLat + normalizedOffsetLat * height;
        lng = baseLng + normalizedOffsetLng * height;
      } else if (curveType === 'wave') {
        // Wavy line with multiple oscillations
        const baseLat = start.lat + t * (end.lat - start.lat);
        const baseLng = start.lng + t * (end.lng - start.lng);

        // For the flow animation pattern, modify the wave frequency/phase over time
        let oscillations = 3;
        let phaseShift = 0;
        if (animationPattern === 'flow') {
          phaseShift = timeOffset * animationSpeed * 0.001;
        }

        const height = Math.sin(Math.PI * t * oscillations + phaseShift) * animatedIntensity * distance * 0.3;
        lat = baseLat + normalizedOffsetLat * height;
        lng = baseLng + normalizedOffsetLng * height;
      }

      points.push({ lat, lng });
    }

    return points;
  }, [curveType, curveIntensity, animationSpeed, waveAmplitude, waveFrequency, animationPattern]);

  // Animation function
  const animateLines = useCallback((timestamp) => {
    const elapsedTime = timestamp - animationDataRef.current.startTime;

    // Update each line
    animationDataRef.current.lines.forEach(lineData => {
      if (!lineData.line || !lineData.active) return;

      try {
        const start = lineData.startPoint;
        const end = lineData.endPoint;

        // Calculate new path points with animation effects
        const animatedPoints = calculateAnimatedCurvePoints(start, end, elapsedTime);

        // Update the line path
        lineData.line.setPath(animatedPoints);
      } catch (error) {
        console.error('Error animating line:', error);
        lineData.active = false;
      }
    });

    // Continue animation loop if we're still animating
    if (animateConnections) {
      animationRef.current = requestAnimationFrame(animateLines);
    }
  }, [calculateAnimatedCurvePoints, animateConnections]);

  // Start the animation
  const startAnimation = () => {
    if (!animationRef.current) {
      animationDataRef.current.startTime = performance.now();
      animationRef.current = requestAnimationFrame(animateLines);
    }
  };

  // Stop the animation
  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;

      // Reset lines to their default static state
      resetLinePositions();
    }
  };

  // Reset line positions to their default state
  const resetLinePositions = () => {
    animationDataRef.current.lines.forEach(lineData => {
      if (!lineData.line) return;

      try {
        const start = lineData.startPoint;
        const end = lineData.endPoint;

        // Calculate default curve points without animation
        const defaultPoints = calculateAnimatedCurvePoints(start, end, 0);

        // Reset the line path
        lineData.line.setPath(defaultPoints);
      } catch (error) {
        console.error('Error resetting line position:', error);
      }
    });
  };

  // Add a new connection line
  const addLine = (startPoint, endPoint) => {
    if (!map || !window.google) return null;

    try {
      // Calculate initial curve points
      const initialPoints = calculateAnimatedCurvePoints(startPoint, endPoint, 0);

      // Create the polyline
      const line = new window.google.maps.Polyline({
        path: initialPoints,
        geodesic: true,
        strokeColor: '#FFFFFF',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        map: map
      });

      // Store the line in our refs
      connectionLinesRef.current.push(line);

      // Add to animation data
      const lineData = {
        line,
        startPoint,
        endPoint,
        active: true
      };

      animationDataRef.current.lines.push(lineData);

      return line;
    } catch (error) {
      console.error('Error adding connection line:', error);
      return null;
    }
  };

  // Remove a specific line
  const removeLine = (line) => {
    if (!line) return;

    try {
      // Remove from map
      line.setMap(null);

      // Remove from our arrays
      connectionLinesRef.current = connectionLinesRef.current.filter(l => l !== line);
      animationDataRef.current.lines = animationDataRef.current.lines.filter(data => data.line !== line);
    } catch (error) {
      console.error('Error removing line:', error);
    }
  };

  // Remove all lines
  const removeAllLines = () => {
    connectionLinesRef.current.forEach(line => {
      if (line) {
        try {
          line.setMap(null);
        } catch (error) {
          console.error('Error removing line from map:', error);
        }
      }
    });

    connectionLinesRef.current = [];
    animationDataRef.current.lines = [];
  };

  // Recreate all lines based on current markers
  const recreateAllLines = () => {
    // Remove existing lines
    removeAllLines();

    // Create new lines between adjacent markers
    if (markers && markers.length > 1) {
      for (let i = 0; i < markers.length - 1; i++) {
        try {
          const current = markers[i].getPosition();
          const next = markers[i + 1].getPosition();

          if (!current || !next) {
            console.warn('Invalid marker position at index', i);
            continue;
          }

          const currentLatLng = { lat: current.lat(), lng: current.lng() };
          const nextLatLng = { lat: next.lat(), lng: next.lng() };

          addLine(currentLatLng, nextLatLng);
        } catch (error) {
          console.error('Error creating line at index', i, error);
        }
      }
    }
  };

  // Update animation settings
  const updateAnimationSettings = (settings) => {
    if (!settings) return;

    // Update animation properties if provided
    if (settings.animationSpeed !== undefined) animationSpeed = settings.animationSpeed;
    if (settings.waveAmplitude !== undefined) waveAmplitude = settings.waveAmplitude;
    if (settings.waveFrequency !== undefined) waveFrequency = settings.waveFrequency;
    if (settings.animationPattern !== undefined) animationPattern = settings.animationPattern;

    // Force a rerender of lines with new settings
    if (animateConnections) {
      // No need to stop and restart the animation, it will pick up the new settings
      // on the next frame due to the useCallback dependencies
    }
  };

  return null; // This is a non-visual component
});

export { ConnectionLineAnimationManager };
