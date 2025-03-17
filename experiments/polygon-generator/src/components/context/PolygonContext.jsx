// components/context/PolygonContext.jsx
import React, { createContext, useContext, useState } from 'react';

const PolygonContext = createContext();

export const PolygonProvider = ({ children }) => {
  const [activePolygons, setActivePolygons] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [lastMarker, setLastMarker] = useState(null);

  const addPolygon = (polygon, vertices) => {
    setActivePolygons(prev => [...prev, { polygon, vertices }]);
    return { polygon, vertices };
  };

  const clearPolygons = () => {
    setActivePolygons([]);
  };

  const addMarker = (marker) => {
    setMarkers(prev => [...prev, marker]);
    setLastMarker(marker);
    return marker;
  };

  const clearMarkers = () => {
    setMarkers([]);
    setLastMarker(null);
  };

  return (
    <PolygonContext.Provider
      value={{
        activePolygons,
        markers,
        lastMarker,
        addPolygon,
        clearPolygons,
        addMarker,
        clearMarkers
      }}
    >
      {children}
    </PolygonContext.Provider>
  );
};

export const usePolygonContext = () => useContext(PolygonContext);
