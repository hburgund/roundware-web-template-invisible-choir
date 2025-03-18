// components/ConnectionLines/ConnectionAnimationControls.jsx
import React from 'react';

const ConnectionAnimationControls = ({
  animateConnections,
  setAnimateConnections,
  animationSpeed,
  setAnimationSpeed,
  waveAmplitude,
  setWaveAmplitude,
  waveFrequency,
  setWaveFrequency,
  animationPattern,
  setAnimationPattern,
  onApplyChanges
}) => {
  return (
    <div className="space-y-6 mt-6">
      <h3 className="text-sm font-medium mb-2">Connection Line Animation:</h3>

      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            id="animateConnections"
            checked={animateConnections}
            onChange={(e) => setAnimateConnections(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm">
            Animate connection lines
          </span>
        </label>

        <div className={animateConnections ? "" : "opacity-50 pointer-events-none"}>
          {/* Animation Speed */}
          <div>
            <label className="block text-sm mb-1">
              Animation Speed: {animationSpeed.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={animationSpeed}
              onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
              className="w-full"
              disabled={!animateConnections}
            />
          </div>

          {/* Wave Amplitude */}
          <div>
            <label className="block text-sm mb-1">
              Wave Amplitude: {waveAmplitude.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={waveAmplitude}
              onChange={(e) => setWaveAmplitude(parseFloat(e.target.value))}
              className="w-full"
              disabled={!animateConnections}
            />
          </div>

          {/* Wave Frequency */}
          <div>
            <label className="block text-sm mb-1">
              Wave Frequency: {waveFrequency.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={waveFrequency}
              onChange={(e) => setWaveFrequency(parseFloat(e.target.value))}
              className="w-full"
              disabled={!animateConnections}
            />
          </div>

          {/* Animation Pattern */}
          <div>
            <label className="block text-sm mb-1">
              Animation Pattern:
            </label>
            <select
              value={animationPattern}
              onChange={(e) => setAnimationPattern(e.target.value)}
              className="w-full p-2 border rounded"
              disabled={!animateConnections}
            >
              <option value="sine">Sine Wave</option>
              <option value="pulse">Pulsing</option>
              <option value="flow">Flowing Wave</option>
            </select>
          </div>

          <button
            onClick={onApplyChanges}
            className="bg-indigo-500 hover:bg-indigo-700 text-white font-bold py-1 px-4 rounded w-full mt-2"
            disabled={!animateConnections}
          >
            Apply Animation Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConnectionAnimationControls;
