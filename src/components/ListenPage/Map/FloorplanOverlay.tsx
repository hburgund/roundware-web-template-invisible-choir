import React, { useEffect, useRef } from 'react';
import { useRoundware } from '../../../hooks';

// Utility function to get current map center for easy positioning
export const getCurrentMapCenter = (map: google.maps.Map) => {
  const center = map.getCenter();
  return {
    lat: center?.lat() || 0,
    lng: center?.lng() || 0
  };
};

// Utility function to get coordinates from a location (for future use)
export const getCoordinatesFromLocation = (address: string): Promise<{lat: number, lng: number}> => {
  return new Promise((resolve, reject) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const location = results[0].geometry.location;
        resolve({
          lat: location.lat(),
          lng: location.lng()
        });
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
};

interface FloorplanOverlayProps {
  map: google.maps.Map | null | undefined;
  // Configuration options for easy positioning
  position?: {
    lat: number;
    lng: number;
  };
  size?: number; // Size in degrees (default: 0.001 = ~10x leaf size)
  opacity?: number; // Opacity 0-1 (default: 0.8)
  rotation?: number; // Rotation in degrees (default: 0)
  enabled?: boolean; // Whether to show the overlay (default: true)
  useProjectLocation?: boolean; // Use project location instead of map center (default: false)
}

const FloorplanOverlay: React.FC<FloorplanOverlayProps> = ({ 
  map, 
  position,
  size = 0.0007,
  opacity = 0.8,
  rotation = 287,
  enabled = true,
  useProjectLocation = false
}) => {
  const { roundware } = useRoundware();
  const overlayRef = useRef<google.maps.OverlayView | null>(null);

    useEffect(() => {
    if (!map || !window.google || !enabled) {
      return;
    }

    // Determine the center position for the floorplan
    let floorplanCenter;
    if (position) {
      // Use provided position
      floorplanCenter = position;
    } else if (useProjectLocation && roundware?.project?.location) {
      // Use project location where listening happens
      floorplanCenter = {
        lat: roundware.project.location.latitude || 0,
        lng: roundware.project.location.longitude || 0
      };
    } else {
      // Use map center as fallback
      const mapCenter = map.getCenter();
      floorplanCenter = {
        lat: mapCenter?.lat() || 45.452071,
        lng: mapCenter?.lng() || 9.162976
      };
    }

    // Create bounds for the floorplan overlay
    const bounds = new window.google.maps.LatLngBounds(
      new window.google.maps.LatLng(
        floorplanCenter.lat - size / 2,
        floorplanCenter.lng - size / 2
      ),
      new window.google.maps.LatLng(
        floorplanCenter.lat + size / 2,
        floorplanCenter.lng + size / 2
      )
    );

    // Create custom overlay class
    class FloorplanOverlayClass extends window.google.maps.OverlayView {
      private bounds: google.maps.LatLngBounds;
      private div: HTMLDivElement | null = null;
      private svgContainer: HTMLDivElement | null = null;
      private rotation: number;

      constructor(bounds: google.maps.LatLngBounds, rotation: number) {
        super();
        this.bounds = bounds;
        this.rotation = rotation;
      }

      onAdd(): void {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.overflow = 'hidden';
        div.style.pointerEvents = 'none'; // Don't interfere with map interactions
        div.style.zIndex = '1'; // Above base map, below other overlays

        // Create a container for the SVG
        const svgContainer = document.createElement('div');
        svgContainer.style.width = '100%';
        svgContainer.style.height = '100%';
        svgContainer.style.opacity = opacity.toString(); // Use configurable opacity
        svgContainer.style.transform = `rotate(${this.rotation}deg)`;
        div.appendChild(svgContainer);

        this.div = div;
        this.svgContainer = svgContainer;

        const panes = this.getPanes();
        if (panes && panes.overlayLayer) {
          panes.overlayLayer.appendChild(div);
        }

        this.loadSvg();
      }

      draw(): void {
        if (!this.div) return;

        const overlayProjection = this.getProjection();
        if (!overlayProjection) return;

        const sw = overlayProjection.fromLatLngToDivPixel(this.bounds.getSouthWest());
        const ne = overlayProjection.fromLatLngToDivPixel(this.bounds.getNorthEast());

        if (sw && ne) {
          this.div.style.left = sw.x + 'px';
          this.div.style.top = ne.y + 'px';
          this.div.style.width = (ne.x - sw.x) + 'px';
          this.div.style.height = (sw.y - ne.y) + 'px';
        }
      }

      onRemove(): void {
        if (this.div && this.div.parentNode) {
          this.div.parentNode.removeChild(this.div);
          this.div = null;
        }
      }

      loadSvg(): void {
        if (!this.svgContainer) return;

        fetch('/floorplans/base-plan2.svg')
          .then(response => {
            if (!response.ok) {
              throw new Error(`Failed to load SVG: ${response.statusText}`);
            }
            return response.text();
          })
          .then(svgContent => {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.documentElement as unknown as SVGElement;

            // Make SVG responsive and fill the container
            svgElement.setAttribute('width', '100%');
            svgElement.setAttribute('height', '100%');
            svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

            // Add some styling to make it look like a floorplan
            svgElement.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))';

            this.svgContainer!.innerHTML = '';
            this.svgContainer!.appendChild(svgElement);
          })
          .catch(error => {
            console.error('Error loading floorplan SVG:', error);
            if (this.svgContainer) {
              this.svgContainer.innerHTML = `<div style="color: #666; padding: 10px; text-align: center; font-size: 12px;">Floorplan</div>`;
            }
          });
      }
    }

    // Create and add the overlay
    const overlay = new FloorplanOverlayClass(bounds, rotation);
    overlay.setMap(map);
    overlayRef.current = overlay;

    // Cleanup function
    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, [map, position, size, opacity, rotation, enabled, useProjectLocation, roundware?.project?.location]);

  return null;
};

export default FloorplanOverlay; 