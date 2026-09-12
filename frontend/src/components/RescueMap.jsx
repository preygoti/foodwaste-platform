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
  LocateFixed,
  Maximize2,
  ExternalLink,
  Shield,
  Utensils,
  Store,
  Check,
} from "lucide-react";
import {
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

export default function RescueMap({
  listings = [],
  onClaimListing,
  selectedRadius = 25,
  currentUser = null,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersGroupRef = useRef(null);
  const routePolylineRef = useRef(null);
  const radarCircleRef = useRef(null);
  const ngoMarkerRef = useRef(null);

  const [activeListing, setActiveListing] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [showRouteDrawer, setShowRouteDrawer] = useState(false);
  const [tileStyle, setTileStyle] = useState("voyager");

  // NGO Hub Identity & Fixed Base Coordinates (From Registration)
  const ngoOrgName = currentUser?.org_name || "Food Rescue NGO Headquarters";
  const [ngoLocation, setNgoLocation] = useState(DEFAULT_FALLBACK_COORDINATES);
  const [ngoAddressLabel, setNgoAddressLabel] = useState(
    currentUser?.address || "Registered Headquarters (Surat Hub)"
  );

  const [geocodedCoordsMap, setGeocodedCoordsMap] = useState({});

  // 1. Resolve NGO Base Location strictly from Registered Account Address
  useEffect(() => {
    let isMounted = true;

    async function initializeNgoLocation() {
      const registeredAddress = currentUser?.address?.trim();
      if (registeredAddress && registeredAddress.length >= 2) {
        const coords = await geocodeWithNominatim(registeredAddress);
        if (coords && isMounted) {
          setNgoLocation(coords);
          setNgoAddressLabel(registeredAddress);
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView(coords, 13);
          }
          return;
        }
      }

      // Default fallback
      if (isMounted) {
        setNgoLocation(DEFAULT_FALLBACK_COORDINATES);
        setNgoAddressLabel(registeredAddress || "Registered Headquarters (Surat Hub)");
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(DEFAULT_FALLBACK_COORDINATES, 13);
        }
      }
    }

    initializeNgoLocation();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.address]);

  // 2. Geocode Donor Pickup Locations with OpenStreetMap Nominatim
  useEffect(() => {
    let isCancelled = false;

    async function geocodeDonorLocations() {
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
      geocodeDonorLocations();
    }

    return () => {
      isCancelled = true;
    };
  }, [listings]);

  // 3. Map Donor Listings relative to the NGO Base
  const mappedListings = useMemo(() => {
    return listings.map((l, idx) => {
      const coords =
        geocodedCoordsMap[l.id] ||
        resolveInitialListingCoordinates(l, ngoLocation, idx);
      const distKm = calculateDistanceKm(
        ngoLocation[0],
        ngoLocation[1],
        coords[0],
        coords[1]
      );

      return {
        ...l,
        coords,
        urgency: getUrgencyLevel(l.expiry_date),
        distKm,
        distFormatted: formatDistance(distKm),
        donorName: l.business_name || "Surplus Food Donor",
      };
    });
  }, [listings, ngoLocation, geocodedCoordsMap]);

  // 4. Filter Listings within Radar Radius from NGO Base
  const filteredListings = useMemo(() => {
    return mappedListings.filter((l) => {
      if (selectedRadius >= 50) return true;
      return l.distKm <= selectedRadius;
    });
  }, [mappedListings, selectedRadius]);

  // 5. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: ngoLocation,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const provider = MAP_TILE_PROVIDERS[tileStyle] || MAP_TILE_PROVIDERS.voyager;
    const tileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains || "abc",
      attribution: provider.attribution,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

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

  // 6. Handle Tile Style
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

  // 7. Render 🏛️ NGO Base Station Marker & Radar Search Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (ngoMarkerRef.current) {
      map.removeLayer(ngoMarkerRef.current);
      ngoMarkerRef.current = null;
    }
    if (radarCircleRef.current) {
      map.removeLayer(radarCircleRef.current);
      radarCircleRef.current = null;
    }

    // Prominent NGO Headquarters Shield Pin
    const ngoPinHtml = `
      <div style="position: relative; width: 46px; height: 46px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; inset: -6px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        
        <div style="position: relative; background: #0f291e; color: #fbf0d9; width: 40px; height: 40px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(0,0,0,0.45); border: 3px solid #10b981; transform: rotate(45deg);">
          <div style="transform: rotate(-45deg); display: flex; flex-direction: column; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbf0d9" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
        </div>

        <div style="position: absolute; -bottom: 2px; background: #10b981; color: #ffffff; font-size: 8px; font-weight: 800; font-family: monospace; padding: 1px 4px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); text-transform: uppercase;">
          NGO HQ
        </div>
      </div>
    `;

    const ngoIcon = L.divIcon({
      className: "ngo-base-hub-marker",
      html: ngoPinHtml,
      iconSize: [46, 46],
      iconAnchor: [23, 23],
    });

    const ngoMarker = L.marker(ngoLocation, { icon: ngoIcon })
      .addTo(map)
      .bindTooltip(
        `<div style="font-family: inherit; font-size: 11px; padding: 2px;">
          <strong style="color: #0f291e; display: block; font-size: 12px;">🏛️ ${ngoOrgName}</strong>
          <span style="color: #10b981; font-weight: 600; font-size: 10px;">[ Rescue Dispatch Headquarters ]</span>
          <div style="color: #666; font-size: 10px; margin-top: 2px;">📍 ${ngoAddressLabel}</div>
        </div>`,
        { permanent: false, direction: "top", offset: [0, -22] }
      );

    ngoMarkerRef.current = ngoMarker;

    // Draw Radar Radius Circle from NGO Base
    if (selectedRadius && selectedRadius < 50) {
      const circle = L.circle(ngoLocation, {
        radius: selectedRadius * 1000,
        color: "#10b981",
        weight: 1.5,
        opacity: 0.9,
        dashArray: "6, 6",
        fillColor: "#059669",
        fillOpacity: 0.05,
      }).addTo(map);

      radarCircleRef.current = circle;
    }
  }, [ngoLocation, selectedRadius, ngoAddressLabel, ngoOrgName]);

  // 8. Render 🏪 Item Donor Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    filteredListings.forEach((item) => {
      const isCritical = item.urgency === "critical";
      const isWarning = item.urgency === "warning";

      const bgColor = isCritical ? "#dc2626" : isWarning ? "#d97706" : "#059669";
      const pulseHtml = isCritical
        ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(220, 38, 38, 0.45); animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>`
        : "";

      const iconHtml = `
        <div style="position: relative; width: 36px; height: 36px; cursor: pointer; transition: transform 0.15s ease;" class="hover:scale-110">
          ${pulseHtml}
          <div style="position: relative; background: ${bgColor}; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.35); border: 2.5px solid #ffffff; font-weight: bold; font-size: 11px; line-height: 1;">
            <span>${item.quantity > 99 ? "99+" : Math.round(item.quantity)}</span>
            <span style="font-size: 7px; opacity: 0.95; text-transform: uppercase;">${item.unit || "kg"}</span>
          </div>
          <div style="position: absolute; -top: 6px; -right: 6px; background: #ffffff; color: #1f3a2e; border: 1.5px solid ${bgColor}; width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            🏪
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: `donor-pin-${item.id}`,
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(item.coords, { icon: markerIcon }).addTo(markersGroup);

      marker.bindTooltip(
        `<div style="font-family: inherit; font-size: 11px; line-height: 1.3;">
          <strong style="color: #0f291e; display: block; font-size: 12px;">🏪 ${item.donorName}</strong>
          <span style="color: #4b5563; font-weight: 500;">📦 ${item.title} (${item.quantity} ${item.unit})</span>
          <div style="color: #059669; font-weight: 600; margin-top: 2px;">📏 ${item.distFormatted || "Nearby"} from your NGO HQ</div>
        </div>`,
        { direction: "top", offset: [0, -18] }
      );

      marker.on("click", () => {
        setActiveListing(item);
      });
    });
  }, [filteredListings]);

  // 9. Multi-Stop Rescue Route from NGO Base Station to Donors
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

      const routePoints = [ngoLocation, ...sortedStops.map((s) => s.coords)];

      const polyline = L.polyline(routePoints, {
        color: "#0f291e",
        weight: 4,
        dashArray: "8, 8",
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      routePolylineRef.current = polyline;
      map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }
  }, [routeStops, ngoLocation]);

  // 10. Fit All: Centers Viewport to show NGO Base + all Donors
  const handleFitAll = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points = [ngoLocation, ...filteredListings.map((l) => l.coords)];
    if (points.length === 1) {
      map.setView(ngoLocation, 13);
    } else {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [ngoLocation, filteredListings]);

  // 11. GPS Locate Button
  const handleCenterNgo = useCallback(() => {
    if (mapInstanceRef.current && ngoLocation) {
      mapInstanceRef.current.flyTo(ngoLocation, 14, { duration: 1.2 });
    }
  }, [ngoLocation]);

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
    if (routeStops.length === 0)
      return { totalDistKm: 0, totalMeals: 0, totalQty: 0, estMins: 0 };
    let totalDist = 0;
    let curr = ngoLocation;
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
  }, [routeStops, ngoLocation]);

  // Google Maps Turn-by-Turn GPS Navigation URL from NGO Base ➔ Donors
  const googleMapsRouteUrl = useMemo(() => {
    if (routeStops.length === 0) return "";
    const origin = `${ngoLocation[0]},${ngoLocation[1]}`;
    const destination = `${routeStops[routeStops.length - 1].coords[0]},${routeStops[routeStops.length - 1].coords[1]}`;
    const waypoints = routeStops
      .slice(0, -1)
      .map((s) => `${s.coords[0]},${s.coords[1]}`)
      .join("|");

    if (waypoints) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
  }, [routeStops, ngoLocation]);

  return (
    <div className="space-y-2.5">
      {/* 📍 Fixed Registered NGO Base Station Header */}
      <div className="bg-white border border-wheat-200 rounded-xl p-3.5 sm:p-4 shadow-2xs text-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* NGO Base Headquarters Info */}
          <div className="flex items-start sm:items-center gap-2.5 text-forest-800">
            <div className="p-2 rounded-xl bg-forest-900 text-gold-400 shrink-0 shadow-2xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-semibold text-sm sm:text-base text-forest-900">
                  {ngoOrgName}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                  🏛️ Registered NGO Base
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-wheat-100 text-forest-800/70 border border-wheat-200">
                  🔒 Fixed Location
                </span>
              </div>
              <p className="text-xs text-forest-800/70 mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-forest-800">Fixed Location:</span>
                <span className="font-medium text-forest-900 underline decoration-dotted">{ngoAddressLabel}</span>
                <span className="text-[11px] text-forest-800/50">
                  &bull; Calculating distances to {filteredListings.length} donor locations from your registered base
                </span>
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={handleCenterNgo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest-50 text-forest-800 hover:bg-forest-100 border border-forest-200 rounded-lg font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
              title="Center map on your fixed registered headquarters"
            >
              <LocateFixed className="w-3.5 h-3.5 text-forest-700" />
              <span>Center HQ</span>
            </button>

            <button
              onClick={handleFitAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-wheat-100 hover:bg-wheat-200 text-forest-800 rounded-lg font-semibold text-xs transition-colors border border-wheat-300/60 shadow-2xs cursor-pointer"
              title="Fit Registered Base + All Donor Pins in view"
            >
              <Maximize2 className="w-3.5 h-3.5 text-forest-600" />
              <span>Fit All ({filteredListings.length} Donors)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🗺️ Main Map Canvas */}
      <div className="relative w-full h-[540px] sm:h-[620px] rounded-2xl overflow-hidden border border-wheat-200 shadow-sm bg-wheat-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Top Left: Map Legend (NGO vs Donors) */}
        <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border border-wheat-200 p-2.5 rounded-xl shadow-sm text-xs font-mono space-y-1.5 pointer-events-auto">
          <div className="font-semibold text-forest-800 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5 border-b border-wheat-100 pb-1">
            <Layers className="w-3.5 h-3.5 text-forest-600" />
            <span>Redistribution Map</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-3 h-3 rounded-sm bg-forest-900 border border-emerald-500 flex items-center justify-center text-[7px] text-white">🏛️</span>
            <span className="font-semibold text-forest-900">Your NGO Station (1)</span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
            <span className="text-forest-800">Donor: Critical (&lt;24h)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span className="text-forest-800">Donor: Watch (&lt;72h)</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span className="text-forest-800">Donor: Fresh Stock</span>
          </div>
        </div>

        {/* Top Right: Tile Switcher */}
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
            <span>Rescue Route ({routeStops.length} stops &bull; {routeStats.totalDistKm} km from NGO)</span>
          </button>
        )}

        {/* Selected Donor Popover Card */}
        {activeListing && (
          <div className="absolute bottom-4 right-4 max-w-sm w-[90%] sm:w-80 md:w-88 z-[1000] bg-white border border-wheat-200 rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                      📍 {activeListing.distFormatted} from NGO Base
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-forest-800 font-semibold mb-0.5">
                  <Store className="w-3.5 h-3.5 text-forest-600" />
                  <span>Donor: {activeListing.donorName}</span>
                </div>

                <h4 className="font-display font-semibold text-forest-900 text-base">
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
              <span className="text-forest-900 font-bold text-sm">
                {activeListing.quantity} {activeListing.unit}
              </span>
              <span className="text-forest-800/70 capitalize">
                Category: {activeListing.category}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onClaimListing?.(activeListing);
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-700 text-white hover:bg-emerald-800 transition-all shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Claim Food</span>
              </button>

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

            <div className="mt-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${ngoLocation[0]},${ngoLocation[1]}&destination=${activeListing.coords[0]},${activeListing.coords[1]}`}
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-wheat-100 hover:bg-wheat-200 text-forest-800 transition-all border border-wheat-300/60"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Directions from NGO Base (Google Maps)</span>
              </a>
            </div>
          </div>
        )}

        {/* Route Drawer Overlay */}
        {showRouteDrawer && (
          <div className="absolute inset-y-0 right-0 w-full sm:w-80 md:w-88 z-[1001] bg-white border-l border-wheat-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-wheat-200 flex items-center justify-between bg-forest-900 text-wheat-50">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-gold-400" />
                <div>
                  <h3 className="font-semibold text-sm">Rescue Dispatch Route</h3>
                  <p className="text-[11px] text-wheat-200/70">From: {ngoOrgName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowRouteDrawer(false)}
                className="p-1 text-wheat-200 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Route Stats */}
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

            {/* Route Stops Sequence */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-forest-800 bg-forest-50 p-2.5 rounded-xl border border-forest-100">
                <span className="w-6 h-6 rounded-full bg-forest-900 text-gold-400 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">0</span>
                <div>
                  <span className="block font-bold">🏛️ {ngoOrgName} (Start HQ)</span>
                  <span className="text-[11px] text-forest-800/60 font-normal">{ngoAddressLabel}</span>
                </div>
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
                      <div>
                        <span className="font-semibold text-xs text-forest-800 block">🏪 {stop.donorName}</span>
                        <span className="text-[11px] text-forest-800/70 font-medium">{stop.title} ({stop.quantity} {stop.unit})</span>
                      </div>
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
                <span>Launch GPS Route from NGO HQ</span>
              </a>
              <button
                onClick={() => setRouteStops([])}
                className="w-full text-center text-xs text-forest-800/50 hover:text-forest-800 py-1"
              >
                Clear Route
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
