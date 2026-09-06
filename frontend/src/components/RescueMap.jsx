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
} from "lucide-react";
import {
  CITY_COORDINATES,
  DEFAULT_FALLBACK_COORDINATES,
  resolveInitialListingCoordinates,
  geocodeWithNominatim,
  calculateDistanceKm,
  formatDistance,
} from "../utils/geocoding";

// Reliable Map Tile Providers (100% Free, No API Keys Required)
const MAP_TILE_PROVIDERS = {
  osm: {
    name: "Standard OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  voyager: {
    name: "Clean Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19,
  },
  topo: {
    name: "Terrain / Topo",
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
  const [tileStyle, setTileStyle] = useState("osm"); // "osm" | "voyager" | "topo"
  const [userLocation, setUserLocation] = useState(DEFAULT_FALLBACK_COORDINATES);
  const [gpsStatus, setGpsStatus] = useState("detecting"); // "detecting" | "live" | "fallback"
  const [geocodedCoordsMap, setGeocodedCoordsMap] = useState({});

  // 1. Detect Real Live User GPS Location on Mount
  useEffect(() => {
    let isMounted = true;

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted) return;
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setGpsStatus("live");
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(coords, 13);
          }
        },
        (err) => {
          console.warn("Live GPS unavailable or permission denied, using local smart center:", err.message);
          if (!isMounted) return;
          setGpsStatus("fallback");
          // If listings exist, center on the first listing's estimated coordinates
          if (listings.length > 0) {
            const firstCoords = resolveInitialListingCoordinates(listings[0], DEFAULT_FALLBACK_COORDINATES, 0);
            setUserLocation(firstCoords);
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
  }, [listings.length]);

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
      // Use geocoded coords if resolved, otherwise smart initial coordinates
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
      zoomControl: true,
      attributionControl: false,
    });

    // Add Tile Layer
    const provider = MAP_TILE_PROVIDERS[tileStyle] || MAP_TILE_PROVIDERS.osm;
    const tileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains || "abc",
      attribution: provider.attribution,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Create Marker and Overlay Layer Groups
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    // Handle robust container sizing and prevent gray tiles
    const invalidateTimer1 = setTimeout(() => map.invalidateSize(), 100);
    const invalidateTimer2 = setTimeout(() => map.invalidateSize(), 350);
    const invalidateTimer3 = setTimeout(() => map.invalidateSize(), 650);

    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      clearTimeout(invalidateTimer1);
      clearTimeout(invalidateTimer2);
      clearTimeout(invalidateTimer3);
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
    const provider = MAP_TILE_PROVIDERS[tileStyle] || MAP_TILE_PROVIDERS.osm;
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
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; inset: -4px; border-radius: 50%; background: ${
          isLiveGps ? "rgba(34, 197, 94, 0.35)" : "rgba(31, 58, 46, 0.25)"
        }; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; background: #1a3325; color: #ffffff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); border: 2.5px solid ${
          isLiveGps ? "#22c55e" : "#ffffff"
        };">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      </div>
    `;

    const userIcon = L.divIcon({
      className: "custom-user-hub-pin",
      html: userPinHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const userMarker = L.marker(userLocation, { icon: userIcon })
      .addTo(map)
      .bindTooltip(
        `<div style="font-family: inherit; font-size: 11px; font-weight: bold; color: #1a3325;">
          ${isLiveGps ? "🎯 Your Live GPS Location" : "📍 Relief Distribution Base"}
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
        opacity: 0.8,
        dashArray: "6, 6",
        fillColor: "#15803d",
        fillOpacity: 0.05,
      }).addTo(map);

      radarCircleRef.current = circle;
    }
  }, [userLocation, gpsStatus, selectedRadius]);

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
        ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(220, 38, 38, 0.4); animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>`
        : "";

      const iconHtml = `
        <div style="position: relative; width: 34px; height: 34px; cursor: pointer;">
          ${pulseHtml}
          <div style="position: relative; background: ${bgColor}; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid #ffffff; font-weight: bold; font-size: 11px; line-height: 1;">
            <span>${item.quantity > 99 ? "99+" : Math.round(item.quantity)}</span>
            <span style="font-size: 7px; opacity: 0.9; text-transform: uppercase;">${item.unit || "kg"}</span>
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: `rescue-pin-${item.id}`,
        html: iconHtml,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker(item.coords, { icon: markerIcon }).addTo(markersGroup);

      // Interactive Tooltip
      marker.bindTooltip(
        `<div style="font-family: inherit; font-size: 11px;">
          <strong style="color: #1a3325; display: block;">${item.title}</strong>
          <span style="color: #666;">${item.business_name || "Food Donor"} &bull; ${item.distFormatted || "Nearby"}</span>
        </div>`,
        { direction: "top", offset: [0, -16] }
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
      // Prioritize stops by expiry urgency (critical stops first)
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
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [userLocation, filteredListings]);

  // 11. Recenter to User's GPS Location
  const handleLocateMe = useCallback(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(coords);
          setGpsStatus("live");
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(coords, 14, { duration: 1.2 });
          }
        },
        () => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo(userLocation, 14, { duration: 1.2 });
          }
        },
        { enableHighAccuracy: true }
      );
    } else if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(userLocation, 14, { duration: 1.2 });
    }
  }, [userLocation]);

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
    <div className="relative w-full h-[580px] sm:h-[640px] rounded-2xl overflow-hidden border border-wheat-200 shadow-sm bg-wheat-100">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Left: Radar Status & Legend */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-wheat-200 p-2.5 sm:p-3 rounded-xl shadow-sm text-xs font-mono space-y-1.5 pointer-events-auto">
        <div className="font-semibold text-forest-800 text-[11px] uppercase tracking-wider mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-forest-600" />
            <span>Live Radar ({filteredListings.length} Active)</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${gpsStatus === "live" ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} title={gpsStatus === "live" ? "GPS Live" : "Smart Estimated Hub"} />
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
          <span className="text-forest-800">Critical Expiry (&lt;24h)</span>
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

      {/* Top Right: Map Controls & Tile Switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={handleLocateMe}
          title="Re-center onto My Live GPS Location"
          className="bg-white/95 backdrop-blur-md hover:bg-white text-forest-800 p-2.5 rounded-xl border border-wheat-200 shadow-sm transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <LocateFixed className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">My GPS</span>
        </button>

        <button
          onClick={handleFitAll}
          title="Fit all donation pins in view"
          className="bg-white/95 backdrop-blur-md hover:bg-white text-forest-800 p-2.5 rounded-xl border border-wheat-200 shadow-sm transition-all flex items-center gap-1.5 text-xs font-semibold"
        >
          <Maximize2 className="w-4 h-4 text-forest-600" />
          <span className="hidden sm:inline">Fit All</span>
        </button>

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
        <div className="absolute bottom-4 right-4 max-w-sm w-full z-[1000] bg-white border border-wheat-200 rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
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
              className="text-forest-800/40 hover:text-forest-800 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between py-2.5 my-2.5 border-y border-wheat-100 text-xs font-mono">
            <div>
              <span className="text-forest-800/50 block text-[10px]">AVAILABLE SURPLUS</span>
              <strong className="text-forest-800 text-sm font-bold">
                {activeListing.quantity} {activeListing.unit}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-forest-800/50 block text-[10px]">DONOR</span>
              <span className="text-forest-800 font-semibold">{activeListing.business_name || "Food Partner"}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleRouteStop(activeListing)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                  routeStops.some((s) => s.id === activeListing.id)
                    ? "bg-forest-50 border-forest-600 text-forest-800 font-bold"
                    : "bg-white border-wheat-200 text-forest-800 hover:bg-wheat-50"
                }`}
              >
                <Route className="w-3.5 h-3.5 text-forest-600" />
                <span>{routeStops.some((s) => s.id === activeListing.id) ? "In Route Plan ✓" : "+ Add to Route"}</span>
              </button>

              <button
                onClick={() => {
                  onClaimListing && onClaimListing(activeListing);
                  setActiveListing(null);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-forest-800 text-wheat-50 rounded-xl text-xs font-semibold hover:bg-forest-700 shadow-sm transition-all"
              >
                <Share2 className="w-3.5 h-3.5 text-gold-400" />
                <span>Claim Surplus</span>
              </button>
            </div>

            {/* Google Maps Turn-by-Turn Direction Link */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeListing.coords[0]},${activeListing.coords[1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-forest-700 hover:text-forest-900 font-mono font-medium hover:underline"
            >
              <Navigation className="w-3 h-3 text-emerald-600" />
              <span>Open in Google Maps GPS Navigation</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>
      )}

      {/* Multi-Stop Route Drawer */}
      {showRouteDrawer && (
        <div className="absolute top-0 right-0 bottom-0 w-full sm:w-96 z-[1000] bg-white border-l border-wheat-200 shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-wheat-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-forest-800 text-wheat-50 flex items-center justify-center">
                <Route className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <h3 className="font-display font-semibold text-forest-800 text-sm">
                  Smart Multi-Stop Route
                </h3>
                <p className="text-[11px] text-forest-800/60 font-mono">
                  {routeStops.length} collection stop{routeStops.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowRouteDrawer(false)}
              className="text-forest-800/50 hover:text-forest-800 p-1.5 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Route Metrics Summary */}
          <div className="p-3.5 bg-wheat-50/50 border-b border-wheat-100 grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="bg-white p-2 rounded-xl border border-wheat-200/80">
              <span className="text-[10px] text-forest-800/50 uppercase block">Distance</span>
              <strong className="text-forest-800 font-bold text-sm">{routeStats.totalDistKm} km</strong>
            </div>
            <div className="bg-white p-2 rounded-xl border border-wheat-200/80">
              <span className="text-[10px] text-forest-800/50 uppercase block">Est. Time</span>
              <strong className="text-forest-800 font-bold text-sm">{routeStats.estMins} mins</strong>
            </div>
            <div className="bg-white p-2 rounded-xl border border-wheat-200/80">
              <span className="text-[10px] text-forest-800/50 uppercase block">Total Meals</span>
              <strong className="text-forest-800 font-bold text-sm">~{routeStats.totalMeals}</strong>
            </div>
          </div>

          {/* Stop-by-Stop Itinerary */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Origin Hub */}
            <div className="flex items-start gap-3 text-xs">
              <div className="w-6 h-6 rounded-full bg-forest-800 text-wheat-50 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                0
              </div>
              <div className="flex-1">
                <span className="font-semibold text-forest-800 block">
                  {gpsStatus === "live" ? "Your Live GPS Location (Start)" : "Distribution Base (Start)"}
                </span>
                <span className="text-forest-800/50 text-[11px]">Vehicles dispatch location</span>
              </div>
            </div>

            {routeStops.map((stop, i) => (
              <div key={stop.id} className="relative flex items-start gap-3 text-xs bg-wheat-50/30 p-2.5 rounded-xl border border-wheat-200/60">
                <div className={`w-6 h-6 rounded-full text-white flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5 ${
                  stop.urgency === "critical" ? "bg-rose-600" : stop.urgency === "warning" ? "bg-amber-600" : "bg-forest-600"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h5 className="font-semibold text-forest-800 truncate">{stop.title}</h5>
                    <span className="font-mono text-[10px] font-bold text-forest-700 bg-wheat-100 px-1.5 py-0.2 rounded">
                      {stop.quantity} {stop.unit}
                    </span>
                  </div>
                  <p className="text-forest-800/50 text-[11px] truncate mt-0.5">{stop.pickup_location}</p>
                  {stop.distFormatted && (
                    <span className="text-[10px] font-mono text-emerald-700 block mt-0.5">
                      📍 {stop.distFormatted}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleRouteStop(stop)}
                  className="text-tomato-500 hover:text-tomato-700 p-1"
                  title="Remove from route"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-wheat-100 bg-white space-y-2">
            {googleMapsRouteUrl && (
              <a
                href={googleMapsRouteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-forest-800 text-wheat-50 py-3 rounded-xl text-xs font-semibold hover:bg-forest-700 shadow-sm transition-all"
              >
                <Navigation className="w-4 h-4 text-gold-400" />
                <span>Launch Driver Turn-by-Turn GPS</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            )}
            <button
              onClick={() => setRouteStops([])}
              className="w-full text-center text-xs text-forest-800/50 hover:text-forest-800 py-1"
            >
              Clear Route Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
