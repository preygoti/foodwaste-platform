import { useState, useRef, useEffect } from "react";
import { MapPin, Building2, ChevronDown, Check, Sparkles, X } from "lucide-react";
import { GLOBAL_LOCATION_SUGGESTIONS, KITCHEN_STORAGE_PRESETS } from "../utils/geocoding";

export default function LocationAutocompleteInput({
  value = "",
  onChange,
  placeholder = "e.g. Adajan, Surat or Walk-in Refrigerator",
  label = "Storage / Location",
  required = false,
  showStoragePresets = true,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (itemText) => {
    setQuery(itemText);
    onChange(itemText);
    setIsOpen(false);
  };

  // Filter city & country suggestions based on user typing
  const filteredCities = query
    ? GLOBAL_LOCATION_SUGGESTIONS.filter((c) => {
        const q = query.toLowerCase();
        return (
          c.label.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.country.toLowerCase().includes(q) ||
          (c.state && c.state.toLowerCase().includes(q))
        );
      }).slice(0, 8)
    : GLOBAL_LOCATION_SUGGESTIONS.slice(0, 6);

  // Filter storage presets
  const filteredStorage = showStoragePresets
    ? query
      ? KITCHEN_STORAGE_PRESETS.filter((s) =>
          s.label.toLowerCase().includes(query.toLowerCase()) ||
          s.desc.toLowerCase().includes(query.toLowerCase())
        )
      : KITCHEN_STORAGE_PRESETS
    : [];

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1 flex items-center justify-between">
          <span>{label} {required && "*"}</span>
          <span className="text-[10px] text-forest-800/40 font-normal font-mono">City / Country / Storage</span>
        </label>
      )}

      <div className="relative">
        <input
          type="text"
          required={required}
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full border border-wheat-200 rounded-lg pl-8 pr-7 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
        />

        <MapPin className="w-3.5 h-3.5 text-forest-800/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />

        {query ? (
          <button
            type="button"
            onClick={() => handleSelect("")}
            className="p-1 text-forest-800/40 hover:text-forest-800 absolute right-2 top-1/2 -translate-y-1/2 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-forest-800/30 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
      </div>

      {/* Autocomplete Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-wheat-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-wheat-100 animate-in fade-in zoom-in-95 duration-150">
          {/* Storage Area Presets */}
          {filteredStorage.length > 0 && (
            <div className="p-1.5">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-forest-800/50 font-semibold flex items-center gap-1">
                <span>🧊 Storage Facilities</span>
              </div>
              {filteredStorage.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleSelect(preset.label)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-wheat-50 transition-colors ${
                    query === preset.label ? "bg-forest-50 text-forest-900 font-semibold" : "text-forest-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{preset.icon}</span>
                    <div>
                      <span className="block font-medium">{preset.label}</span>
                      <span className="text-[10px] text-forest-800/50 block">{preset.desc}</span>
                    </div>
                  </div>
                  {query === preset.label && <Check className="w-3.5 h-3.5 text-forest-700 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Cities & Localities with Country */}
          {filteredCities.length > 0 && (
            <div className="p-1.5">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-forest-800/50 font-semibold flex items-center gap-1">
                <span>📍 Cities & Localities (By Country)</span>
              </div>
              {filteredCities.map((loc) => (
                <button
                  key={loc.label}
                  type="button"
                  onClick={() => handleSelect(`${loc.label}, ${loc.country}`)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-wheat-50 transition-colors ${
                    query.includes(loc.label) ? "bg-forest-50 text-forest-900 font-semibold" : "text-forest-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{loc.flag}</span>
                    <div>
                      <span className="block font-medium">{loc.label}</span>
                      <span className="text-[10px] text-forest-800/50 block">
                        {loc.state ? `${loc.state}, ` : ""}{loc.country}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-forest-800/40 bg-wheat-100/70 px-1.5 py-0.5 rounded">
                    {loc.country}
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredCities.length === 0 && filteredStorage.length === 0 && (
            <div className="p-3 text-center text-xs text-forest-800/60">
              <span>No exact preset match for &quot;{query}&quot;. You can use this as custom text.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
