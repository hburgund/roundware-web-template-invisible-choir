import React, { useState, useEffect } from 'react';

const FloorplanControls = ({
  map,
  floorplanOverlay,
  setFloorplanOverlay,
  floorplanVisible,
  setFloorplanVisible
}) => {
  const [minZoom, setMinZoom] = useState(18);
  const [maxZoom, setMaxZoom] = useState(21);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [selectedFloorplan, setSelectedFloorplan] = useState('');
  const [availableFloorplans, setAvailableFloorplans] = useState([]);

  useEffect(() => {
    // This would typically come from an API or configuration
    // For now, we'll use a static list
    setAvailableFloorplans([
      { id: 'building1', name: 'BASE', url: '/floorplans/outlines3.svg' },
      // { id: 'building2', name: 'Library', url: '/floorplans/library.svg' },
      // { id: 'building3', name: 'Conference Center', url: '/floorplans/conference.svg' },
    ]);
  }, []);



  useEffect(() => {
    // Update zoom levels when they change
    if (floorplanOverlay && floorplanVisible) {
      try {
        floorplanOverlay.setZoomRange(minZoom, maxZoom);
      } catch (error) {
        console.warn('Could not set zoom range on floorplan overlay:', error);
      }
    }
  }, [minZoom, maxZoom, floorplanOverlay, floorplanVisible]);

  useEffect(() => {
    // Update position offset when it changes
    if (floorplanOverlay && floorplanVisible) {
      try {
        floorplanOverlay.setOffset({ x: offsetX, y: offsetY });
      } catch (error) {
        console.warn('Could not set offset on floorplan overlay:', error);
      }
    }
  }, [offsetX, offsetY, floorplanOverlay, floorplanVisible]);

  // Handle toggling floorplan visibility
  const handleToggleVisibility = () => {
    setFloorplanVisible(!floorplanVisible);

    if (floorplanOverlay) {
      if (!floorplanVisible) {
        // If we're turning it on, make sure it's on the map
        floorplanOverlay.setMap(map);
      } else {
        // If we're turning it off, remove it from the map
        floorplanOverlay.setMap(null);
      }
    }
  };

  // Handle changing selected floorplan
  const handleSelectFloorplan = (e) => {
    const selectedId = e.target.value;
    setSelectedFloorplan(selectedId);

    // Remove existing overlay if there is one
    if (floorplanOverlay) {
      try {
        floorplanOverlay.setMap(null);
      } catch (error) {
        console.warn('Error removing existing floorplan:', error);
      }
      setFloorplanOverlay(null);
    }

    if (selectedId && map && window.google) {
      const selected = availableFloorplans.find(fp => fp.id === selectedId);
      if (selected) {
        try {
          // In a real application, you would need to define the bounds for each floorplan
          // For this example, we'll use a hard-coded bounds near Bedford, MA
          // SW - 45.451940921510364, 9.162807943891298
          // SE - 45.4520698102182, 9.16323039180924
          // NW - 45.45207733655698, 9.162723454307711
          // NE - 45.452202461792396, 9.163150596091405
          const bounds = new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(45.451940921510364, 9.162723454307711), // SW corner
            new window.google.maps.LatLng(45.452202461792396, 9.16323039180924)  // NE corner
          );

          // Reset position offsets when changing floorplans
          setOffsetX(0);
          setOffsetY(0);

          // Dynamic import of the FloorplanOverlay component
          import('./FloorplanOverlay').then((module) => {
            const FloorplanOverlay = module.default;

            const newOverlay = new FloorplanOverlay(
              bounds,
              selected.url,
              map,
              {
                minZoom: minZoom,
                maxZoom: maxZoom,
                opacity: 0.8,
                offset: { x: offsetX, y: offsetY },
                interactive: false
              }
            );

            setFloorplanOverlay(newOverlay);
            setFloorplanVisible(true);
          }).catch(error => {
            console.error('Error importing FloorplanOverlay:', error);
            alert('Failed to load floorplan overlay component');
          });
        } catch (error) {
          console.error('Error creating floorplan overlay:', error);
          alert('Failed to create floorplan overlay');
        }
      }
    } else if (selectedId && (!map || !window.google)) {
      alert('Map is not yet initialized. Please try again in a moment.');
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium mb-2">Floorplan Overlay:</h3>

      <div>
        <label className="block text-sm mb-1">
          Select Floorplan:
        </label>
        <select
          value={selectedFloorplan}
          onChange={handleSelectFloorplan}
          className="w-full p-2 border rounded"
          disabled={!map}
        >
          <option value="">-- Select a floorplan --</option>
          {availableFloorplans.map(fp => (
            <option key={fp.id} value={fp.id}>{fp.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={floorplanVisible}
            onChange={handleToggleVisibility}
            className="mr-2"
            disabled={!floorplanOverlay}
          />
          <span className="text-sm">Show floorplan overlay</span>
        </label>
      </div>

      <div className="text-xs text-gray-600 mt-4">
        <p>Note: Floorplans will only be visible at zoom levels {minZoom}-{maxZoom}.</p>
        <p>Upload your SVG floorplans to the /public/floorplans/ directory.</p>
      </div>
    </div>
  );
};

export default FloorplanControls;
