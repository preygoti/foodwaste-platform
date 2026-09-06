import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
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
} from "lucide-react";

// Default base coordinates (e.g. Metro Food Hub)
const DEFAULT_CENTER = [19.0760, 72.8777]; // Mumbai Metro coordinates (or fallback hub)

// Helper to generate consistent deterministic coordinates around a hub based on listing ID/name
function getListingCoordinates(item, index) {
  // If location has known city/suburb, or deterministic pseudo-offsets
  const baseLat = DEFAULT_CENTER[0];
  const baseLng = DEFAULT_CENTER[1];

  const seed = (item.id * 17 + index * 23 + (item.title ? item.title.length : 5)) % 1000;
  const angle = (seed / 1000) * 2 * Math.PI;
  const radiusKm = 1.5 + ((seed % 70) / 10); // 1.5km to 8.5km radius
  
  const dLat = (radiusKm / 110.574) * Math.sin(angle);
  const dLng = (radiusKm / (111.320 * Math.cos((baseLat * Math.PI) / 180))) * Math.cos(angle);

  return [baseLat + dLat, baseLng + dLng];
}

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
  const markersGroupRef = useRef(null);
  const routePolylineRef = useRef(null);

  const [activeListing, setActiveListing] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [showRouteDrawer, setShowRouteDrawer] = useState(false);
  const [userLocation, setUserLocation] = useState(DEFAULT_CENTER);

  // Map listings with coordinates
  const mappedListings = useMemo(() => {
    return listings.map((l, idx) => ({
      ...l,
      coords: getListingCoordinates(l, idx),
      urgency: getUrgencyLevel(l.expiry_date),
    }));
  }, [listings]);

  // Filter listings within radius
  const filteredListings = useMemo(() => {
    return mappedListings.filter((l) => {
      if (selectedRadius >= 50) return true;
      const dLat = (l.coords[0] - userLocation[0]) * 110.574;
      const dLng = (l.coords[1] - userLocation[1]) * 111.320;
      const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
      return distKm <= selectedRadius;
    });
  }, [mappedListings, userLocation, selectedRadius]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    // Clean OpenStreetMap CartoDB Positron / OSM Tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    markersGroupRef.current = markersGroup;

    // Add NGO Base Marker
    const ngoIcon = L.divIcon({
      className: "custom-ngo-pin",
      html: `
        <div style="background-color: #1a3325; color: white; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2px solid #ffffff;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 34],
    });
    L.marker(DEFAULT_CENTER, { icon: ngoIcon })
      .addTo(map)
      .bindTooltip("<strong>Your Relief Hub Base</strong>", { permanent: false, direction: "top" });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when filteredListings change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    filteredListings.forEach((item) => {
      const isCritical = item.urgency === "critical";
      const isWarning = item.urgency === "warning";

      const bgColor = isCritical ? "#dc2626" : isWarning ? "#d97706" : "#16a34a";
      const pulseClass = isCritical ? "animation: pulse 1.5s infinite;" : "";

      const iconHtml = `
        <div style="position: relative; width: 32px; height: 32px; cursor: pointer;">
          ${
            isCritical
              ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: rgba(220, 38, 38, 0.4); ${pulseClass}"></div>`
              : ""
          }
          <div style="position: relative; background: ${bgColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.25); border: 2px solid #ffffff; font-weight: bold; font-size: 11px;">
            ${item.quantity > 99 ? "99+" : Math.round(item.quantity)}
          </div>
        </div>
      `;

      const markerIcon = L.divIcon({
        className: `rescue-pin-${item.id}`,
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(item.coords, { icon: markerIcon }).addTo(markersGroup);

      marker.on("click", () => {
        setActiveListing(item);
      });
    });
  }, [filteredListings]);

  // Handle Multi-Stop Route Rendering
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

      const routePoints = [DEFAULT_CENTER, ...sortedStops.map((s) => s.coords)];

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
  }, [routeStops]);

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
    let curr = DEFAULT_CENTER;
    let totalQty = 0;

    routeStops.forEach((s) => {
      const dLat = (s.coords[0] - curr[0]) * 110.574;
      const dLng = (s.coords[1] - curr[1]) * 111.320;
      totalDist += Math.sqrt(dLat * dLat + dLng * dLng);
      curr = s.coords;
      totalQty += Number(s.quantity) || 0;
    });

    const estMins = Math.round(totalDist * 2.8 + routeStops.length * 12); // ~25 km/h urban speed + 12 mins per pickup stop

    return {
      totalDistKm: Math.round(totalDist * 10) / 10,
      totalQty: Math.round(totalQty * 10) / 10,
      totalMeals: Math.round(totalQty * 2.5),
      estMins,
    };
  }, [routeStops]);

  return (
    <div className="relative w-full h-[580px] sm:h-[640px] rounded-2xl overflow-hidden border border-wheat-200 shadow-sm bg-wheat-100">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Map Legend & Layer Overlay */}
      <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm border border-wheat-200 p-2.5 sm:p-3 rounded-xl shadow-sm text-xs font-mono space-y-1.5 pointer-events-auto">
        <div className="font-semibold text-forest-800 text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-forest-600" />
          <span>Surplus Radar ({filteredListings.length} Active)</span>
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

      {/* Selected Marker Detail Card Popover */}
      {activeListing && (
        <div className="absolute bottom-4 right-4 max-w-sm w-full z-[1000] bg-white border border-wheat-200 rounded-2xl p-4 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full mb-1 ${
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
                <span className="font-semibold text-forest-800 block">Relief Distribution Base (Start)</span>
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
            <button
              onClick={() => {
                alert(`🚗 Starting GPS Multi-Stop Navigation for ${routeStops.length} stops (~${routeStats.totalDistKm} km). Driving itinerary dispatched to drivers!`);
              }}
              className="w-full inline-flex items-center justify-center gap-2 bg-forest-800 text-wheat-50 py-3 rounded-xl text-xs font-semibold hover:bg-forest-700 shadow-sm transition-all"
            >
              <Navigation className="w-4 h-4 text-gold-400" />
              <span>Launch Driver Turn-by-Turn GPS</span>
            </button>
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
