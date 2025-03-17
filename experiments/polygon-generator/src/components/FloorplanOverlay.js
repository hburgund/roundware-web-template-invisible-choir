// FloorplanOverlay.js
// A custom overlay class for displaying SVG floorplans on Google Maps
// at specific zoom levels

/**
 * Creates a custom overlay for displaying an SVG floorplan on a Google Map.
 * The overlay will only be visible at specified zoom levels.
 */
class FloorplanOverlay extends google.maps.OverlayView {
  /**
   * @param {google.maps.LatLngBounds} bounds - The geographical bounds of the floorplan
   * @param {string} svgUrl - URL to the SVG file
   * @param {google.maps.Map} map - The map to add the overlay to
   * @param {Object} options - Optional configuration
   * @param {number} options.minZoom - Minimum zoom level to show the overlay (default: 18)
   * @param {number} options.maxZoom - Maximum zoom level to show the overlay (default: 21)
   * @param {number} options.opacity - Opacity of the overlay (default: 0.8)
   * @param {boolean} options.interactive - Whether the overlay should respond to mouse events (default: false)
   * @param {Object} options.offset - Offset for fine positioning {x: number, y: number} in pixels
   */
  constructor(bounds, svgUrl, map, options = {}) {
    super();
    this.bounds_ = bounds;
    this.svgUrl_ = svgUrl;
    this.map_ = map;
    this.minZoom_ = options.minZoom !== undefined ? options.minZoom : 18;
    this.maxZoom_ = options.maxZoom !== undefined ? options.maxZoom : 21;
    this.opacity_ = options.opacity !== undefined ? options.opacity : 0.8;
    this.interactive_ = options.interactive !== undefined ? options.interactive : false;
    this.offset_ = options.offset || { x: 0, y: 0 };
    this.div_ = null;
    this.svg_ = null;
    this.loaded_ = false;
    this.svgWidth_ = 0;
    this.svgHeight_ = 0;
    this.zoomListener_ = null;

    // Set the overlay onto the map
    this.setMap(this.map_);
  }

  /**
   * Called when the overlay is added to the map.
   * Creates the DOM elements for the overlay.
   */
  onAdd() {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.overflow = 'hidden';
    div.style.pointerEvents = this.interactive_ ? 'auto' : 'none';

    // Create a container for the SVG
    const svgContainer = document.createElement('div');
    svgContainer.style.width = '100%';
    svgContainer.style.height = '100%';
    svgContainer.style.opacity = this.opacity_;
    div.appendChild(svgContainer);

    this.div_ = div;
    this.svgContainer_ = svgContainer;

    // Add the element to the overlay pane
    const panes = this.getPanes();
    panes.overlayLayer.appendChild(div);

    // Load the SVG
    this.loadSvg();

    // Add zoom change listener
    this.zoomListener_ = this.map_.addListener('zoom_changed', () => {
      this.updateVisibility();
    });

    // Initial visibility update
    this.updateVisibility();
  }

  /**
   * Positions the overlay on the map based on the bounds.
   */
  draw() {
    // Transform the bounds to pixel coordinates
    const overlayProjection = this.getProjection();
    if (!overlayProjection) return;

    // Get the positions in pixels
    const sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
    const ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

    // Position the div with offset adjustment
    const div = this.div_;
    div.style.left = (sw.x + this.offset_.x) + 'px';
    div.style.top = (ne.y + this.offset_.y) + 'px';
    div.style.width = (ne.x - sw.x) + 'px';
    div.style.height = (sw.y - ne.y) + 'px';

    if (this.loaded_ && this.svg_) {
      // Ensure the SVG fills the container while maintaining aspect ratio
      this.updateSvgDimensions();
    }
  }

  /**
   * Called when the overlay is removed from the map.
   * Cleans up DOM elements and event listeners.
   */
  onRemove() {
    if (this.div_) {
      this.div_.parentNode.removeChild(this.div_);
      this.div_ = null;
    }

    if (this.zoomListener_) {
      google.maps.event.removeListener(this.zoomListener_);
    }
  }

  /**
   * Updates the visibility of the overlay based on the current zoom level.
   */
  updateVisibility() {
    // Only proceed if div_ has been created
    if (!this.div_) return;

    const zoom = this.map_.getZoom();
    if (zoom >= this.minZoom_ && zoom <= this.maxZoom_) {
      this.div_.style.display = 'block';
    } else {
      this.div_.style.display = 'none';
    }
  }

  /**
   * Loads the SVG file and adds it to the container.
   */
  loadSvg() {
    fetch(this.svgUrl_)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load SVG: ${response.statusText}`);
        }
        return response.text();
      })
      .then(svgContent => {
        try {
          // Create a temporary div to parse the SVG
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

          // Check for parsing errors
          const parseError = svgDoc.querySelector('parsererror');
          if (parseError) {
            throw new Error('SVG parsing error: ' + parseError.textContent);
          }

          const svgElement = svgDoc.documentElement;

          // Store original dimensions
          this.svgWidth_ = parseFloat(svgElement.getAttribute('width') ||
                                     svgElement.viewBox?.baseVal?.width || 0);
          this.svgHeight_ = parseFloat(svgElement.getAttribute('height') ||
                                      svgElement.viewBox?.baseVal?.height || 0);

          // Make SVG responsive
          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', '100%');
          svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

          // Add the SVG to the container
          this.svgContainer_.innerHTML = '';
          this.svgContainer_.appendChild(svgElement);
          this.svg_ = svgElement;
          this.loaded_ = true;

          // Force a redraw
          this.draw();
        } catch (parseError) {
          console.error('Error parsing SVG:', parseError);
          this.svgContainer_.innerHTML = `<div style="color: red; padding: 10px;">Failed to parse SVG: ${parseError.message}</div>`;
        }
      })
      .catch(error => {
        console.error('Error loading SVG:', error);
        this.svgContainer_.innerHTML = `<div style="color: red; padding: 10px;">Failed to load floorplan: ${error.message}</div>`;
      });
  }

  /**
   * Updates the dimensions of the SVG to maintain aspect ratio.
   */
  updateSvgDimensions() {
    if (!this.loaded_ || !this.svg_ || !this.svgWidth_ || !this.svgHeight_) return;

    const containerWidth = this.div_.clientWidth;
    const containerHeight = this.div_.clientHeight;

    const svgAspectRatio = this.svgWidth_ / this.svgHeight_;
    const containerAspectRatio = containerWidth / containerHeight;

    if (svgAspectRatio > containerAspectRatio) {
      // SVG is wider than container
      this.svg_.style.width = '100%';
      this.svg_.style.height = 'auto';
    } else {
      // SVG is taller than container
      this.svg_.style.width = 'auto';
      this.svg_.style.height = '100%';
    }
  }

  /**
   * Changes the opacity of the overlay.
   * @param {number} opacity - New opacity value (0-1)
   */
  setOpacity(opacity) {
    this.opacity_ = opacity;

    // Only change the opacity if the container exists
    if (this.svgContainer_ && this.getMap()) {
      this.svgContainer_.style.opacity = opacity;
    }
  }

  /**
   * Sets the minimum and maximum zoom levels for displaying the overlay.
   * @param {number} minZoom - Minimum zoom level
   * @param {number} maxZoom - Maximum zoom level
   */
  setZoomRange(minZoom, maxZoom) {
    this.minZoom_ = minZoom;
    this.maxZoom_ = maxZoom;

    // Check if the overlay is already initialized before updating visibility
    if (this.getMap()) {
      this.updateVisibility();
    }
  }

  /**
   * Sets the offset for fine-tuning the position of the overlay.
   * @param {Object} offset - The offset {x, y} in pixels
   */
  setOffset(offset) {
    this.offset_ = offset;

    // Redraw the overlay with the new offset
    if (this.getMap()) {
      this.draw();
    }
  }
}

export default FloorplanOverlay;
