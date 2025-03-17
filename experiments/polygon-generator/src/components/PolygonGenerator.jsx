// components/PolygonGenerator.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PolygonProvider, usePolygonContext } from './context/PolygonContext';

// Import our new components
import GoogleMap from './Map/GoogleMap';
import { PolygonManager } from './Polygons/PolygonManager';
import { MarkerManager } from './Markers/MarkerManager';
import { ConnectionLinesManager } from './ConnectionLines/ConnectionLinesManager';
import { PolygonAnimationManager } from './Animations/PolygonAnimationManager';
import { calculateCentroid } from './shape-generators';

// Import UI components
import PolygonControls from './PolygonControls';
import FloorplanControls from './FloorplanControls';

const PolygonGeneratorContent = () => {
  // Core state
  const [map, setMap] = useState(null);
  const [activeTab, setActiveTab] = useState('polygons');

  // Polygon control states
  const [minSize, setMinSize] = useState(100);
  const [maxSize, setMaxSize] = useState(300);
  const [keepPolygons, setKeepPolygons] = useState(true);
  const [generatorMode, setGeneratorMode] = useState('beechLeaf');

  // Marker and line states
  const [centerMarkers, setCenterMarkers] = useState([]);
  const [curveType, setCurveType] = useState('bezier');
  const [curveIntensity, setCurveIntensity] = useState(0.5);

  // Animation states
  const [animateOpacity, setAnimateOpacity] = useState(false);
  const [minOpacity, setMinOpacity] = useState(0.2);
  const [maxOpacity, setMaxOpacity] = useState(0.8);
  const [animationPeriodRange, setAnimationPeriodRange] = useState([5, 15]);

  // Floorplan states
  const [floorplanOverlay, setFloorplanOverlay] = useState(null);
  const [floorplanVisible, setFloorplanVisible] = useState(false);

  // Component refs
  const polygonManagerRef = useRef(null);
  const animationManagerRef = useRef(null);

  // Bedford, MA coordinates
  const BEDFORD_CENTER = { lat: 45.45206769343375, lng: 9.162952783177321 };

  // Get polygon context
  const {
    activePolygons,
    markers,
    lastMarker,
    addPolygon,
    clearPolygons
  } = usePolygonContext();

  // Debugging logs to help diagnose the issue
  useEffect(() => {
    console.log("centerMarkers updated:", centerMarkers.length);
  }, [centerMarkers]);

  // Handle marker creation after polygon generation
  const handlePolygonCreated = (polygon, vertices) => {
    if (map && window.google) {
      const center = calculateCentroid(vertices);

      // Create the marker
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

      // Update markers directly in state
      setCenterMarkers(prev => {
        const updatedMarkers = [...prev, marker];
        console.log("Added new marker, total markers:", updatedMarkers.length);
        return updatedMarkers;
      });

      // If animation is enabled, add this polygon to the animation system
      if (animateOpacity && animationManagerRef.current) {
        animationManagerRef.current.addPolygonToAnimation(polygon);
      }
    }
  };

  // Handle polygon expansion
  const handleExpandPolygon = (expansionAmount, expansionUnit) => {
    if (polygonManagerRef.current) {
      const result = polygonManagerRef.current.expandLastPolygon(expansionAmount, expansionUnit);

      if (!result) {
        alert("No polygon to expand. Please create a polygon first.");
      }
    }
  };

  // Generate a new polygon
  const generatePolygon = () => {
    if (polygonManagerRef.current) {
      polygonManagerRef.current.generateRandomPolygon();
    }
  };

  // Clear all shapes
  const handleClearShapes = () => {
    if (polygonManagerRef.current) {
      polygonManagerRef.current.clearAllPolygons();

      // Clear markers manually to ensure they're removed from the map
      centerMarkers.forEach(marker => {
        if (marker && typeof marker.setMap === 'function') {
          marker.setMap(null);
        }
      });

      // Update state with empty array to trigger ConnectionLinesManager update
      setCenterMarkers([]);

      console.log("All shapes and markers cleared");
    }
  };

  // Toggle animations or update animation settings
  const handleToggleAnimations = () => {
    if (!animateOpacity) return;

    if (animationManagerRef.current) {
      animationManagerRef.current.updatePolygonAnimations();
    }
  };

  // Apply curve changes to redraw connection lines
  const handleApplyCurveChanges = () => {
    // This will trigger a re-render of the ConnectionLinesManager with updated props
    console.log("Applying curve changes with", centerMarkers.length, "markers");
    // Force a rerender by creating a new array with the same elements
    setCenterMarkers([...centerMarkers]);
  };

  // Initialize component refs when map is ready
  const handleMapReady = (googleMap) => {
    setMap(googleMap);
  };

  // Handle markers changed from MarkerManager
  const handleMarkersChanged = (markers) => {
    // This function is no longer needed as we're managing markers directly
    // in handlePolygonCreated, but keeping for backward compatibility
    console.log("handleMarkersChanged called with", markers?.length || 0, "markers");
  };

  return (
    <div className="flex h-screen">
      {/* Left Column for Controls - 25% width */}
      <div className="w-1/4 h-full overflow-y-auto bg-gray-50 border-r border-gray-200">
        <Card className="h-full rounded-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Polygon Generator</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Bedford, MA</p>

            {/* Tabs for different control sections */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                  <button
                    className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300
                              whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                              ${activeTab === 'polygons' ? 'border-blue-500 text-blue-600' : ''}`}
                    onClick={() => setActiveTab('polygons')}
                  >
                    Polygons
                  </button>
                  <button
                    className={`border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300
                              whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                              ${activeTab === 'floorplans' ? 'border-blue-500 text-blue-600' : ''}`}
                    onClick={() => setActiveTab('floorplans')}
                  >
                    Floorplans
                  </button>
                </nav>
              </div>
            </div>

            {/* Show appropriate controls based on active tab */}
            {activeTab === 'polygons' ? (
              <PolygonControls
                minSize={minSize}
                setMinSize={setMinSize}
                maxSize={maxSize}
                setMaxSize={setMaxSize}
                keepPolygons={keepPolygons}
                setKeepPolygons={setKeepPolygons}
                generatorMode={generatorMode}
                setGeneratorMode={setGeneratorMode}
                curveType={curveType}
                setCurveType={setCurveType}
                curveIntensity={curveIntensity}
                setCurveIntensity={setCurveIntensity}
                animateOpacity={animateOpacity}
                setAnimateOpacity={setAnimateOpacity}
                minOpacity={minOpacity}
                setMinOpacity={setMinOpacity}
                maxOpacity={maxOpacity}
                setMaxOpacity={setMaxOpacity}
                animationPeriodRange={animationPeriodRange}
                setAnimationPeriodRange={setAnimationPeriodRange}
                onGeneratePolygon={generatePolygon}
                onClearShapes={handleClearShapes}
                onApplyCurveChanges={handleApplyCurveChanges}
                onExpandPolygon={handleExpandPolygon}
                onToggleAnimations={handleToggleAnimations}
              />
            ) : (
              <FloorplanControls
                map={map}
                floorplanOverlay={floorplanOverlay}
                setFloorplanOverlay={setFloorplanOverlay}
                floorplanVisible={floorplanVisible}
                setFloorplanVisible={setFloorplanVisible}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column for Map - 75% width */}
      <div className="w-3/4 h-full">
        <GoogleMap
          onMapReady={handleMapReady}
          mapOptions={{ center: BEDFORD_CENTER, zoom: 14 }}
        />

        {/* Non-visual components for managing map elements */}
        {map && (
          <>
            {/* Initialize the PolygonManager when map is ready */}
            <PolygonManager
              ref={polygonManagerRef}
              map={map}
              generatorMode={generatorMode}
              minSize={minSize}
              maxSize={maxSize}
              keepPolygons={keepPolygons}
              onPolygonCreated={handlePolygonCreated}
            />

            {/* Initialize the MarkerManager when map is ready */}
            <MarkerManager
              map={map}
              onMarkersChanged={handleMarkersChanged}
            />

            {/* Update ConnectionLinesManager to use centerMarkers directly */}
            <ConnectionLinesManager
              map={map}
              markers={centerMarkers}
              curveType={curveType}
              curveIntensity={curveIntensity}
            />

            {/* Initialize the PolygonAnimationManager when map is ready */}
            <PolygonAnimationManager
              ref={animationManagerRef}
              polygons={[]} // This will be updated by the PolygonManager
              animateOpacity={animateOpacity}
              minOpacity={minOpacity}
              maxOpacity={maxOpacity}
              animationPeriodRange={animationPeriodRange}
            />
          </>
        )}
      </div>
    </div>
  );
};

// Wrap with context provider
const PolygonGenerator = () => {
  return (
    <PolygonProvider>
      <PolygonGeneratorContent />
    </PolygonProvider>
  );
};

export default PolygonGenerator;
