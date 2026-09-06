/**
 * Geocoding & Geographic Utilities for Harvest Ledger Live Radar Map
 * 
 * Provides:
 * 1. Extensive offline coordinates dictionary for Indian & Global cities/localities
 * 2. Real-time OpenStreetMap Nominatim Geocoder with localStorage caching
 * 3. Haversine distance calculation and formatting
 * 4. Deterministic local neighborhood pin dispersion for generic storefront addresses
 */

// Comprehensive dictionary of major Indian cities, regions, and international hubs
export const CITY_COORDINATES = {
  // Top Indian Metro & Tier-1 Cities
  "mumbai": [19.0760, 72.8777],
  "bombay": [19.0760, 72.8777],
  "delhi": [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090],
  "noida": [28.5355, 77.3910],
  "greater noida": [28.4744, 77.5040],
  "gurgaon": [28.4595, 77.0266],
  "gurugram": [28.4595, 77.0266],
  "ghaziabad": [28.6692, 77.4538],
  "faridabad": [28.4089, 77.3178],
  "bengaluru": [12.9716, 77.5946],
  "bangalore": [12.9716, 77.5946],
  "hyderabad": [17.3850, 78.4867],
  "secunderabad": [17.4399, 78.4983],
  "ahmedabad": [23.0225, 72.5714],
  "surat": [21.1702, 72.8311],
  "chennai": [13.0827, 80.2707],
  "madras": [13.0827, 80.2707],
  "kolkata": [22.5726, 88.3639],
  "calcutta": [22.5726, 88.3639],
  "pune": [18.5204, 73.8567],
  "jaipur": [26.9124, 75.7873],
  "lucknow": [26.8467, 80.9462],
  "kanpur": [26.4499, 80.3319],
  "nagpur": [21.1458, 79.0882],
  "indore": [22.7196, 75.8577],
  "bhopal": [23.2599, 77.4126],
  "patna": [25.5941, 85.1376],
  "vadodara": [22.3072, 73.1812],
  "baroda": [22.3072, 73.1812],
  "rajkot": [22.3039, 70.8022],
  "bhavnagar": [21.7645, 72.1519],
  "jamnagar": [22.4707, 70.0577],
  "gandhinagar": [23.2156, 72.6369],
  "anand": [22.5645, 72.9289],
  "vapi": [20.3712, 72.9048],
  "navsari": [20.9467, 72.9520],
  "valsad": [20.5992, 72.9342],
  "bharuch": [21.7051, 72.9959],
  "junagadh": [21.5222, 70.4579],
  "morbi": [22.8120, 70.8378],
  "ludhiana": [30.9010, 75.8573],
  "amritsar": [31.6340, 74.8723],
  "jalandhar": [31.3260, 75.5762],
  "chandigarh": [30.7333, 76.7794],
  "mohali": [30.7046, 76.7179],
  "panchkula": [30.6942, 76.8606],
  "nashik": [19.9975, 73.7898],
  "thane": [19.2183, 72.9781],
  "navi mumbai": [19.0330, 73.0297],
  "kalyan": [19.2437, 73.1355],
  "dombivli": [19.2184, 73.0867],
  "vasai": [19.3919, 72.8397],
  "virar": [19.4700, 72.8000],
  "aurangabad": [19.8762, 75.3433],
  "chhatrapati sambhajinagar": [19.8762, 75.3433],
  "solapur": [17.6599, 75.9064],
  "kolhapur": [16.7050, 74.2433],
  "varanasi": [25.3176, 82.9739],
  "prayagraj": [25.4358, 81.8463],
  "allahabad": [25.4358, 81.8463],
  "agra": [27.1767, 78.0081],
  "meerut": [28.9845, 77.7064],
  "bareilly": [28.3670, 79.4304],
  "aligarh": [27.8974, 78.0880],
  "moradabad": [28.8389, 78.7768],
  "gorakhpur": [26.7606, 83.3732],
  "srinagar": [34.0837, 74.7973],
  "jammu": [32.7266, 74.8570],
  "dehradun": [30.3165, 78.0322],
  "haridwar": [29.9457, 78.1642],
  "rishikesh": [30.0869, 78.2676],
  "shimla": [31.1048, 77.1734],
  "ranchi": [23.3441, 85.3096],
  "jamshedpur": [22.8046, 86.2029],
  "dhanbad": [23.7957, 86.4304],
  "raipur": [21.2514, 81.6296],
  "bhilai": [21.2123, 81.3733],
  "bilaspur": [22.0797, 82.1409],
  "bhubaneswar": [20.2961, 85.8245],
  "cuttack": [20.4625, 85.8828],
  "rourkela": [22.2604, 84.8536],
  "visakhapatnam": [17.6868, 83.2185],
  "vizag": [17.6868, 83.2185],
  "vijayawada": [16.5062, 80.6480],
  "guntur": [16.3067, 80.4365],
  "tirupati": [13.6288, 79.4192],
  "kochi": [9.9312, 76.2673],
  "cochin": [9.9312, 76.2673],
  "thiruvananthapuram": [8.5241, 76.9366],
  "trivandrum": [8.5241, 76.9366],
  "kozhikode": [11.2588, 75.7804],
  "calicut": [11.2588, 75.7804],
  "coimbatore": [11.0168, 76.9558],
  "madurai": [9.9252, 78.1198],
  "tiruchirappalli": [10.7905, 78.7047],
  "trichy": [10.7905, 78.7047],
  "salem": [11.6643, 78.1460],
  "tirunelveli": [8.7139, 77.7567],
  "guwahati": [26.1445, 91.7362],
  "mysore": [12.2958, 76.6394],
  "mysuru": [12.2958, 76.6394],
  "hubli": [15.3647, 75.1240],
  "hubballi": [15.3647, 75.1240],
  "mangalore": [12.9141, 74.8560],
  "mangaluru": [12.9141, 74.8560],
  "belgaum": [15.8497, 74.4977],
  "belagavi": [15.8497, 74.4977],
  "jodhpur": [26.2389, 73.0243],
  "udaipur": [24.5854, 73.7125],
  "kota": [25.2138, 75.8648],
  "bikaner": [28.0229, 73.3119],
  "ajmer": [26.4499, 74.6399],
  "goa": [15.2993, 74.1240],
  "panaji": [15.4909, 73.8278],
  "margao": [15.2832, 73.9862],

  // Popular Localities in Major Cities
  // Mumbai
  "andheri": [19.1136, 72.8697],
  "bandra": [19.0596, 72.8295],
  "juhu": [19.1075, 72.8263],
  "dadar": [19.0178, 72.8478],
  "powai": [19.1176, 72.9060],
  "borivali": [19.2307, 72.8567],
  "bkc": [19.0657, 72.8687],
  "colaba": [18.9067, 72.8147],
  "lower parel": [18.9953, 72.8302],
  "goregaon": [19.1663, 72.8526],
  "malad": [19.1874, 72.8484],
  "kandivali": [19.2045, 72.8376],
  "chembur": [19.0522, 72.8994],
  "ghatkopar": [19.0860, 72.9090],

  // Delhi NCR
  "connaught place": [28.6315, 77.2167],
  "cp": [28.6315, 77.2167],
  "karol bagh": [28.6514, 77.1907],
  "hauz khas": [28.5494, 77.2001],
  "saket": [28.5244, 77.2167],
  "chandni chowk": [28.6506, 77.2303],
  "dwarka": [28.5921, 77.0460],
  "rohini": [28.7495, 77.0565],
  "lajpat nagar": [28.5677, 77.2433],
  "nehru place": [28.5493, 77.2529],
  "cyber city": [28.4950, 77.0895],
  "sector 18 noida": [28.5708, 77.3260],
  "sector 62 noida": [28.6279, 77.3649],

  // Bengaluru
  "koramangala": [12.9352, 77.6245],
  "indiranagar": [12.9784, 77.6408],
  "whitefield": [12.9698, 77.7500],
  "hsr layout": [12.9121, 77.6446],
  "jayanagar": [12.9308, 77.5838],
  "jp nagar": [12.9063, 77.5857],
  "electronic city": [12.8399, 77.6770],
  "mg road": [12.9756, 77.6066],
  "marathahalli": [12.9591, 77.6974],
  "bellandur": [12.9304, 77.6784],

  // Surat
  "adajan": [21.1926, 72.7997],
  "vesu": [21.1418, 72.7709],
  "pal": [21.1805, 72.7758],
  "piplod": [21.1627, 72.7794],
  "varachha": [21.2185, 72.8540],
  "katargam": [21.2266, 72.8277],
  "rander": [21.2167, 72.7958],
  "majura": [21.1738, 72.8184],
  "dumas": [21.0844, 72.7126],

  // Ahmedabad
  "navrangpura": [23.0373, 72.5564],
  "vastrapur": [23.0350, 72.5293],
  "bodakdev": [23.0402, 72.5085],
  "satellite": [23.0300, 72.5176],
  "maninagar": [22.9978, 72.6033],
  "sg highway": [23.0645, 72.5074],
  "prahlad nagar": [23.0130, 72.5080],

  // International Hubs
  "new york": [40.7128, -74.0060],
  "london": [51.5074, -0.1278],
  "dubai": [25.2048, 55.2708],
  "singapore": [1.3521, 103.8198],
  "toronto": [43.6532, -79.3832],
  "sydney": [-33.8688, 151.2093],
  "tokyo": [35.6762, 139.6503],
  "paris": [48.8566, 2.3522],
};

// Default fallback coordinate (Central Urban Hub)
export const DEFAULT_FALLBACK_COORDINATES = [19.0760, 72.8777]; // Mumbai Metro Hub

// In-memory geocode cache to prevent duplicate lookups
const memoryGeocodeCache = new Map();

/**
 * Normalizes an address string for lookup matching
 */
export function normalizeLocationString(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .replace(/[,\-_/\\#.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Searches the offline dictionary for city or locality names within the address string
 */
export function matchOfflineCityCoordinates(locationStr) {
  const norm = normalizeLocationString(locationStr);
  if (!norm) return null;

  // 1. Direct key match
  if (CITY_COORDINATES[norm]) {
    return CITY_COORDINATES[norm];
  }

  // 2. Tokenized word boundary search (prioritize longer matching tokens first)
  const sortedKeys = Object.keys(CITY_COORDINATES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const regex = new RegExp(`\\b${key}\\b`, "i");
    if (regex.test(norm)) {
      return CITY_COORDINATES[key];
    }
  }

  return null;
}

/**
 * Asynchronously geocodes an address using OpenStreetMap Nominatim API with cache
 * Completely free, no API keys required!
 */
export async function geocodeWithNominatim(locationStr) {
  const norm = normalizeLocationString(locationStr);
  if (!norm || norm.length < 3) return null;

  // 1. Check in-memory cache
  if (memoryGeocodeCache.has(norm)) {
    return memoryGeocodeCache.get(norm);
  }

  // 2. Check LocalStorage cache
  try {
    const cached = localStorage.getItem(`hl_geo_${norm}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length === 2) {
        memoryGeocodeCache.set(norm, parsed);
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }

  // 3. Try offline dictionary first (instant 0ms response)
  const offlineMatch = matchOfflineCityCoordinates(locationStr);
  if (offlineMatch) {
    memoryGeocodeCache.set(norm, offlineMatch);
    return offlineMatch;
  }

  // 4. Fetch from OpenStreetMap Nominatim with strict 2.5s timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(locationStr)}`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        memoryGeocodeCache.set(norm, coords);
        try {
          localStorage.setItem(`hl_geo_${norm}`, JSON.stringify(coords));
        } catch {}
        return coords;
      }
    }
  } catch {
    // Fall back smoothly on network / timeout
  }

  return null;
}

/**
 * Generates a realistic, deterministic neighborhood coordinate offset around a base center
 * Ensures items at the same storefront / generic address are distinct and visible on radar
 */
export function generateLocalDispersedCoordinates(baseCoords, item, index = 0) {
  const baseLat = baseCoords[0];
  const baseLng = baseCoords[1];

  const seed = (Number(item?.id || index + 1) * 31 + (item?.title?.length || 5) * 17 + index * 11) % 1000;
  const angle = (seed / 1000) * 2 * Math.PI;
  // Radius between 0.6 km and 4.2 km in local neighborhood
  const radiusKm = 0.6 + ((seed % 36) / 10);

  const dLat = (radiusKm / 110.574) * Math.sin(angle);
  const dLng = (radiusKm / (111.320 * Math.cos((baseLat * Math.PI) / 180))) * Math.cos(angle);

  return [baseLat + dLat, baseLng + dLng];
}

/**
 * Synchronous resolver for initial render coordinates:
 * 1. Checks item.lat/lng
 * 2. Checks offline dictionary for pickup_location
 * 3. Checks memory cache
 * 4. Disperses around user/hub coordinates if address is generic
 */
export function resolveInitialListingCoordinates(item, userCoords = DEFAULT_FALLBACK_COORDINATES, index = 0) {
  if (item?.latitude && item?.longitude) {
    return [parseFloat(item.latitude), parseFloat(item.longitude)];
  }

  const locStr = item?.pickup_location || item?.address || "";
  const offlineMatch = matchOfflineCityCoordinates(locStr);
  if (offlineMatch) {
    return generateLocalDispersedCoordinates(offlineMatch, item, index);
  }

  const norm = normalizeLocationString(locStr);
  if (norm && memoryGeocodeCache.has(norm)) {
    return generateLocalDispersedCoordinates(memoryGeocodeCache.get(norm), item, index);
  }

  return generateLocalDispersedCoordinates(userCoords, item, index);
}

/**
 * Calculates accurate Haversine distance in kilometers between two GPS points
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance into human friendly string (e.g. "850 m away" or "3.4 km away")
 */
export function formatDistance(distanceKm) {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) return "";
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m away`;
  }
  return `${(Math.round(distanceKm * 10) / 10).toFixed(1)} km away`;
}
