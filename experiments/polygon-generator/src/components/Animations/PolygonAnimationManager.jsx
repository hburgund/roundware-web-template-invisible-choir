// components/Animations/PolygonAnimationManager.jsx
import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';

const PolygonAnimationManager = forwardRef(({
  polygons,
  animateOpacity,
  minOpacity,
  maxOpacity,
  animationPeriodRange
}, ref) => {
  const animationRef = useRef(null);
  const polygonAnimationData = useRef({});

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    addPolygonToAnimation,
    updatePolygonAnimations
  }));

  // Animation function
  const animatePolygons = useCallback((timestamp) => {
    let isAnyActive = false;

    // Go through each polygon and update its opacity
    Object.entries(polygonAnimationData.current).forEach(([id, data]) => {
      if (!data.active) return;

      isAnyActive = true;

      // Calculate current opacity based on elapsed time
      const elapsedTime = timestamp - data.startTime;

      // Use sine wave for smooth continuous oscillation (0 to 1 to 0)
      const sineProgress = (Math.sin(2 * Math.PI * elapsedTime / data.period) + 1) / 2;

      // Calculate opacity value between min and max
      const opacity = data.minOpacity + (data.maxOpacity - data.minOpacity) * sineProgress;

      // Apply opacity to the polygon
      if (data.polygon) {
        data.polygon.setOptions({ fillOpacity: opacity });
      }
    });

    // Continue animation loop if there are active animations
    if (isAnyActive) {
      animationRef.current = requestAnimationFrame(animatePolygons);
    } else {
      animationRef.current = null;
    }
  }, []);

  // Start/stop animation system
  useEffect(() => {
    if (animateOpacity) {
      // Initialize animation data for all polygons
      if (polygons.length > 0) {
        updatePolygonAnimations();
      }

      // Start animation if not already running
      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animatePolygons);
      }
    } else {
      // Stop animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;

        // Reset all opacities to default
        Object.entries(polygonAnimationData.current).forEach(([id, data]) => {
          if (data.polygon) {
            data.polygon.setOptions({ fillOpacity: 0.35 });
          }
        });

        // Clear animation data
        polygonAnimationData.current = {};
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [animateOpacity, animatePolygons, polygons]);

  // Update animation settings for all polygons
  const updatePolygonAnimations = () => {
    // Clear existing animation data
    polygonAnimationData.current = {};

    // Set up animation data for each polygon
    polygons.forEach((polygon, index) => {
      const polygonId = `polygon-${Date.now()}-${index}`;

      // Generate a random period within the configured range
      const minPeriod = animationPeriodRange[0] * 1000; // Convert to ms
      const maxPeriod = animationPeriodRange[1] * 1000; // Convert to ms
      const period = Math.random() * (maxPeriod - minPeriod) + minPeriod;

      // Store animation data for this polygon
      polygonAnimationData.current[polygonId] = {
        polygon: polygon,
        active: true,
        startTime: performance.now(),
        period: period,
        minOpacity: minOpacity,
        maxOpacity: maxOpacity
      };
    });
  };

  // Add animation for a new polygon
  const addPolygonToAnimation = (polygon) => {
    if (!animateOpacity) return;

    const polygonId = `polygon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Generate a random period within the configured range
    const minPeriod = animationPeriodRange[0] * 1000; // Convert to ms
    const maxPeriod = animationPeriodRange[1] * 1000; // Convert to ms
    const period = Math.random() * (maxPeriod - minPeriod) + minPeriod;

    // Store animation data for this polygon
    polygonAnimationData.current[polygonId] = {
      polygon: polygon,
      active: true,
      startTime: performance.now(),
      period: period,
      minOpacity: minOpacity,
      maxOpacity: maxOpacity
    };

    // Start animation if not already running
    if (!animationRef.current) {
      animationRef.current = requestAnimationFrame(animatePolygons);
    }
  };

  return null;
};

export { PolygonAnimationManager };
