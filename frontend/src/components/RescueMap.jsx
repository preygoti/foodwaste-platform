import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapPin,
  Navigation,
  Clock,
  Flame,
  CheckCircle2,
  Share2,
  Route,
  Sparkles,
  Layers,
  X,
  ArrowRight,
  AlertTriangle,
  LocateFixed,
  Maximize2,
  Compass,
  ExternalLink,
  Search,
  ChevronDown,
  Building2,
  Target,
} from "lucide-react";
import {
  CITY_COORDINATES,
  POPULAR_MAP_CITIES,
  DEFAULT_FALLBACK_COORDINATES,
  resolveInitialListingCoordinates,
  geocodeWithNominatim,
  calculateDistanceKm,
  formatDistance,
} from "../utils/geocoding";

// Reliable Map Tile Providers (100% Free, No API Keys Required)
const MAP_TILE_PROVIDERS = {
  osm: {
    name: "Standard OSM",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  voyager: {
    name: "Clean Light",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  },
  topo: {
    name: "Terrain",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    subdomains: "abc",
    maxZoom: 17,
  },
};

function getUrgencyLevel(expiryDateStr) {
  if (!expiryDateStr) return "fresh";
  const parts = expiryDateStr.split("-").map(Number);
  if (parts.length !== 3) return "fresh";
  const [year, month, day] = parts;
  const targetTime = new Date(year, month - 1, day, 23, 59, 59).getTime();
  const diffMs = targetTime - Date.now();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 1) return "critical";
  if (days <= 3) return "warning";
  return "fresh";
}

export default function RescueMap({ listings = [], onClaimListing, selectedRadius = 25 }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const routePolylineRef = useRef(null);
  const radarCircleRef = useRef(null);
  const userMarkerRef = useRef(null);

  const [activeListing, setActiveListing] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [showRouteDrawer, setShowRouteDrawer] = useState(false);
  const [tileStyle, setTileStyle] = useState("voyager"); // Default to clean Voyager
  const [userLocation, setUserLocation] = useState(DEFAULT_FALLBACK_COORDINATES);
  const [locationLabel, setLocationLabel] = useState("Surat Hub (Default)");
  const [gpsStatus, setGpsStatus] = useState("detecting"); // "detecting" | "live" | "custom" | "fallback"
  const [geocodedCoordsMap, setGeocodedCoordsMap] = useState({});
  const [searchLocationQuery, setSearchLocationQuery] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState("");
  const [isClickToSetBaseMode, setIsClickToSetBaseMode] = useState(false);

  // 1. Initial Live GPS Detection on Mount
  useEffect(() => {
    let isMounted = true;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted) return;
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setLocationLabel("Your Live GPS Location");
          setGpsStatus("live");
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(coords, 13);
          }
        },
        (err) => {
          console.warn("Live GPS unavailable, using smart city default:", err.message);
          if (!isMounted) return;
          setGpsStatus("fallback");
          // If listings exist, center near the first listing
          if (listings.length > 0) {
            const firstCoords = resolveInitialListingCoordinates(listings[0], DEFAULT_FALLBACK_COORDINATES, 0);
            setUserLocation(firstCoords);
            setLocationLabel(listings[0].pickup_location || "Near Listing Hub");
            if (mapInstanceRef.current) {
              mapInstanceRef.current.setView(firstCoords, 13);
            }
          }
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 300000 }
      );
    } else {
      setGpsStatus("fallback");
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Asynchronously Geocode custom addresses with OpenStreetMap Nominatim API
  useEffect(() => {
    let isCancelled = false;

    async function runGeocoding() {
      const newMap = { ...geocodedCoordsMap };
      let hasUpdates = false;

      for (let i = 0; i < listings.length; i++) {
        const item = listings[i];
        if (!item?.id || newMap[item.id]) continue;

        const locStr = item.pickup_location || item.address;
        if (locStr) {
          const coords = await geocodeWithNominatim(locStr);
          if (coords && !isCancelled) {
            newMap[item.id] = coords;
            hasUpdates = true;
          }
        }
      }

      if (hasUpdates && !isCancelled) {
        setGeocodedCoordsMap(newMap);
      }
    }

    if (listings.length > 0) {
      runGeocoding();
    }

    return () => {
      isCancelled = true;
    };
  }, [listings]);

  // 3. Map Listings with accurate coordinates and calculated distances
  const mappedListings = useMemo(() => {
    return listings.map((l, idx) => {
      const coords = geocodedCoordsMap[l.id] || resolveInitialListingCoordinates(l, userLocation, idx);
      const distKm = calculateDistanceKm(userLocation[0], userLocation[1], coords[0], coords[1]);

      return {
        ...l,
        coords,
        urgency: getUrgencyLevel(l.expiry_date),
        distKm,
        distFormatted: formatDistance(distKm),
      };
    });
  }, [listings, userLocation, geocodedCoordsMap]);

  // 4. Filter Listings within Radar Radius
  const filteredListings = useMemo(() => {
    return mappedListings.filter((l) => {
      if (selectedRadius >= 50) return true;
      return l.distKm <= selectedRadius;
    });
  }, [mappedListings, selectedRadius]);

  // 5. Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: userLocation,
      zoom: 13,
      zoomControl: false, // Custom position control
      attributionControl: false,
    });

    // Add zoom controls to bottom-right
    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Add Tile Layer
    const provider = MAP_TILE_PROVIDERS[tileStyle] || MAP_TILE_PROVIDERS.voyager;
    const tileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains || "abc",
      attribution: provider.attribution,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Create Marker Layer Group
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    // Click handler on map to set custom base pin
    map.on("click", (e) => {
      const clickedCoords = [e.latlng.lat, e.latlng.lng];
      setUserLocation(clickedCoords);
      setLocationLabel(`Custom Location (${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)})`);
      setGpsStatus("custom");
    });

    // Invalidate size on load
    setTimeout(() => map.invalidateSize(), 150);
    setTimeout(() => map.invalidateSize(), 500);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 6. Handle Tile Style Switching
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;

    map.removeLayer(tileLayerRef.current);
    const provider = MAP_TILE_PROVIDERS[tileStyle] || MAP_TILE_PROVIDERS.voyager;
    const newLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains || "abc",
      attribution: provider.attribution,
    }).addTo(map);

    tileLayerRef.current = newLayer;
  }, [tileStyle]);

  // 7. Update User / NGO Base Marker and Radar Coverage Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove previous user marker and radar circle
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (radarCircleRef.current) {
      map.removeLayer(radarCircleRef.current);
      radarCircleRef.current = null;
    }

    // User Base Pin DivIcon
    const isLiveGps = gpsStatus === "live";
    const userPinHtml = `
      <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; inset: -4px; border-radius: 50%; background: ${
          isLiveGps ? "rgba(34, 197, 94, 0.4)" : "rgba(31, 58, 46, 0.3)"
        }; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; background: #1a3325; color: #ffffff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.4); border: 2.5px solid ${
          isLiveGps ? "#22c55e" : "#fbf0d9"
        };">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: "custom-user-hub-pin",
      html: userPinHtml,
      iconSize: [42, 42],
      iconAnchor: [21, 21],
    });

    const userMarker = L.marker(userLocation, { icon: userIcon })
      .addTo(map)
      .bindTooltip(
        `<div style="font-family: inherit; font-size: 11px; font-weight: bold; color: #1a3325;">
          ${isLiveGps ? "🎯 Live GPS Base" : "📍 " + locationLabel}
        </div>`,
        { permanent: false, direction: "top", offset: [0, -18] }
      );

    userMarkerRef.current = userMarker;

    // Draw Radar Search Radius Circle
    if (selectedRadius && selectedRadius < 50) {
      const circle = L.circle(userLocation, {
        radius: selectedRadius * 1000,
        color: "#22c55e",
        weight: 1.5,
        opacity: 0.85,
        dashArray: "6, 6",
        fillColor: "#15803d",
        fillOpacity: 0.06,
      }).addTo(map);

      radarCircleRef.current = circle;
    }
  }, [userLocation, gpsStatus, selectedRadius, locationLabel]);

  // 8. Render Food Surplus Listing Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    filteredListings.forEach((item) => {
      const isCritical = item.urgency === "critical";
      const isWarning = item.urgency === "warning";

      const bgColor = isCritical ? "#dc2626" : isWarning ? "#d97706" : "#16a34a";
      const pulseHtml = isCritical
        ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(220, 38, 38, 0.45); animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>`
        : "";

      const iconHtml = `
        <div style="position: relative; width: 36px; height: 36px; cursor: pointer; transition: transform 0.15s ease;" class="hover:scale-110">
          ${pulseHtml}
          <div style="position: relative; background: ${bgColor}; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); border: 2.5px solid #ffffff; font-weight: bold; font-size: 11px; line-height: 1;">
            <span>${item.quantity > 99 ? "99+" : Math.round(item.quantity)}</span>
            <span style="font-size: 7px; opacity: 0.9; text-transform: uppercase;">${item.unit || "kg"}</span>
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: `rescue-pin-${item.id}`,
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(item.coords, { icon: markerIcon }).addTo(markersGroup);

      marker.bindTooltip(
        `<div style="font-family: inherit; font-size: 11px; line-height: 1.3;">
          <strong style="color: #1a3325; display: block;">${item.title}</strong>
          <span style="color: #666;">${item.business_name || "Food Donor"} &bull; ${item.distFormatted || "Nearby"}</span>
        </div>`,
        { direction: "top", offset: [0, -18] }
      );

      marker.on("click", () => {
        setActiveListing(item);
      });
    });
  }, [filteredListings]);

  // 9. Handle Multi-Stop Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (routeStops.length > 0) {
      const sortedStops = [...routeStops].sort((a, b) => {
        const order = { critical: 1, warning: 2, fresh: 3 };
        return (order[a.urgency] || 3) - (order[b.urgency] || 3);
      });

      const routePoints = [userLocation, ...sortedStops.map((s) => s.coords)];

      const polyline = L.polyline(routePoints, {
        color: "#1a3325",
        weight: 4,
        dashArray: "8, 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      routePolylineRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }, [routeStops, userLocation]);

  // 10. Fit Bounds to Show All Listings & User Base
  const handleFitAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points = [userLocation, ...filteredListings.map((l) => l.coords)];
    if (points.length === 1) {
      map.setView(userLocation, 13);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [userLocation, filteredListings]);

  // 11. Recenter to User's GPS Location
  const handleLocateMe = useCallback(() => {
    setLocationSearchError("");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setLocationLabel("Your Live GPS Location");
          setGpsStatus("live");
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(coords, 14, { duration: 1.2 });
          }
        },
        (err) => {
          setLocationSearchError("GPS access denied. Pick a city from the list.");
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(userLocation, 14, { duration: 1.2 });
          }
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(userLocation, 14, { duration: 1.2 });
    }
  }, [userLocation]);

  // 12. Quick Select City
  const handleSelectCity = (city) => {
    setLocationSearchError("");
    setUserLocation(city.coords);
    setLocationLabel(city.name);
    setGpsStatus("custom");
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(city.coords, 13, { duration: 1.2 });
    }
  };

  // 13. Search Custom Location
  const handleSearchLocation = async (e) => {
    e?.preventDefault?.();
    const query = searchLocationQuery.trim();
    if (!query) return;

    setLocationSearchError("");
    setIsSearchingLocation(true);

    try {
      const coords = await geocodeWithNominatim(query);
      if (coords) {
        setUserLocation(coords);
        setLocationLabel(query);
        setGpsStatus("custom");
        setSearchLocationQuery("");
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(coords, 13, { duration: 1.2 });
        }
      } else {
        setLocationSearchError(`Could not find coordinates for "${query}". Try adding city name.`);
      }
    } catch {
      setLocationSearchError("Network timeout during geocode search.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const toggleRouteStop = (item) => {
    setRouteStops((prev) => {
      const exists = prev.find((s) => s.id === item.id);
      if (exists) {
        return prev.filter((s) => s.id !== item.id);
      }
      return [...prev, item];
    });
    setShowRouteDrawer(true);
  };

  // Compute Route Metrics
  const routeStats = useMemo(() => {
    if (routeStops.length === 0) return { totalDistKm: 0, totalMeals: 0, totalQty: 0, estMins: 0 };
    let totalDist = 0;
    let curr = userLocation;
    let totalQty = 0;

    routeStops.forEach((s) => {
      totalDist += calculateDistanceKm(curr[0], curr[1], s.coords[0], s.coords[1]);
      curr = s.coords;
      totalQty += Number(s.quantity) || 0;
    });

    const estMins = Math.round(totalDist * 2.8 + routeStops.length * 12);

    return {
      totalDistKm: Math.round(totalDist * 10) / 10,
      totalQty: Math.round(totalQty * 10) / 10,
      totalMeals: Math.round(totalQty * 2.5),
      estMins,
    };
  }, [routeStops, userLocation]);

  // Generate Google Maps Turn-by-Turn GPS Navigation URL
  const googleMapsRouteUrl = useMemo(() => {
    if (routeStops.length === 0) return "";
    const origin = `${userLocation[0]},${userLocation[1]}`;
    const destination = `${routeStops[routeStops.length - 1].coords[0]},${routeStops[routeStops.length - 1].coords[1]}`;
    const waypoints = routeStops
      .slice(0, -1)
      .map((s) => `${s.coords[0]},${s.coords[1]}`)
      .join("|");

    if (waypoints) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  }, [routeStops, userLocation]);

  return (
    <div className="space-y-2.5">
      {/* 📍 Interactive Location Control Bar */}
      <div className="bg-white border border-wheat-200 rounded-xl p-2.5 sm:p-3 shadow-2xs space-y-2 text-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Active Center Hub Indicator */}
          <div className="flex items-center gap-2 text-forest-800">
            <div className={`p-1.5 rounded-lg ${gpsStatus === "live" ? "bg-emerald-100 text-emerald-700" : "bg-forest-100 text-forest-800"}`}>
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm">
                <span>Center Location:</span>
                <span className="text-forest-700 underline decoration-dotted">{locationLabel}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  gpsStatus === "live" ? "bg-emerald-100 text-emerald-800 font-bold" : "bg-wheat-200 text-forest-800"
                }`}>
                  {gpsStatus === "live" ? "GPS Active" : "Custom Hub"}
                </span>
              </div>
              <p className="text-[11px] text-forest-800/60">
                Click anywhere on map to move your radar center & recalculate nearby food distances.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              onClick={handleLocateMe}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg font-semibold text-xs transition-colors shadow-2xs"
              title="Detect live GPS location"
            >
              <LocateFixed className="w-3.5 h-3.5 text-emerald-600" />
              <span>Use Live GPS</span>
            </button>

            <button
              onClick={handleFitAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-wheat-100 hover:bg-wheat-200 text-forest-800 rounded-lg font-semibold text-xs transition-colors border border-wheat-300/60 shadow-2xs"
              title="Show all food pins on screen"
            >
              <Maximize2 className="w-3.5 h-3.5 text-forest-600" />
              <span>Fit All ({filteredListings.length})</span>
            </button>
          </div>
        </div>

        {/* City Quick Pills & Address Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-wheat-100">
          <span className="text-forest-800/60 font-mono text-[11px] uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Quick Cities:
          </span>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 flex-1 no-scrollbar">
            {POPULAR_MAP_CITIES.map((city) => (
              <button
                key={city.name}
                onClick={() => handleSelectCity(city)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                  locationLabel.toLowerCase().includes(city.name.toLowerCase())
                    ? "bg-forest-800 text-wheat-50 border-forest-800 shadow-2xs"
                    : "bg-white text-forest-800/80 border-wheat-200 hover:bg-wheat-50"
                }`}
              >
                {city.name}
              </button>
            ))}
          </div>

          {/* Search Location Input */}
          <form onSubmit={handleSearchLocation} className="flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <input
                type="text"
                placeholder="Type any city/area..."
                value={searchLocationQuery}
                onChange={(e) => setSearchLocationQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs border border-wheat-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-forest-400 bg-white"
              />
              <Search className="w-3.5 h-3.5 text-forest-800/40 absolute left-2 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="submit"
              disabled={isSearchingLocation}
              className="px-2.5 py-1 bg-forest-800 text-wheat-50 rounded-lg text-xs font-semibold hover:bg-forest-700 disabled:opacity-50"
            >
              {isSearchingLocation ? "..." : "Go"}
            </button>
          </form>
        </div>

        {locationSearchError && (
          <div className="text-[11px] text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>{locationSearchError}</span>
          </div>
        )}
      </div>

      {/* 🗺️ Main Map Canvas Container */}
      <div className="relative w-full h-[540px] sm:h-[620px] rounded-2xl overflow-hidden border border-wheat-200 shadow-sm bg-wheat-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top Left: Legend */}
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-wheat-200 p-2.5 rounded-xl shadow-sm text-xs font-mono space-y-1 pointer-events-auto">
          <div className="font-semibold text-forest-800 text-[11px] uppercase tracking-wider mb-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-forest-600" />
              <span>Radar ({filteredListings.length} Active)</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${gpsStatus === "live" ? "bg-emerald-500 animate-pulse" : "bg-forest-600"}`} />
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
            <span className="text-forest-800">Critical (&lt;24h)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-forest-800">Watch (&lt;72h)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-forest-600"></span>
            <span className="text-forest-800">Fresh Stock</span>
          </div>
        </div>

        {/* Top Right: Tile Style Switcher */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-xl border border-wheat-200 shadow-sm p-1 flex gap-1">
            {Object.entries(MAP_TILE_PROVIDERS).map(([key, prov]) => (
              <button
                key={key}
                onClick={() => setTileStyle(key)}
                className={`px-2 py-1 text-[10px] font-mono rounded-lg transition-all ${
                  tileStyle === key
                    ? "bg-forest-800 text-wheat-50 font-bold"
                    : "text-forest-800/70 hover:text-forest-800"
                }`}
              >
                {key === "osm" ? "OSM" : key === "voyager" ? "Clean" : "Topo"}
              </button>
            ))}
          </div>
        </div>

        {/* Route Planner Floating Trigger */}
        {routeStops.length > 0 && !showRouteDrawer && (
          <button
            onClick={() => setShowRouteDrawer(true)}
            className="absolute bottom-4 left-4 z-[1000] bg-forest-800 text-wheat-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 hover:bg-forest-700 transition-all animate-bounce"
          >
            <Route className="w-4 h-4 text-gold-400" />
            <span>Active Route ({routeStops.length} stops &bull; {routeStats.totalDistKm} km)</span>
          </button>
        )}

        {/* Selected Listing Popover Card */}
        {activeListing && (
          <div className="absolute bottom-4 right-4 max-w-sm w-[90%] sm:w-80 z-[1000] bg-white border border-wheat-200 rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                    activeListing.urgency === "critical"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : activeListing.urgency === "warning"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-forest-50 text-forest-800 border border-forest-100"
                  }`}>
                    {activeListing.urgency === "critical" ? (
                      <>
                        <Flame className="w-3 h-3 text-rose-600" />
                        <span>Urgent (&lt;24h)</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3" />
                        <span>Expires {activeListing.expiry_date}</span>
                      </>
                    )}
                  </span>
                  {activeListing.distFormatted && (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      📍 {activeListing.distFormatted}
                    </span>
                  )}
                </div>

                <h4 className="font-display font-semibold text-forest-800 text-base">
                  {activeListing.title}
                </h4>
                <p className="text-xs text-forest-800/60 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-forest-600 shrink-0" />
                  <span className="truncate">{activeListing.pickup_location || "Storefront Location"}</span>
                </p>
              </div>

              <button
                onClick={() => setActiveListing(null)}
                className="p-1 text-forest-800/40 hover:text-forest-800 rounded-lg hover:bg-wheat-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-wheat-100 flex items-center justify-between text-xs font-mono">
              <span className="text-forest-800 font-bold text-sm">
                {activeListing.quantity} {activeListing.unit}
              </span>
              <span className="text-forest-800/60 capitalize">
                Category: {activeListing.category}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeListing.coords[0]},${activeListing.coords[1]}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-wheat-100 hover:bg-wheat-200 text-forest-800 transition-all border border-wheat-300/60"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Directions</span>
              </a>

              <button
                onClick={() => {
                  toggleRouteStop(activeListing);
                }}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  routeStops.some((s) => s.id === activeListing.id)
                    ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                    : "bg-forest-800 text-wheat-50 border-forest-800 hover:bg-forest-700"
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span>
                  {routeStops.some((s) => s.id === activeListing.id) ? "Remove Stop" : "Add to Route"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Route Drawer Overlay */}
        {showRouteDrawer && (
          <div className="absolute inset-y-0 right-0 w-full sm:w-88 z-[1001] bg-white border-l border-wheat-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-wheat-200 flex items-center justify-between bg-forest-900 text-wheat-50">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-gold-400" />
                <div>
                  <h3 className="font-semibold text-sm">Rescue Route Dispatch</h3>
                  <p className="text-[11px] text-wheat-200/70">{routeStops.length} Stops Planned</p>
                </div>
              </div>
              <button
                onClick={() => setShowRouteDrawer(false)}
                className="p-1 text-wheat-200 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Route Stats Summary */}
            <div className="p-4 bg-wheat-50/50 border-b border-wheat-200 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-wheat-200">
                <span className="block text-[10px] font-mono text-forest-800/60 uppercase">Distance</span>
                <span className="font-bold text-forest-800 text-sm">{routeStats.totalDistKm} km</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-wheat-200">
                <span className="block text-[10px] font-mono text-forest-800/60 uppercase">Est. Meals</span>
                <span className="font-bold text-emerald-700 text-sm">~{routeStats.totalMeals}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-wheat-200">
                <span className="block text-[10px] font-mono text-forest-800/60 uppercase">Est. Time</span>
                <span className="font-bold text-forest-800 text-sm">{routeStats.estMins}m</span>
              </div>
            </div>

            {/* Stop Sequence List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-forest-800">
                <span className="w-5 h-5 rounded-full bg-forest-800 text-wheat-50 flex items-center justify-center text-[10px] font-mono">0</span>
                <span>Base Hub ({locationLabel})</span>
              </div>

              {routeStops.map((stop, idx) => (
                <div
                  key={stop.id}
                  className="bg-white border border-wheat-200 rounded-xl p-3 shadow-2xs space-y-1.5 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-xs text-forest-800">{stop.title}</span>
                    </div>
                    <button
                      onClick={() => toggleRouteStop(stop)}
                      className="text-forest-800/40 hover:text-rose-600 p-1"
                      title="Remove stop"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-forest-800/60 pl-7">{stop.pickup_location || "Storefront"}</p>
                </div>
              ))}
            </div>

            {/* Google Maps External Dispatch */}
            <div className="p-4 border-t border-wheat-200 bg-white space-y-2">
              <a
                href={googleMapsRouteUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-sm"
              >
                <Navigation className="w-4 h-4" />
                <span>Launch Turn-by-Turn GPS</span>
              </a>
              <button
                onClick={() => setRouteStops([])}
                className="w-full text-center text-xs text-forest-800/50 hover:text-forest-800 py-1"
              >
                Clear Entire Route
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
