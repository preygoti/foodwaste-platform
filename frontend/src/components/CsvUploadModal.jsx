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

export default function CsvUploadModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successCount, setSuccessCount] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

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
      transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, "_"),
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

    // Check for expected headers from sample
    const firstRow = rawRows[0];
    const hasName = "item_name" in firstRow || "name" in firstRow;
    const hasQuantity = "quantity" in firstRow;
    const hasExpiry = "expiry_date" in firstRow || "expiry" in firstRow;

    if (!hasName || !hasQuantity || !hasExpiry) {
      const missing = [];
      if (!hasName) missing.push("'item_name'");
      if (!hasQuantity) missing.push("'quantity'");
      if (!hasExpiry) missing.push("'expiry_date'");
      rowErrors.push(`Missing required CSV header columns: ${missing.join(", ")}. Please use the sample template.`);
    }

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2; // account for 1-based index and header row
      const name = (row.item_name || row.name || "").trim();
      const category = (row.category || "general").trim().toLowerCase();
      const quantityStr = row.quantity;
      const unit = (row.unit || "kg").trim();
      const expiryDateStr = (row.expiry_date || row.expiry || "").trim();
      const avgUsageStr = row.avg_daily_usage;
      const storageLoc = (row.storage_location || "").trim();

      const itemErrors = [];

      if (!name) {
        itemErrors.push("Item name is required");
      }

      const quantity = parseFloat(quantityStr);
      if (isNaN(quantity) || quantity <= 0) {
        itemErrors.push(`Quantity must be a positive number (received '${quantityStr || ""}')`);
      }

      if (!expiryDateStr) {
        itemErrors.push("Expiry date is required");
      } else {
        const parsedDate = new Date(expiryDateStr);
        if (isNaN(parsedDate.getTime())) {
          itemErrors.push(`Invalid expiry date format '${expiryDateStr}' (expected YYYY-MM-DD)`);
        }
      }

      let avgDailyUsage = 1.0;
      if (avgUsageStr !== undefined && avgUsageStr !== "") {
        const usageVal = parseFloat(avgUsageStr);
        if (isNaN(usageVal) || usageVal < 0) {
          itemErrors.push(`Average daily usage must be a non-negative number (received '${avgUsageStr}')`);
        } else {
          avgDailyUsage = usageVal;
        }
      }

      if (itemErrors.length > 0) {
        rowErrors.push(`Row ${rowNum}: ${itemErrors.join("; ")}`);
      } else {
        validRows.push({
          name,
          category,
          quantity,
          unit: unit || "kg",
          expiry_date: expiryDateStr,
          avg_daily_usage: avgDailyUsage,
          storage_location: storageLoc,
        });
      }
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
      }, 1400);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-wheat-200 rounded-xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-wheat-200 bg-wheat-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-forest-800 text-wheat-50">
                <Upload className="w-4 h-4" />
              </span>
              <h2 className="font-display text-xl text-forest-800">Upload Inventory CSV</h2>
            </div>
            <p className="text-xs text-forest-800/60 mt-1">
              Import multiple items at once using a comma-separated values file.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-forest-800/50 hover:text-forest-800 rounded-lg hover:bg-wheat-200/50 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
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
            className="border-2 border-dashed border-wheat-200 hover:border-forest-600/60 rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all bg-wheat-50/50 hover:bg-forest-50/20 group"
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
              <div className="border border-wheat-200 rounded-lg overflow-x-auto max-h-48">
                <table className="w-full text-left text-xs border-collapse">
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-wheat-200 bg-wheat-50">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-forest-800 hover:bg-wheat-200/50 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={parsedData.length === 0 || isUploading}
            onClick={handleUpload}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-forest-800 text-wheat-50 rounded-lg hover:bg-forest-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
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
