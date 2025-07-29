import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Tooltip, Select, MenuItem, FormControl, InputLabel, Slider, Typography } from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from '@mui/icons-material/Clear';
import { createShapeGenerator } from '../Floorplan/shape-generators';

interface FloorplanOverlayProps {
  map: google.maps.Map | null | undefined;
}

interface FloorplanOverlayOptions {
  minZoom?: number;
  maxZoom?: number;
  opacity?: number;
  interactive?: boolean;
  offset?: { x: number; y: number };
}

/**
 * Custom overlay class for displaying SVG floorplans on Google Maps
 */
class FloorplanOverlayClass {
  private bounds_: any;
  private svgUrl_: string;
  private map_: any;
  private minZoom_: number;
  private maxZoom_: number;
  private opacity_: number;
  private interactive_: boolean;
  private offset_: { x: number; y: number };
  private div_: HTMLDivElement | null;
  private svgContainer_: HTMLDivElement | null;
  private svg_: SVGElement | null;
  private loaded_: boolean;
  private svgWidth_: number;
  private svgHeight_: number;
  private zoomListener_: any;
  private overlayView_: any;

  constructor(
    bounds: any,
    svgUrl: string,
    map: any,
    options: FloorplanOverlayOptions = {}
  ) {
    this.bounds_ = bounds;
    this.svgUrl_ = svgUrl;
    this.map_ = map;
    this.minZoom_ = options.minZoom !== undefined ? options.minZoom : 18;
    this.maxZoom_ = options.maxZoom !== undefined ? options.maxZoom : 21;
    this.opacity_ = options.opacity !== undefined ? options.opacity : 0.8;
    this.interactive_ = options.interactive !== undefined ? options.interactive : false;
    this.offset_ = options.offset || { x: 0, y: 0 };
    this.div_ = null;
    this.svgContainer_ = null;
    this.svg_ = null;
    this.loaded_ = false;
    this.svgWidth_ = 0;
    this.svgHeight_ = 0;
    this.zoomListener_ = null;
    this.overlayView_ = null;

    this.createOverlayView();
  }

  private createOverlayView(): void {
    if (typeof window !== 'undefined' && window.google && window.google.maps) {
      const CustomOverlayView = class extends window.google.maps.OverlayView {
        private floorplanOverlay: FloorplanOverlayClass;

        constructor(floorplanOverlay: FloorplanOverlayClass) {
          super();
          this.floorplanOverlay = floorplanOverlay;
        }

        onAdd(): void {
          this.floorplanOverlay.onAdd();
        }

        draw(): void {
          this.floorplanOverlay.draw();
        }

        onRemove(): void {
          this.floorplanOverlay.onRemove();
        }
      };

      this.overlayView_ = new CustomOverlayView(this);
      this.overlayView_.setMap(this.map_);
    } else {
      console.warn('Google Maps API not available');
    }
  }

  onAdd(): void {
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.overflow = 'hidden';
    div.style.pointerEvents = this.interactive_ ? 'auto' : 'none';

    const svgContainer = document.createElement('div');
    svgContainer.style.width = '100%';
    svgContainer.style.height = '100%';
    svgContainer.style.opacity = this.opacity_.toString();

    div.appendChild(svgContainer);

    this.div_ = div;
    this.svgContainer_ = svgContainer;

    if (this.overlayView_) {
      const panes = this.overlayView_.getPanes();
      if (panes && panes.overlayLayer) {
        panes.overlayLayer.appendChild(div);
      }
    }

    this.loadSvg();

    if (this.map_) {
      this.zoomListener_ = this.map_.addListener('zoom_changed', () => {
        this.updateVisibility();
      });
    }

    this.updateVisibility();
  }

  draw(): void {
    if (!this.overlayView_) return;

    const overlayProjection = this.overlayView_.getProjection();
    if (!overlayProjection) return;

    const sw = overlayProjection.fromLatLngToDivPixel(this.bounds_.getSouthWest());
    const ne = overlayProjection.fromLatLngToDivPixel(this.bounds_.getNorthEast());

    const div = this.div_;
    if (div && sw && ne) {
      div.style.left = (sw.x + this.offset_.x) + 'px';
      div.style.top = (ne.y + this.offset_.y) + 'px';
      div.style.width = (ne.x - sw.x) + 'px';
      div.style.height = (sw.y - ne.y) + 'px';

      if (this.loaded_ && this.svg_) {
        this.updateSvgDimensions();
      }
    }
  }

  onRemove(): void {
    if (this.div_ && this.div_.parentNode) {
      this.div_.parentNode.removeChild(this.div_);
      this.div_ = null;
    }

    if (this.zoomListener_ && window.google && window.google.maps) {
      window.google.maps.event.removeListener(this.zoomListener_);
    }
  }

  updateVisibility(): void {
    if (!this.div_) return;

    const zoom = this.map_.getZoom();
    if (zoom !== undefined && zoom >= this.minZoom_ && zoom <= this.maxZoom_) {
      this.div_.style.display = 'block';
    } else {
      this.div_.style.display = 'none';
    }
  }

  loadSvg(): void {
    fetch(this.svgUrl_)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load SVG: ${response.statusText}`);
        }
        return response.text();
      })
      .then(svgContent => {
        try {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');

          const parseError = svgDoc.querySelector('parsererror');
          if (parseError) {
            throw new Error('SVG parsing error: ' + parseError.textContent);
          }

          const svgElement = svgDoc.documentElement as unknown as SVGElement;

          this.svgWidth_ = parseFloat(svgElement.getAttribute('width') || '0') ||
                          ((svgElement as any).viewBox?.baseVal?.width || 0);
          this.svgHeight_ = parseFloat(svgElement.getAttribute('height') || '0') ||
                           ((svgElement as any).viewBox?.baseVal?.height || 0);

          svgElement.setAttribute('width', '100%');
          svgElement.setAttribute('height', '100%');
          svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

          if (this.svgContainer_) {
            this.svgContainer_.innerHTML = '';
            this.svgContainer_.appendChild(svgElement);
            this.svg_ = svgElement;
            this.loaded_ = true;
            this.draw();
          }
        } catch (parseError) {
          console.error('Error parsing SVG:', parseError);
          if (this.svgContainer_) {
            this.svgContainer_.innerHTML = `<div style="color: red; padding: 10px;">Failed to parse SVG: ${parseError instanceof Error ? parseError.message : 'Unknown error'}</div>`;
          }
        }
      })
      .catch(error => {
        console.error('Error loading SVG:', error);
        if (this.svgContainer_) {
          this.svgContainer_.innerHTML = `<div style="color: red; padding: 10px;">Failed to load floorplan: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
        }
      });
  }

  updateSvgDimensions(): void {
    if (!this.loaded_ || !this.svg_ || !this.svgWidth_ || !this.svgHeight_ || !this.div_) return;

    const containerWidth = this.div_.clientWidth;
    const containerHeight = this.div_.clientHeight;

    const svgAspectRatio = this.svgWidth_ / this.svgHeight_;
    const containerAspectRatio = containerWidth / containerHeight;

    if (svgAspectRatio > containerAspectRatio) {
      this.svg_.style.width = '100%';
      this.svg_.style.height = 'auto';
    } else {
      this.svg_.style.width = 'auto';
      this.svg_.style.height = '100%';
    }
  }

  setOpacity(opacity: number): void {
    this.opacity_ = opacity;
    if (this.svgContainer_ && this.overlayView_) {
      this.svgContainer_.style.opacity = opacity.toString();
    }
  }

  setZoomRange(minZoom: number, maxZoom: number): void {
    this.minZoom_ = minZoom;
    this.maxZoom_ = maxZoom;
    if (this.overlayView_) {
      this.updateVisibility();
    }
  }

  setOffset(offset: { x: number; y: number }): void {
    this.offset_ = offset;
    if (this.overlayView_) {
      this.draw();
    }
  }

  setMap(map: any): void {
    if (this.overlayView_) {
      this.overlayView_.setMap(map);
    }
  }
}

const FloorplanOverlay: React.FC<FloorplanOverlayProps> = ({ map }) => {
  const [floorplanOverlay, setFloorplanOverlay] = useState<FloorplanOverlayClass | null>(null);
  const [floorplanVisible, setFloorplanVisible] = useState(false);
  const [selectedFloorplan, setSelectedFloorplan] = useState('');
  const [polygons, setPolygons] = useState<google.maps.Polygon[]>([]);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  const availableFloorplans = [
    { id: 'building1', name: 'BASE', url: '/floorplans/outlines3.svg' },
    // { id: 'building2', name: 'Building 1', url: '/floorplans/outlines1.svg' },
    // { id: 'building3', name: 'Building 2', url: '/floorplans/outlines2.svg' },
  ];

  const defaultBounds = {
    north: 45.452202461792396,
    south: 45.451940921510364,
    east: 9.16323039180924,
    west: 9.162723454307711,
  };



  const handleToggleVisibility = () => {
    setFloorplanVisible(!floorplanVisible);

    if (floorplanOverlay && map) {
      if (!floorplanVisible) {
        floorplanOverlay.setMap(map);
      } else {
        floorplanOverlay.setMap(null);
      }
    }
  };

  const handleSelectFloorplan = (floorplanId: string) => {
    if (floorplanOverlay) {
      try {
        floorplanOverlay.setMap(null);
      } catch (error) {
        console.warn('Error removing existing floorplan:', error);
      }
      setFloorplanOverlay(null);
    }

    if (floorplanId && map && window.google) {
      const selected = availableFloorplans.find(fp => fp.id === floorplanId);
      if (selected) {
        try {
          const bounds = new window.google.maps.LatLngBounds(
            new window.google.maps.LatLng(defaultBounds.south, defaultBounds.west),
            new window.google.maps.LatLng(defaultBounds.north, defaultBounds.east)
          );

          const newOverlay = new FloorplanOverlayClass(
            bounds,
            selected.url,
            map,
            {
              opacity: 0.8,
              minZoom: 18,
              maxZoom: 21
            }
          );

          setFloorplanOverlay(newOverlay);
          setFloorplanVisible(true);
          setSelectedFloorplan(floorplanId);
        } catch (error) {
          console.error('Error creating floorplan overlay:', error);
        }
      }
    }
  };

  useEffect(() => {
    if (map && availableFloorplans.length > 0 && !selectedFloorplan) {
      handleSelectFloorplan(availableFloorplans[0].id);
    }
  }, [map]);

  const generateBeechLeaf = () => {
    if (!map || !window.google) return;

    const center = map.getCenter();
    if (!center) return;

    const latOffset = (Math.random() - 0.5) * 0.001;
    const lngOffset = (Math.random() - 0.5) * 0.001;
    
    const leafCenter = {
      lat: center.lat() + latOffset,
      lng: center.lng() + lngOffset
    };

    const generator = createShapeGenerator('beechLeaf', window.google, map);
    const leafData = generator.generateShape(leafCenter, { minSize: 50, maxSize: 150 });

    const polygon = new window.google.maps.Polygon({
      paths: leafData.vertices,
      strokeColor: leafData.color.stroke,
      strokeOpacity: leafData.opacity.stroke,
      strokeWeight: leafData.weight,
      fillColor: leafData.color.fill,
      fillOpacity: leafData.opacity.fill,
      map: map
    });

    const marker = new window.google.maps.Marker({
      position: leafCenter,
      map: map,
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#FFFFFF',
        fillOpacity: 1,
        strokeColor: '#000000',
        strokeWeight: 1,
        scale: 3
      }
    });

    setPolygons(prev => [...prev, polygon]);
    setMarkers(prev => [...prev, marker]);
  };

  const clearAllShapes = () => {
    polygons.forEach(polygon => {
      polygon.setMap(null);
    });
    
    markers.forEach(marker => {
      marker.setMap(null);
    });
    
    setPolygons([]);
    setMarkers([]);
  };

  if (!map) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 10,
        right: 100,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        backgroundColor: 'background.paper',
        borderRadius: 1,
        p: 1,
        boxShadow: 2,
        minWidth: 'fit-content',
      }}
    >
      <Tooltip title={floorplanVisible ? "Hide Floorplan" : "Show Floorplan"}>
        <div style={{ width: 40, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <IconButton
            onClick={handleToggleVisibility}
            size="small"
            sx={{
              width: 40,
              height: 40,
              minWidth: 40,
              minHeight: 40,
              maxWidth: 40,
              maxHeight: 40,
              backgroundColor: floorplanVisible ? 'primary.main' : 'background.paper',
              color: floorplanVisible ? 'primary.contrastText' : 'text.primary',
              '&:hover': {
                backgroundColor: floorplanVisible ? 'primary.dark' : 'action.hover',
              },
            }}
          >
            <LayersIcon />
          </IconButton>
        </div>
      </Tooltip>
      
      {floorplanVisible && (
        <>
          <FormControl size="small" sx={{ minWidth: 120, alignSelf: 'stretch' }}>
            <InputLabel>Floorplan</InputLabel>
            <Select
              value={selectedFloorplan}
              label="Floorplan"
              onChange={(e) => handleSelectFloorplan(e.target.value)}
            >
              {availableFloorplans.map((floorplan) => (
                <MenuItem key={floorplan.id} value={floorplan.id}>
                  {floorplan.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          

        </>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mt: 1 }}>
        <Tooltip title="Generate Beech Leaf">
          <div style={{ width: 40, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <IconButton
              onClick={generateBeechLeaf}
              size="small"
              sx={{
                width: 40,
                height: 40,
                minWidth: 40,
                minHeight: 40,
                maxWidth: 40,
                maxHeight: 40,
                backgroundColor: 'success.main',
                color: 'success.contrastText',
                '&:hover': {
                  backgroundColor: 'success.dark',
                },
              }}
            >
              <AddIcon />
            </IconButton>
          </div>
        </Tooltip>
        
        <Tooltip title="Clear All Shapes">
          <div style={{ width: 40, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <IconButton
              onClick={clearAllShapes}
              disabled={polygons.length === 0}
              size="small"
              sx={{
                width: 40,
                height: 40,
                minWidth: 40,
                minHeight: 40,
                maxWidth: 40,
                maxHeight: 40,
                backgroundColor: 'error.main',
                color: 'error.contrastText',
                '&:hover': {
                  backgroundColor: 'error.dark',
                },
                '&.Mui-disabled': {
                  backgroundColor: 'action.disabledBackground',
                  color: 'action.disabled',
                },
              }}
            >
              <ClearIcon />
            </IconButton>
          </div>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default FloorplanOverlay; 