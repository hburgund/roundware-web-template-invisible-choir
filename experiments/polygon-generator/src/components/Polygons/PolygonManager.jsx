// components/Polygons/PolygonManager.jsx
import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { createShapeGenerator, expandPolygon, calculateCentroid } from '../shape-generators';

const PolygonManager = forwardRef(({
  map,
  generatorMode,
  minSize,
  maxSize,
  keepPolygons,
  onPolygonCreated,
  onPolygonsCleared,
  onPolygonExpanded
}, ref) => {
  const [polygons, setPolygons] = useState([]);
  const [polygonClickListeners, setPolygonClickListeners] = useState([]);
  const [clickListener, setClickListener] = useState(null);

  const shapeGeneratorRef = useRef(null);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    generatePolygonAtLocation,
    generateRandomPolygon,
    expandLastPolygon,
    clearAllPolygons,
    getAllPolygons: () => polygons
  }));

  // Set up map click listener when map is ready
  useEffect(() => {
    if (map && window.google) {
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
  }, [map, minSize, maxSize, generatorMode, keepPolygons]);

  // Update shape generator when mode changes
  useEffect(() => {
    if (map && window.google) {
      shapeGeneratorRef.current = createShapeGenerator(generatorMode, window.google, map);
    }
  }, [generatorMode, map]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      clearAllPolygons();
      if (clickListener && window.google) {
        window.google.maps.event.removeListener(clickListener);
      }
    };
  }, []);

  // Generate polygon at clicked location
  const generatePolygonAtLocation = (location) => {
    if (!map || !shapeGeneratorRef.current || !window.google) {
      console.warn("Cannot generate polygon: missing requirements");
      return null;
    }

    try {
      // Clear existing polygons if not keeping them
      if (!keepPolygons) {
        clearAllPolygons();
        if (onPolygonsCleared) {
          onPolygonsCleared();
        }
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
      setPolygons(prev => [...prev, newPolygon]);

      // Log the completion of polygon creation
      console.log("Polygon created at", location, "with", shapeInfo.vertices.length, "vertices");

      // Notify parent component that a polygon was created
      if (onPolygonCreated) {
        onPolygonCreated(newPolygon, shapeInfo.vertices);
      }

      return { polygon: newPolygon, vertices: shapeInfo.vertices };
    } catch (error) {
      console.error("Error generating polygon:", error);
      return null;
    }
  };

  // Generate polygon with random location
  const generateRandomPolygon = () => {
    // Bedford, MA coordinates
    const BEDFORD_CENTER = { lat: 45.45206769343375, lng: 9.162952783177321 };

    // Create a random center point near Bedford
    const randomLocation = {
      lat: BEDFORD_CENTER.lat + (Math.random() * 0.01 - 0.005),
      lng: BEDFORD_CENTER.lng + (Math.random() * 0.01 - 0.005)
    };

    console.log("Generating random polygon at", randomLocation);
    return generatePolygonAtLocation(randomLocation);
  };

  // Expand the last polygon
  const expandLastPolygon = (expansionValue, expansionUnit = 'meters') => {
    if (polygons.length === 0) {
      console.warn("No polygons to expand");
      return null;
    }

    try {
      // Get the last polygon
      const lastPolygon = polygons[polygons.length - 1];

      // Get the vertices of the last polygon
      const vertices = lastPolygon.getPath().getArray().map(vertex => ({
        lat: vertex.lat(),
        lng: vertex.lng()
      }));

      let expandedVertices;

      if (expansionUnit === 'percent') {
        // Calculate centroid for percentage-based expansion
        const centroid = calculateCentroid(vertices);

        // Apply percentage-based expansion
        expandedVertices = vertices.map(vertex => {
          // Vector from centroid to vertex
          const vectorLat = vertex.lat - centroid.lat;
          const vectorLng = vertex.lng - centroid.lng;

          // Scale factor (e.g., 10% = 1.1, 50% = 1.5)
          const scaleFactor = 1 + (expansionValue / 100);

          // Apply scaling
          return {
            lat: centroid.lat + (vectorLat * scaleFactor),
            lng: centroid.lng + (vectorLng * scaleFactor)
          };
        });
      } else {
        // Use the existing expandPolygon function for fixed-meter expansion
        expandedVertices = expandPolygon(vertices, expansionValue);
      }

      // Update the polygon path
      lastPolygon.setPath(expandedVertices);

      console.log("Expanded polygon by", expansionValue, expansionUnit);

      // Notify parent component that a polygon was expanded
      if (onPolygonExpanded) {
        onPolygonExpanded(lastPolygon, expandedVertices);
      }

      return { polygon: lastPolygon, vertices: expandedVertices };
    } catch (error) {
      console.error("Error expanding polygon:", error);
      return null;
    }
  };

  // Clear all polygons from the map
  const clearAllPolygons = () => {
    // Remove click listeners first
    polygonClickListeners.forEach(listener => {
      if (window.google) {
        try {
          window.google.maps.event.removeListener(listener);
        } catch (error) {
          console.error("Error removing polygon click listener:", error);
        }
      }
    });
    setPolygonClickListeners([]);

    // Then remove the polygons
    polygons.forEach(polygon => {
      try {
        polygon.setMap(null);
      } catch (error) {
        console.error("Error removing polygon from map:", error);
      }
    });
    setPolygons([]);

    console.log("All polygons cleared");

    // Notify parent component that polygons were cleared
    if (onPolygonsCleared) {
      onPolygonsCleared();
    }
  };

  // Return null as this is a non-visual component
  return null;
});

export { PolygonManager };
