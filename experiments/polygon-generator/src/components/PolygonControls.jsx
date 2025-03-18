import React, { useState } from 'react';

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
  animateOpacity,
  setAnimateOpacity,
  minOpacity,
  setMinOpacity,
  maxOpacity,
  setMaxOpacity,
  animationPeriodRange,
  setAnimationPeriodRange,
  onGeneratePolygon,
  onClearShapes,
  onApplyCurveChanges,
  onExpandPolygon,
  onToggleAnimations
}) => {
  const [expansionAmount, setExpansionAmount] = useState(10);
  const [expansionUnit, setExpansionUnit] = useState('meters'); // 'meters' or 'percent'

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

  const handleExpansionAmountChange = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setExpansionAmount(value);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Shape Type Selection */}
      <div>
        <h3 className="text-sm font-medium mb-2">Shape Type:</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              className="form-radio mr-2"
              name="polygonType"
              value="random"
              checked={generatorMode === 'random'}
              onChange={() => setGeneratorMode('random')}
            />
            <span>Random Polygons</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              className="form-radio mr-2"
              name="polygonType"
              value="beechLeaf"
              checked={generatorMode === 'beechLeaf'}
              onChange={() => setGeneratorMode('beechLeaf')}
            />
            <span>Beech Leaf</span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              className="form-radio mr-2"
              name="polygonType"
              value="orbicularLeaf"
              checked={generatorMode === 'orbicularLeaf'}
              onChange={() => setGeneratorMode('orbicularLeaf')}
            />
            <span>Orbicular Leaf</span>
          </label>
        </div>
      </div>

      {/* Size Controls */}
      <div>
        <h3 className="text-sm font-medium mb-2">Size Settings:</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">
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
            <label className="block text-sm mb-1">
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
      </div>

      {/* Expansion Controls */}
      <div>
        <h3 className="text-sm font-medium mb-2">Polygon Expansion:</h3>
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="number"
              min="1"
              max={expansionUnit === 'percent' ? 200 : 100}
              value={expansionAmount}
              onChange={handleExpansionAmountChange}
              className="w-20 p-2 border rounded"
            />
            <select
              value={expansionUnit}
              onChange={(e) => setExpansionUnit(e.target.value)}
              className="p-2 border rounded"
            >
              <option value="meters">meters</option>
              <option value="percent">percent</option>
            </select>
          </div>
          <button
            onClick={() => onExpandPolygon(expansionAmount, expansionUnit)}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full"
          >
            Expand Last Polygon
          </button>
        </div>
      </div>

      {/* Curve Settings */}
      <div>
        <h3 className="text-sm font-medium mb-2">Connection Curve Settings:</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">
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
            <label className="block text-sm mb-1">
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
          <button
            onClick={onApplyCurveChanges}
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded w-full"
          >
            Apply Curve Changes
          </button>
        </div>
      </div>

      {/* Animation Controls */}
      <div>
        <h3 className="text-sm font-medium mb-2">Opacity Animation:</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              id="animateOpacity"
              checked={animateOpacity}
              onChange={(e) => setAnimateOpacity(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">
              Animate opacity
            </span>
          </label>

          <div className={animateOpacity ? "" : "opacity-50 pointer-events-none"}>
            <div>
              <label className="block text-sm mb-1">
                Min Opacity: {minOpacity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={minOpacity}
                onChange={(e) => setMinOpacity(parseFloat(e.target.value))}
                className="w-full"
                disabled={!animateOpacity}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                Max Opacity: {maxOpacity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={maxOpacity}
                onChange={(e) => setMaxOpacity(parseFloat(e.target.value))}
                className="w-full"
                disabled={!animateOpacity}
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                Animation Period Range: {animationPeriodRange[0]}-{animationPeriodRange[1]}s
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  max={animationPeriodRange[1]}
                  value={animationPeriodRange[0]}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value > 0 && value < animationPeriodRange[1]) {
                      setAnimationPeriodRange([value, animationPeriodRange[1]]);
                    }
                  }}
                  className="w-16 p-1 border rounded text-sm"
                  disabled={!animateOpacity}
                />
                <span>to</span>
                <input
                  type="number"
                  min={animationPeriodRange[0]}
                  max="50"
                  value={animationPeriodRange[1]}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    if (!isNaN(value) && value > animationPeriodRange[0] && value <= 50) {
                      setAnimationPeriodRange([animationPeriodRange[0], value]);
                    }
                  }}
                  className="w-16 p-1 border rounded text-sm"
                  disabled={!animateOpacity}
                />
                <span>sec</span>
              </div>
            </div>

            <button
              onClick={onToggleAnimations}
              className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-1 px-4 rounded w-full mt-2"
              disabled={!animateOpacity}
            >
              Apply Animation Settings
            </button>
          </div>
        </div>
      </div>

      {/* Options */}
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            id="keepPolygons"
            checked={keepPolygons}
            onChange={(e) => setKeepPolygons(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm">
            Keep previous shapes
          </span>
        </label>
      </div>

      {/* Actions */}
      {/*<div className="space-y-2 pt-4">
        <button
          onClick={onGeneratePolygon}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
        >
          Generate {getShapeDisplayName()}
        </button>
        <button
          onClick={onClearShapes}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded w-full"
        >
          Clear All Shapes
        </button>
      </div>*/}

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-600 pt-4 border-t border-gray-200">
        <p>Click anywhere on the map or on existing shapes to create a new shape at that location.</p>
      </div>
    </div>
  );
};

export default PolygonControls;
