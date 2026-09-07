import { useState, useRef, useEffect } from "react";
import { MapPin, Building2, ChevronDown, Check, X } from "lucide-react";
import { GLOBAL_LOCATION_SUGGESTIONS } from "../utils/geocoding";

export default function LocationAutocompleteInput({
  value = "",
  onChange,
  placeholder = "e.g. Surat, Gujarat",
  label = "Storage Location",
  required = false,
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
  const filteredLocations = query
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-xs uppercase tracking-wide text-forest-800/70 font-semibold mb-1">
          {label} {required && <span className="text-rose-600">*</span>}
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
          className="w-full border border-wheat-200 rounded-lg pl-8 pr-7 py-2 h-10 text-xs sm:text-sm text-forest-900 placeholder:text-forest-800/40 focus:outline-none focus:ring-2 focus:ring-forest-400 bg-white"
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

      {/* Autocomplete Dropdown Menu for Real Cities & Countries */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-wheat-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-wheat-100 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-1.5">
            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-forest-800/60 font-semibold flex items-center gap-1">
              <Building2 className="w-3 h-3 text-forest-600" />
              <span>Select City / Area for Radar Map</span>
            </div>

            {filteredLocations.map((loc) => {
              const fullAddressString = `${loc.label}, ${loc.country}`;
              const isSelected =
                query.toLowerCase() === fullAddressString.toLowerCase() ||
                query.toLowerCase() === loc.label.toLowerCase();

              return (
                <button
                  key={loc.label}
                  type="button"
                  onClick={() => handleSelect(fullAddressString)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between hover:bg-wheat-50 transition-colors ${
                    isSelected ? "bg-forest-50 text-forest-900 font-semibold" : "text-forest-800"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base shrink-0">{loc.flag}</span>
                    <div>
                      <span className="block font-semibold text-forest-900 leading-snug">{loc.label}</span>
                      <span className="text-[10px] text-forest-800/55 block">
                        {loc.state ? `${loc.state}, ` : ""}{loc.country}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono text-forest-800/50 bg-wheat-100/70 px-1.5 py-0.5 rounded">
                      {loc.country}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredLocations.length === 0 && (
            <div className="p-2.5 text-center text-xs text-forest-800/70">
              <p className="font-medium text-[11px]">Using custom location: &ldquo;{query}&rdquo;</p>
              <p className="text-[10px] text-forest-800/50 mt-0.5">
                Will be plotted automatically on the NGO Radar Map.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
