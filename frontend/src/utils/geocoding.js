/**
 * Geocoding & Geographic Utilities for Harvest Ledger Live Radar Map
 * 
 * Provides:
 * 1. Comprehensive offline coordinates dictionary for Indian & Global cities/localities
 * 2. Real-time OpenStreetMap Nominatim Geocoder with localStorage caching
 * 3. Haversine distance calculation and formatting
 * 4. Deterministic local neighborhood pin dispersion for generic storefront addresses
 */

// Comprehensive dictionary of major Indian cities, regions, and international hubs
export const CITY_COORDINATES = {
  // --- GUJARAT ---
  "surat": [21.1702, 72.8311],
  "adajan": [21.1926, 72.7997],
  "vesu": [21.1418, 72.7709],
  "pal": [21.1805, 72.7758],
  "piplod": [21.1627, 72.7794],
  "athwa": [21.1678, 72.8054],
  "athwalines": [21.1678, 72.8054],
  "city light": [21.1610, 72.7880],
  "citylight": [21.1610, 72.7880],
  "varachha": [21.2185, 72.8540],
  "katargam": [21.2266, 72.8277],
  "rander": [21.2167, 72.7958],
  "majura": [21.1738, 72.8184],
  "majura gate": [21.1738, 72.8184],
  "dumas": [21.0844, 72.7126],
  "dumas road": [21.1294, 72.7533],
  "hazira": [21.1167, 72.6500],
  "ring road": [21.1912, 72.8423],
  "gopipura": [21.1930, 72.8236],
  "salabatpura": [21.1890, 72.8385],
  "nanpura": [21.1880, 72.8170],
  "begampura": [21.1970, 72.8350],
  "amroli": [21.2486, 72.8456],
  "udhna": [21.1558, 72.8436],
  "pandesara": [21.1287, 72.8242],
  "sachin": [21.0833, 72.8833],
  "kamrej": [21.2700, 72.9600],
  "olpad": [21.3300, 72.7500],
  "bardoli": [21.1200, 73.1100],

  "ahmedabad": [23.0225, 72.5714],
  "navrangpura": [23.0373, 72.5564],
  "vastrapur": [23.0350, 72.5293],
  "bodakdev": [23.0402, 72.5085],
  "satellite": [23.0300, 72.5176],
  "maninagar": [22.9978, 72.6033],
  "sg highway": [23.0645, 72.5074],
  "prahlad nagar": [23.0130, 72.5080],
  "thaltej": [23.0560, 72.5090],
  "bopal": [23.0340, 72.4640],
  "chandkheda": [23.1120, 72.5850],
  "gandhinagar": [23.2156, 72.6369],
  "vadodara": [22.3072, 73.1812],
  "baroda": [22.3072, 73.1812],
  "alkapuri": [22.3129, 73.1706],
  "gotri": [22.3160, 73.1480],
  "manjalpur": [22.2680, 73.1950],
  "rajkot": [22.3039, 70.8022],
  "kalawad road": [22.2850, 70.7650],
  "bhavnagar": [21.7645, 72.1519],
  "jamnagar": [22.4707, 70.0577],
  "anand": [22.5645, 72.9289],
  "vapi": [20.3712, 72.9048],
  "navsari": [20.9467, 72.9520],
  "valsad": [20.5992, 72.9342],
  "bharuch": [21.7051, 72.9959],
  "ankleshwar": [21.6264, 73.0039],
  "junagadh": [21.5222, 70.4579],
  "morbi": [22.8120, 70.8378],
  "mehsana": [23.5880, 72.3693],
  "porbandar": [21.6417, 69.6293],
  "bhuj": [23.2420, 69.6669],
  "gandhidham": [23.0753, 70.1337],

  // --- MAHARASHTRA & MUMBAI ---
  "mumbai": [19.0760, 72.8777],
  "bombay": [19.0760, 72.8777],
  "andheri": [19.1136, 72.8697],
  "bandra": [19.0596, 72.8295],
  "juhu": [19.1075, 72.8263],
  "dadar": [19.0178, 72.8478],
  "powai": [19.1176, 72.9060],
  "borivali": [19.2307, 72.8567],
  "bkc": [19.0657, 72.8687],
  "bandra kurla complex": [19.0657, 72.8687],
  "colaba": [18.9067, 72.8147],
  "lower parel": [18.9953, 72.8302],
  "goregaon": [19.1663, 72.8526],
  "malad": [19.1874, 72.8484],
  "kandivali": [19.2045, 72.8376],
  "chembur": [19.0522, 72.8994],
  "ghatkopar": [19.0860, 72.9090],
  "kurla": [19.0726, 72.8845],
  "thane": [19.2183, 72.9781],
  "navi mumbai": [19.0330, 73.0297],
  "vashi": [19.0771, 72.9986],
  "kalyan": [19.2437, 73.1355],
  "dombivli": [19.2184, 73.0867],
  "vasai": [19.3919, 72.8397],
  "virar": [19.4700, 72.8000],
  "pune": [18.5204, 73.8567],
  "kothrud": [18.5074, 73.8077],
  "hinjewadi": [18.5913, 73.7389],
  "viman nagar": [18.5679, 73.9143],
  "baner": [18.5590, 73.7868],
  "wakad": [18.5987, 73.7688],
  "hadapsar": [18.5089, 73.9259],
  "nashik": [19.9975, 73.7898],
  "nagpur": [21.1458, 79.0882],
  "aurangabad": [19.8762, 75.3433],
  "chhatrapati sambhajinagar": [19.8762, 75.3433],
  "solapur": [17.6599, 75.9064],
  "kolhapur": [16.7050, 74.2433],

  // --- DELHI NCR ---
  "delhi": [28.6139, 77.2090],
  "new delhi": [28.6139, 77.2090],
  "connaught place": [28.6315, 77.2167],
  "cp": [28.6315, 77.2167],
  "noida": [28.5355, 77.3910],
  "greater noida": [28.4744, 77.5040],
  "gurgaon": [28.4595, 77.0266],
  "gurugram": [28.4595, 77.0266],
  "cyber city": [28.4950, 77.0895],
  "ghaziabad": [28.6692, 77.4538],
  "faridabad": [28.4089, 77.3178],
  "karol bagh": [28.6514, 77.1907],
  "hauz khas": [28.5494, 77.2001],
  "saket": [28.5244, 77.2167],
  "dwarka": [28.5921, 77.0460],
  "rohini": [28.7495, 77.0565],
  "lajpat nagar": [28.5677, 77.2433],
  "nehru place": [28.5493, 77.2529],

  // --- KARNATAKA / BENGALURU ---
  "bengaluru": [12.9716, 77.5946],
  "bangalore": [12.9716, 77.5946],
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
  "mysore": [12.2958, 76.6394],
  "mysuru": [12.2958, 76.6394],
  "hubli": [15.3647, 75.1240],
  "mangalore": [12.9141, 74.8560],

  // --- TELANGANA & ANDHRA PRADESH ---
  "hyderabad": [17.3850, 78.4867],
  "secunderabad": [17.4399, 78.4983],
  "gachibowli": [17.4401, 78.3489],
  "hitec city": [17.4435, 78.3772],
  "jubilee hills": [17.4319, 78.4073],
  "banjara hills": [17.4156, 78.4350],
  "visakhapatnam": [17.6868, 83.2185],
  "vizag": [17.6868, 83.2185],
  "vijayawada": [16.5062, 80.6480],
  "guntur": [16.3067, 80.4365],
  "tirupati": [13.6288, 79.4192],

  // --- TAMIL NADU ---
  "chennai": [13.0827, 80.2707],
  "madras": [13.0827, 80.2707],
  "t nagar": [13.0418, 80.2341],
  "adyar": [13.0012, 80.2565],
  "anna nagar": [13.0850, 80.2100],
  "velachery": [12.9759, 80.2206],
  "coimbatore": [11.0168, 76.9558],
  "madurai": [9.9252, 78.1198],
  "tiruchirappalli": [10.7905, 78.7047],
  "trichy": [10.7905, 78.7047],
  "salem": [11.6643, 78.1460],

  // --- WEST BENGAL & EAST ---
  "kolkata": [22.5726, 88.3639],
  "calcutta": [22.5726, 88.3639],
  "salt lake": [22.5867, 88.4172],
  "new town": [22.5899, 88.4812],
  "howrah": [22.5958, 88.2636],
  "bhubaneswar": [20.2961, 85.8245],
  "cuttack": [20.4625, 85.8828],
  "patna": [25.5941, 85.1376],
  "ranchi": [23.3441, 85.3096],
  "jamshedpur": [22.8046, 86.2029],
  "guwahati": [26.1445, 91.7362],

  // --- NORTH & CENTRAL ---
  "jaipur": [26.9124, 75.7873],
  "jodhpur": [26.2389, 73.0243],
  "udaipur": [24.5854, 73.7125],
  "kota": [25.2138, 75.8648],
  "ajmer": [26.4499, 74.6399],
  "lucknow": [26.8467, 80.9462],
  "kanpur": [26.4499, 80.3319],
  "varanasi": [25.3176, 82.9739],
  "prayagraj": [25.4358, 81.8463],
  "allahabad": [25.4358, 81.8463],
  "agra": [27.1767, 78.0081],
  "meerut": [28.9845, 77.7064],
  "indore": [22.7196, 75.8577],
  "bhopal": [23.2599, 77.4126],
  "chandigarh": [30.7333, 76.7794],
  "ludhiana": [30.9010, 75.8573],
  "amritsar": [31.6340, 74.8723],
  "dehradun": [30.3165, 78.0322],
  "shimla": [31.1048, 77.1734],
  "srinagar": [34.0837, 74.7973],
  "jammu": [32.7266, 74.8570],
  "goa": [15.2993, 74.1240],
  "panaji": [15.4909, 73.8278],
  "kochi": [9.9312, 76.2673],
  "trivandrum": [8.5241, 76.9366],

  // --- POPULAR INTERNATIONAL HUBS ---
  "new york": [40.7128, -74.0060],
  "london": [51.5074, -0.1278],
  "dubai": [25.2048, 55.2708],
  "singapore": [1.3521, 103.8198],
  "toronto": [43.6532, -79.3832],
  "sydney": [-33.8688, 151.2093],
  "tokyo": [35.6762, 139.6503],
  "paris": [48.8566, 2.3522],
};

// Popular Fast-Switch Cities for Top Navigation Bar
export const POPULAR_MAP_CITIES = [
  { name: "Surat", coords: [21.1702, 72.8311], tag: "Gujarat" },
  { name: "Mumbai", coords: [19.0760, 72.8777], tag: "Maharashtra" },
  { name: "Delhi NCR", coords: [28.6139, 77.2090], tag: "Capital" },
  { name: "Ahmedabad", coords: [23.0225, 72.5714], tag: "Gujarat" },
  { name: "Bengaluru", coords: [12.9716, 77.5946], tag: "Karnataka" },
  { name: "Pune", coords: [18.5204, 73.8567], tag: "Maharashtra" },
  { name: "Hyderabad", coords: [17.3850, 78.4867], tag: "Telangana" },
  { name: "Chennai", coords: [13.0827, 80.2707], tag: "Tamil Nadu" },
  { name: "Kolkata", coords: [22.5726, 88.3639], tag: "West Bengal" },
  { name: "Jaipur", coords: [26.9124, 75.7873], tag: "Rajasthan" },
  { name: "Vadodara", coords: [22.3072, 73.1812], tag: "Gujarat" },
  { name: "Indore", coords: [22.7196, 75.8577], tag: "Madhya Pradesh" },
  { name: "Chandigarh", coords: [30.7333, 76.7794], tag: "Punjab" },
];

// Rich location suggestions with Country, Flag, and City
export const GLOBAL_LOCATION_SUGGESTIONS = [
  // Gujarat, India
  { label: "Surat, Gujarat", country: "India", flag: "🇮🇳", city: "Surat", state: "Gujarat", coords: [21.1702, 72.8311] },
  { label: "Adajan, Surat", country: "India", flag: "🇮🇳", city: "Surat", state: "Gujarat", coords: [21.1926, 72.7997] },
  { label: "Vesu, Surat", country: "India", flag: "🇮🇳", city: "Surat", state: "Gujarat", coords: [21.1418, 72.7709] },
  { label: "Pal, Surat", country: "India", flag: "🇮🇳", city: "Surat", state: "Gujarat", coords: [21.1805, 72.7758] },
  { label: "Piplod, Surat", country: "India", flag: "🇮🇳", city: "Surat", state: "Gujarat", coords: [21.1627, 72.7794] },
  { label: "Varachha, Surat", country: "India", flag: "🇮🇳", city: "Surat", state: "Gujarat", coords: [21.2185, 72.8540] },
  { label: "Katargam, Surat", country: "India", flag: "🇮🇳", city: "Surat", state: "Gujarat", coords: [21.2266, 72.8277] },
  { label: "Rander, Surat", country: "India", flag: "🇮🇳", city: "Surat", state: "Gujarat", coords: [21.2167, 72.7958] },
  { label: "Dumas Road, Surat", country: "India", flag: "🇮🇳", city: "Surat", state: "Gujarat", coords: [21.1294, 72.7533] },
  { label: "Ahmedabad, Gujarat", country: "India", flag: "🇮🇳", city: "Ahmedabad", state: "Gujarat", coords: [23.0225, 72.5714] },
  { label: "Navrangpura, Ahmedabad", country: "India", flag: "🇮🇳", city: "Ahmedabad", state: "Gujarat", coords: [23.0373, 72.5564] },
  { label: "SG Highway, Ahmedabad", country: "India", flag: "🇮🇳", city: "Ahmedabad", state: "Gujarat", coords: [23.0645, 72.5074] },
  { label: "Vadodara, Gujarat", country: "India", flag: "🇮🇳", city: "Vadodara", state: "Gujarat", coords: [22.3072, 73.1812] },
  { label: "Rajkot, Gujarat", country: "India", flag: "🇮🇳", city: "Rajkot", state: "Gujarat", coords: [22.3039, 70.8022] },
  { label: "Gandhinagar, Gujarat", country: "India", flag: "🇮🇳", city: "Gandhinagar", state: "Gujarat", coords: [23.2156, 72.6369] },
  { label: "Bhavnagar, Gujarat", country: "India", flag: "🇮🇳", city: "Bhavnagar", state: "Gujarat", coords: [21.7645, 72.1519] },
  { label: "Vapi, Gujarat", country: "India", flag: "🇮🇳", city: "Vapi", state: "Gujarat", coords: [20.3712, 72.9048] },
  { label: "Navsari, Gujarat", country: "India", flag: "🇮🇳", city: "Navsari", state: "Gujarat", coords: [20.9467, 72.9520] },
  { label: "Valsad, Gujarat", country: "India", flag: "🇮🇳", city: "Valsad", state: "Gujarat", coords: [20.5992, 72.9342] },
  { label: "Bharuch, Gujarat", country: "India", flag: "🇮🇳", city: "Bharuch", state: "Gujarat", coords: [21.7051, 72.9959] },

  // Maharashtra, India
  { label: "Mumbai, Maharashtra", country: "India", flag: "🇮🇳", city: "Mumbai", state: "Maharashtra", coords: [19.0760, 72.8777] },
  { label: "Andheri, Mumbai", country: "India", flag: "🇮🇳", city: "Mumbai", state: "Maharashtra", coords: [19.1136, 72.8697] },
  { label: "Bandra, Mumbai", country: "India", flag: "🇮🇳", city: "Mumbai", state: "Maharashtra", coords: [19.0596, 72.8295] },
  { label: "BKC, Mumbai", country: "India", flag: "🇮🇳", city: "Mumbai", state: "Maharashtra", coords: [19.0657, 72.8687] },
  { label: "Pune, Maharashtra", country: "India", flag: "🇮🇳", city: "Pune", state: "Maharashtra", coords: [18.5204, 73.8567] },
  { label: "Hinjewadi, Pune", country: "India", flag: "🇮🇳", city: "Pune", state: "Maharashtra", coords: [18.5913, 73.7389] },
  { label: "Nagpur, Maharashtra", country: "India", flag: "🇮🇳", city: "Nagpur", state: "Maharashtra", coords: [21.1458, 79.0882] },
  { label: "Nashik, Maharashtra", country: "India", flag: "🇮🇳", city: "Nashik", state: "Maharashtra", coords: [19.9975, 73.7898] },
  { label: "Thane, Maharashtra", country: "India", flag: "🇮🇳", city: "Thane", state: "Maharashtra", coords: [19.2183, 72.9781] },
  { label: "Navi Mumbai, Maharashtra", country: "India", flag: "🇮🇳", city: "Navi Mumbai", state: "Maharashtra", coords: [19.0330, 73.0297] },

  // Delhi NCR, India
  { label: "Delhi NCR", country: "India", flag: "🇮🇳", city: "Delhi", state: "Delhi", coords: [28.6139, 77.2090] },
  { label: "Connaught Place, New Delhi", country: "India", flag: "🇮🇳", city: "New Delhi", state: "Delhi", coords: [28.6315, 77.2167] },
  { label: "Noida, Uttar Pradesh", country: "India", flag: "🇮🇳", city: "Noida", state: "Uttar Pradesh", coords: [28.5355, 77.3910] },
  { label: "Gurugram / Gurgaon, Haryana", country: "India", flag: "🇮🇳", city: "Gurgaon", state: "Haryana", coords: [28.4595, 77.0266] },

  // Karnataka, India
  { label: "Bengaluru / Bangalore", country: "India", flag: "🇮🇳", city: "Bengaluru", state: "Karnataka", coords: [12.9716, 77.5946] },
  { label: "Koramangala, Bengaluru", country: "India", flag: "🇮🇳", city: "Bengaluru", state: "Karnataka", coords: [12.9352, 77.6245] },
  { label: "Indiranagar, Bengaluru", country: "India", flag: "🇮🇳", city: "Bengaluru", state: "Karnataka", coords: [12.9784, 77.6408] },
  { label: "Whitefield, Bengaluru", country: "India", flag: "🇮🇳", city: "Bengaluru", state: "Karnataka", coords: [12.9698, 77.7500] },

  // Other Top Metros
  { label: "Hyderabad, Telangana", country: "India", flag: "🇮🇳", city: "Hyderabad", state: "Telangana", coords: [17.3850, 78.4867] },
  { label: "Chennai, Tamil Nadu", country: "India", flag: "🇮🇳", city: "Chennai", state: "Tamil Nadu", coords: [13.0827, 80.2707] },
  { label: "Kolkata, West Bengal", country: "India", flag: "🇮🇳", city: "Kolkata", state: "West Bengal", coords: [22.5726, 88.3639] },
  { label: "Jaipur, Rajasthan", country: "India", flag: "🇮🇳", city: "Jaipur", state: "Rajasthan", coords: [26.9124, 75.7873] },
  { label: "Lucknow, Uttar Pradesh", country: "India", flag: "🇮🇳", city: "Lucknow", state: "Uttar Pradesh", coords: [26.8467, 80.9462] },
  { label: "Indore, Madhya Pradesh", country: "India", flag: "🇮🇳", city: "Indore", state: "Madhya Pradesh", coords: [22.7196, 75.8577] },
  { label: "Chandigarh", country: "India", flag: "🇮🇳", city: "Chandigarh", state: "Punjab", coords: [30.7333, 76.7794] },
  { label: "Kochi, Kerala", country: "India", flag: "🇮🇳", city: "Kochi", state: "Kerala", coords: [9.9312, 76.2673] },

  // International
  { label: "Dubai", country: "United Arab Emirates", flag: "🇦🇪", city: "Dubai", state: "Dubai", coords: [25.2048, 55.2708] },
  { label: "London", country: "United Kingdom", flag: "🇬🇧", city: "London", state: "Greater London", coords: [51.5074, -0.1278] },
  { label: "New York", country: "United States", flag: "🇺🇸", city: "New York", state: "NY", coords: [40.7128, -74.0060] },
  { label: "Singapore", country: "Singapore", flag: "🇸🇬", city: "Singapore", state: "Singapore", coords: [1.3521, 103.8198] },
  { label: "Toronto", country: "Canada", flag: "🇨🇦", city: "Toronto", state: "Ontario", coords: [43.6532, -79.3832] },
  { label: "Sydney", country: "Australia", flag: "🇦🇺", city: "Sydney", state: "NSW", coords: [-33.8688, 151.2093] },
];

// Kitchen Storage Area Presets
export const KITCHEN_STORAGE_PRESETS = [
  { label: "Walk-in Refrigerator", icon: "🧊", desc: "Cold Chilled Storage (2°C - 4°C)" },
  { label: "Deep Freezer", icon: "❄️", desc: "Sub-Zero Frozen Storage (-18°C)" },
  { label: "Dry Pantry & Bakery Shelf", icon: "🥖", desc: "Dry Ambient Room Temperature" },
  { label: "Storefront Counter / Display Rack", icon: "🏬", desc: "Front Area (Ready for Pickup)" },
  { label: "Main Kitchen Prep Station", icon: "🍳", desc: "Active Food Station" },
];

// Default fallback coordinate (Surat/Mumbai Western Hub)
export const DEFAULT_FALLBACK_COORDINATES = [21.1702, 72.8311]; // Surat / West Hub

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
  // Radius between 0.4 km and 3.5 km in local neighborhood
  const radiusKm = 0.4 + ((seed % 30) / 10);

  const dLat = (radiusKm / 110.574) * Math.sin(angle);
  const dLng = (radiusKm / (111.320 * Math.cos((baseLat * Math.PI) / 180))) * Math.cos(angle);

  return [baseLat + dLat, baseLng + dLng];
}

/**
 * Synchronous resolver for initial render coordinates:
 * 1. Checks item.latitude/longitude
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
