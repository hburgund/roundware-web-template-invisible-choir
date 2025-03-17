// components/Map/GoogleMap.jsx
import React, { useEffect, useRef } from 'react';

const GoogleMap = ({ onMapReady, mapOptions = {} }) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);

  // Default map center (Bedford, MA)
  const defaultCenter = { lat: 45.45206769343375, lng: 9.162952783177321 };

  // Default map options
  const defaultMapOptions = {
    center: defaultCenter,
    zoom: 14,
    mapTypeId: 'roadmap',
    zoomControl: true,
    zoomControlOptions: {
      position: window.google?.maps.ControlPosition.RIGHT_CENTER
    },
    tilt: 0,
    gestureHandling: 'greedy',
    maxZoom: 21,
    minZoom: 10
  };

  useEffect(() => {
    // Load Google Maps script if not loaded
    if (!window.google && !document.querySelector('script[src*="maps.googleapis.com/maps/api"]')) {
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=geometry';
      script.async = true;
      script.defer = true;
      script.id = 'google-maps-script';
      script.onload = () => {
        // Load Turf.js after Google Maps
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
      // Script is loading but not ready yet
      const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api"]');
      existingScript.addEventListener('load', () => {
        const turfScript = document.createElement('script');
        turfScript.src = 'https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js';
        turfScript.onload = initMap;
        document.head.appendChild(turfScript);
      });
    }

    // Initialize the map
    const initMap = () => {
      if (!googleMapRef.current) {
        const combinedOptions = { ...defaultMapOptions, ...mapOptions };
        const newMap = new window.google.maps.Map(mapRef.current, combinedOptions);
        googleMapRef.current = newMap;

        // Notify parent component that map is ready
        if (onMapReady) {
          onMapReady(newMap);
        }

        // Ensure map resizes correctly
        setTimeout(() => {
          window.google.maps.event.trigger(newMap, 'resize');
        }, 100);
      }
    };

    // Resize handler
    const handleResize = () => {
      if (googleMapRef.current) {
        window.google.maps.event.trigger(googleMapRef.current, 'resize');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [mapOptions, onMapReady]);

  return <div ref={mapRef} className="w-full h-full" />;
};

export default GoogleMap;
