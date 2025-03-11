import React from 'react';

const PolygonControls = ({
  minSize,
  setMinSize,
  maxSize,
  setMaxSize,
  keepPolygons,
  setKeepPolygons,
  generatorMode,
  setGeneratorMode,
  curveType,
  setCurveType,
  curveIntensity,
  setCurveIntensity,
  onGeneratePolygon,
  onClearShapes,
  onApplyCurveChanges
}) => {
  const handleInputChange = (setter) => (e) => {
    let value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setter(value);
    }
  };

  // Get display text for the current generator mode
  const getShapeDisplayName = () => {
    switch (generatorMode) {
      case 'beechLeaf': return 'Beech Leaf';
      case 'orbicularLeaf': return 'Orbicular Leaf';
      case 'random': return 'Polygon';
      default: return 'Shape';
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Shape Type:</label>
            <div className="grid grid-cols-3 gap-2">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="polygonType"
                  value="random"
                  checked={generatorMode === 'random'}
                  onChange={() => setGeneratorMode('random')}
                />
                <span className="ml-2">Random Polygons</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="polygonType"
                  value="beechLeaf"
                  checked={generatorMode === 'beechLeaf'}
                  onChange={() => setGeneratorMode('beechLeaf')}
                />
                <span className="ml-2">Beech Leaf</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="polygonType"
                  value="orbicularLeaf"
                  checked={generatorMode === 'orbicularLeaf'}
                  onChange={() => setGeneratorMode('orbicularLeaf')}
                />
                <span className="ml-2">Orbicular Leaf</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Min Size (meters): {minSize}
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={minSize}
              onChange={handleInputChange(setMinSize)}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Max Size (meters): {maxSize}
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={maxSize}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                if (value >= minSize) {
                  setMaxSize(value);
                }
              }}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Connection Curve Settings:</label>
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">
                Curve Type:
              </label>
              <select
                value={curveType}
                onChange={(e) => setCurveType(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="bezier">Bezier Curve</option>
                <option value="arcuate">Simple Arc</option>
                <option value="wave">Wavy Line</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Curve Intensity: {curveIntensity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={curveIntensity}
                onChange={(e) => setCurveIntensity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="mt-2">
              <button
                onClick={onApplyCurveChanges}
                className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded w-full"
              >
                Apply Curve Changes
              </button>
            </div>
          </div>

          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="keepPolygons"
              checked={keepPolygons}
              onChange={(e) => setKeepPolygons(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="keepPolygons" className="text-sm font-medium">
              Keep previous shapes when generating new ones
            </label>
          </div>
        </div>
      </div>

      <div className="flex space-x-2 mt-4">
        <button
          onClick={onGeneratePolygon}
          className="flex-1 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Generate {getShapeDisplayName()}
        </button>
        <button
          onClick={onClearShapes}
          className="flex-1 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Clear All Shapes
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Click anywhere on the map or on existing shapes to create a new shape at that location.</p>
      </div>
    </div>
  );
};

export default PolygonControls;
