import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, Download, FileText, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import { api } from "../api";

const SAMPLE_CSV_CONTENT = `item_name,category,quantity,unit,expiry_date,avg_daily_usage,storage_location
Whole Milk,dairy,20,liter,2026-08-28,3,Refrigerator A
Sourdough Bread,bakery,15,loaves,2026-08-26,2,Bakery Rack 1
Fresh Spinach,produce,8.5,kg,2026-08-25,1.5,Cold Storage
Canned Chickpeas,canned,50,cans,2027-01-15,0.5,Pantry Bin 3
Greek Yogurt,dairy,12,tubs,2026-08-27,2,Refrigerator B
`;

const VALID_CATEGORIES = ["produce", "dairy", "bakery", "prepared", "canned", "frozen", "general"];

function cleanKey(str) {
  return String(str || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-.]+/g, "_");
}

function findValue(row, aliases) {
  const rowEntries = Object.entries(row);
  for (const alias of aliases) {
    const direct = row[alias];
    if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
      return String(direct).trim();
    }
    for (const [k, v] of rowEntries) {
      if (cleanKey(k) === alias && v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
  }
  for (const alias of aliases) {
    for (const [k, v] of rowEntries) {
      const ck = cleanKey(k);
      if (ck.includes(alias) && v !== undefined && v !== null && String(v).trim() !== "") {
        return String(v).trim();
      }
    }
  }
  return "";
}

function detectCategory(catStr, itemName) {
  const raw = String(catStr || itemName || "").toLowerCase().trim();
  for (const c of VALID_CATEGORIES) {
    if (raw.startsWith(c) || raw.includes(c)) return c;
  }
  if (/fruit|veg|apple|banana|tomato|spinach|berry|lettuce|onion|potato|carrot|produced/i.test(raw)) return "produce";
  if (/milk|cheese|yogurt|butter|cream|dairy|paneer|curd/i.test(raw)) return "dairy";
  if (/bread|loaf|bakery|cake|croissant|pastry|cookie|biscuit|flour|buns/i.test(raw)) return "bakery";
  if (/rice|curry|meal|pasta|cooked|prepared|biryani|roast|soup/i.test(raw)) return "prepared";
  if (/can|canned|tinned|bean|chickpea|tuna/i.test(raw)) return "canned";
  if (/frozen|freezer|ice|salmon|fillet|nugget/i.test(raw)) return "frozen";
  return "general";
}

function normalizeYear(yrStr) {
  let y = parseInt(yrStr, 10);
  if (y < 100) {
    y = y >= 50 ? 1900 + y : 2000 + y;
  }
  return String(y);
}

function normalizeDate(dateStr) {
  if (!dateStr) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }
  const trimmed = String(dateStr).trim();

  // 1. ISO format: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const ymd4Match = trimmed.match(/^(\d{4})[\/. -](\d{1,2})[\/. -](\d{1,2})$/);
  if (ymd4Match) {
    const [, y, m, d] = ymd4Match;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  // 2. 3-part date: DD-MM-YYYY, DD-MM-YY, MM-DD-YYYY, MM-DD-YY
  const partsMatch = trimmed.match(/^(\d{1,4})[\/. -](\d{1,2})[\/. -](\d{1,4})$/);
  if (partsMatch) {
    let [, p1, p2, p3] = partsMatch;
    let year, month, day;

    if (p1.length === 4) {
      year = p1;
      month = p2;
      day = p3;
    } else if (p3.length === 4) {
      year = p3;
      const n1 = parseInt(p1, 10);
      const n2 = parseInt(p2, 10);
      if (n1 > 12) {
        day = p1;
        month = p2;
      } else if (n2 > 12) {
        month = p1;
        day = p2;
      } else {
        day = p1;
        month = p2;
      }
    } else {
      year = normalizeYear(p3);
      const n1 = parseInt(p1, 10);
      const n2 = parseInt(p2, 10);
      if (n1 > 12) {
        day = p1;
        month = p2;
      } else if (n2 > 12) {
        month = p1;
        day = p2;
      } else {
        day = p1;
        month = p2;
      }
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const fallback = new Date();
  fallback.setDate(fallback.getDate() + 7);
  return fallback.toISOString().split("T")[0];
}

export default function CsvUploadModal({ isOpen, open, onClose, onSuccess }) {
  const show = isOpen ?? open;
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successCount, setSuccessCount] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  if (!show) return null;

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "sample_inventory_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    processCsvFile(selectedFile);
  };

  const processCsvFile = (selectedFile) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setErrors([]);
    setParsedData([]);
    setSuccessCount(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => cleanKey(h),
      complete: (results) => {
        setIsProcessing(false);
        validateAndPrepareRows(results.data);
      },
      error: (err) => {
        setIsProcessing(false);
        setErrors([`Failed to parse CSV file: ${err.message}`]);
      },
    });
  };

  const validateAndPrepareRows = (rawRows) => {
    const rowErrors = [];
    const validRows = [];

    if (!rawRows || rawRows.length === 0) {
      setErrors(["The selected CSV file contains no data rows."]);
      return;
    }

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2;

      // Extract Name
      const name = findValue(row, [
        "item_name",
        "name",
        "item",
        "product_name",
        "product",
        "food_item",
        "food",
        "title",
        "description",
      ]);

      if (!name) {
        rowErrors.push(`Row ${rowNum}: Missing item name.`);
        return;
      }

      // Extract Quantity & Unit
      const rawQty = findValue(row, ["quantity", "qty", "count", "amount", "stock", "weight", "vol", "volume", "total"]);
      const rawUnit = findValue(row, ["unit", "units", "uom", "measure", "measurement", "metric"]);

      let quantity = 1;
      let unit = "kg";

      if (rawQty) {
        const match = String(rawQty).match(/^([\d.,]+)\s*([a-zA-Z]*)$/);
        if (match) {
          quantity = parseFloat(match[1].replace(/,/g, "")) || 1;
          if (match[2] && !rawUnit) {
            unit = match[2].toLowerCase();
          }
        } else {
          quantity = parseFloat(String(rawQty).replace(/[^0-9.]/g, "")) || 1;
        }
      }
      if (rawUnit) {
        unit = rawUnit.toLowerCase();
      }

      // Extract Expiry Date
      const rawExpiry = findValue(row, [
        "expiry_date",
        "expiry",
        "expiration_date",
        "expiration",
        "exp_date",
        "exp",
        "best_before",
        "use_by",
        "shelf_life",
        "date_of_expiry",
        "valid_until",
      ]);
      const expiryDateStr = normalizeDate(rawExpiry);

      // Extract Category
      const rawCat = findValue(row, ["category", "cat", "type", "food_category", "group", "section"]);
      const category = detectCategory(rawCat, name);

      // Extract Avg Daily Usage
      const rawUsage = findValue(row, ["avg_daily_usage", "daily_usage", "usage", "daily", "consumption", "rate", "avg_usage"]);
      const avgDailyUsage = parseFloat(String(rawUsage).replace(/[^0-9.]/g, "")) || 1.0;

      // Extract Storage Location
      const storageLoc = findValue(row, ["storage_location", "storage", "location", "loc", "bin", "shelf", "area", "room", "refrigerator", "pantry"]);

      validRows.push({
        name,
        category,
        quantity: quantity > 0 ? quantity : 1,
        unit: unit || "kg",
        expiry_date: expiryDateStr,
        avg_daily_usage: avgDailyUsage,
        storage_location: storageLoc || "",
      });
    });

    setErrors(rowErrors);
    setParsedData(validRows);
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) return;
    setIsUploading(true);
    try {
      const res = await api.bulkUploadCsv(parsedData);
      setSuccessCount(res.created || parsedData.length);
      setTimeout(() => {
        onSuccess?.();
        handleClose();
      }, 1000);
    } catch (err) {
      setErrors((prev) => [...prev, `API Error: ${err.message}`]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setSuccessCount(null);
    setIsProcessing(false);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-wheat-200 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-wheat-200 bg-wheat-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-forest-800 text-wheat-50">
                <Upload className="w-4 h-4" />
              </span>
              <h2 className="font-display text-lg sm:text-xl text-forest-800 font-semibold">Upload Inventory CSV</h2>
            </div>
            <p className="text-[11px] sm:text-xs text-forest-800/60 mt-1">
              Import multiple items at once using a comma-separated values file.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-forest-800/50 hover:text-forest-800 rounded-lg hover:bg-wheat-200/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Sample template banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-forest-50 border border-forest-100 text-forest-800">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-forest-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Need the correct column format?</p>
                <p className="text-xs text-forest-800/70 mt-0.5">
                  Headers: <code className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-forest-100">item_name, category, quantity, unit, expiry_date, avg_daily_usage, storage_location</code>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadSampleCsv}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forest-800 bg-white border border-forest-400/40 rounded-md hover:bg-forest-100/50 transition-colors shrink-0 shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-forest-600" />
              Sample CSV
            </button>
          </div>

          {/* Upload Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) processCsvFile(droppedFile);
            }}
            className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-forest-600 bg-forest-100/40 ring-2 ring-forest-400/30 scale-[1.01]"
                : "border-wheat-200 hover:border-forest-600/60 bg-wheat-50/50 hover:bg-forest-50/20"
            } group`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-forest-100 text-forest-800 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6 text-forest-600" />
            </div>
            <p className="text-sm font-medium text-forest-800 mb-1">
              {file ? file.name : "Click or drag & drop a .CSV file here"}
            </p>
            <p className="text-xs text-forest-800/50">Supports UTF-8 formatted CSV files up to 5MB</p>
          </div>

          {/* Loading spinner */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-forest-800/70">
              <Loader2 className="w-4 h-4 animate-spin text-forest-600" />
              <span>Parsing and validating CSV rows...</span>
            </div>
          )}

          {/* Success Banner */}
          {successCount !== null && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-medium">
                Successfully imported {successCount} inventory item{successCount === 1 ? "" : "s"}!
              </p>
            </div>
          )}

          {/* Error Summary */}
          {errors.length > 0 && (
            <div className="p-4 rounded-lg bg-tomato-500/10 border border-tomato-500/30 text-tomato-600 space-y-2">
              <div className="flex items-center gap-2 font-medium text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Found {errors.length} validation issue{errors.length === 1 ? "" : "s"}:</span>
              </div>
              <ul className="text-xs space-y-1 max-h-36 overflow-y-auto pl-6 list-disc">
                {errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-forest-800/70 font-medium">
                <span>Valid items ready to import ({parsedData.length})</span>
                <span className="font-mono text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">
                  ✓ Validated
                </span>
              </div>
              <div className="border border-wheat-200 rounded-lg max-h-48 overflow-y-auto overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse table-auto min-w-[360px]">
                  <thead className="bg-wheat-100 text-forest-800/70 sticky top-0">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Item</th>
                      <th className="py-2 px-3 font-semibold">Category</th>
                      <th className="py-2 px-3 font-semibold">Qty</th>
                      <th className="py-2 px-3 font-semibold">Expiry</th>
                      <th className="py-2 px-3 font-semibold">Usage/day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-wheat-200">
                    {parsedData.slice(0, 8).map((row, i) => (
                      <tr key={i} className="hover:bg-wheat-50/50">
                        <td className="py-2 px-3 font-medium text-forest-800">{row.name}</td>
                        <td className="py-2 px-3 capitalize text-forest-800/70">{row.category}</td>
                        <td className="py-2 px-3 font-mono">{row.quantity} {row.unit}</td>
                        <td className="py-2 px-3 font-mono">{row.expiry_date}</td>
                        <td className="py-2 px-3 font-mono">{row.avg_daily_usage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.length > 8 && (
                <p className="text-[11px] text-forest-800/50 text-right">
                  + {parsedData.length - 8} more items in file
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-5 sm:px-6 py-4 border-t border-wheat-200 bg-wheat-50">
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium text-forest-800 hover:bg-wheat-200/50 rounded-xl transition-colors text-center"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedData.length === 0 || isUploading}
            onClick={handleUpload}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold bg-forest-800 text-wheat-50 rounded-xl hover:bg-forest-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <span>Import {parsedData.length} Item{parsedData.length === 1 ? "" : "s"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
