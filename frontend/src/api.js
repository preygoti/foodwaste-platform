const API_URL =
  import.meta.env.VITE_API_URL || "https://foodwaste-platform.onrender.com";

// In-Memory Fast SWR Cache for 0ms Instant Page Transitions
const memoryCache = new Map();

function getCached(key) {
  if (memoryCache.has(key)) return memoryCache.get(key);
  try {
    const s = sessionStorage.getItem(`hl_cache_${key}`);
    if (s) {
      const data = JSON.parse(s);
      memoryCache.set(key, data);
      return data;
    }
  } catch (_) {}
  return null;
}

function setCached(key, data) {
  memoryCache.set(key, data);
  try {
    sessionStorage.setItem(`hl_cache_${key}`, JSON.stringify(data));
  } catch (_) {}
}

export function clearApiCache(prefix = "") {
  if (!prefix) {
    memoryCache.clear();
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith("hl_cache_")) sessionStorage.removeItem(k);
      });
    } catch (_) {}
  } else {
    for (const k of memoryCache.keys()) {
      if (k.startsWith(prefix)) memoryCache.delete(k);
    }
    try {
      Object.keys(sessionStorage).forEach((k) => {
        if (k.startsWith(`hl_cache_${prefix}`)) sessionStorage.removeItem(k);
      });
    } catch (_) {}
  }
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function safeFetch(url, options = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastErr = err;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
      }
    }
  }
  throw new Error(
    "Cannot reach backend server. The cloud backend may be waking up from sleep (Render cold start) or network was interrupted. Please try again in a moment."
  );
}

async function handle(res) {
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem("token");
      clearApiCache();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }
    let detail = "Request failed";
    try {
      const body = await res.json();
      detail = Array.isArray(body.detail)
        ? body.detail.map((d) => d.msg).join(", ")
        : body.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}

/** Fetch with instant cache return and background revalidation */
async function fetchCached(url, cacheKey) {
  const resPromise = safeFetch(url, { headers: authHeaders() })
    .then(handle)
    .then((data) => {
      setCached(cacheKey, data);
      return data;
    });

  // If cache is warm, return fresh promise that also has instant cache attachment
  const cached = getCached(cacheKey);
  if (cached) {
    resPromise._cached = cached;
  }
  return resPromise;
}

export const api = {
  getCached,

  async sendRegistrationOtp(email) {
    const res = await safeFetch(`${API_URL}/auth/send-registration-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: (email || "").trim().toLowerCase() }),
    });
    return handle(res);
  },

  async verifyRegistrationOtp(email, otp) {
    const res = await safeFetch(`${API_URL}/auth/verify-registration-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: (email || "").trim().toLowerCase(),
        otp: (otp || "").trim(),
      }),
    });
    return handle(res);
  },

  async register(data) {
    const payload = {
      ...data,
      email: (data.email || "").trim().toLowerCase(),
      org_name: (data.org_name || "").trim(),
    };
    const res = await safeFetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    clearApiCache();
    return handle(res);
  },

  async login(email, password) {
    const form = new URLSearchParams();
    form.set("username", (email || "").trim().toLowerCase());
    form.set("password", password);
    const res = await safeFetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    clearApiCache();
    return handle(res);
  },

  async forgotPassword(email) {
    const res = await safeFetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: (email || "").trim().toLowerCase() }),
    });
    return handle(res);
  },

  async verifyOtp(email, otp) {
    const res = await safeFetch(`${API_URL}/auth/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: (email || "").trim().toLowerCase(),
        otp: (otp || "").trim(),
      }),
    });
    return handle(res);
  },

  async resetPassword(email, otp, newPassword) {
    const res = await safeFetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: (email || "").trim().toLowerCase(),
        otp: (otp || "").trim(),
        new_password: newPassword,
      }),
    });
    return handle(res);
  },

  async me() {
    const res = await safeFetch(`${API_URL}/auth/me`, { headers: authHeaders() });
    return handle(res);
  },

  // Inventory (Business Only)
  async listInventory(forceFresh = false) {
    if (forceFresh) {
      clearApiCache("inventory");
      const res = await safeFetch(`${API_URL}/inventory`, { headers: authHeaders() });
      const data = await handle(res);
      setCached("inventory", data);
      return data;
    }
    return fetchCached(`${API_URL}/inventory`, "inventory");
  },
  async getInventory(forceFresh = false) {
    return this.listInventory(forceFresh);
  },
  async createInventoryItem(data) {
    const res = await safeFetch(`${API_URL}/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    clearApiCache();
    return handle(res);
  },
  async updateInventoryItem(id, data) {
    const res = await safeFetch(`${API_URL}/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    clearApiCache();
    return handle(res);
  },
  async deleteInventoryItem(id) {
    const res = await safeFetch(`${API_URL}/inventory/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    clearApiCache();
    return handle(res);
  },
  async clearExpiredInventory() {
    const res = await safeFetch(`${API_URL}/inventory/expired/clear`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    clearApiCache();
    return handle(res);
  },
  async bulkUploadCsv(rows) {
    const res = await safeFetch(`${API_URL}/inventory/bulk-csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(rows),
    });
    clearApiCache();
    return handle(res);
  },

  // Listings
  async createListing(data) {
    const res = await safeFetch(`${API_URL}/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    clearApiCache("inventory");
    clearApiCache("my_listings");
    clearApiCache("browse_listings");
    clearApiCache("dashboard");
    return handle(res);
  },
  async browseListings() {
    return fetchCached(`${API_URL}/listings?status_filter=available`, "browse_listings");
  },
  async myListings() {
    return fetchCached(`${API_URL}/listings/mine`, "my_listings");
  },

  // Pickups
  async requestPickup(data) {
    const res = await safeFetch(`${API_URL}/pickups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    clearApiCache("pickups");
    clearApiCache("my_pickups");
    clearApiCache("browse_listings");
    clearApiCache("dashboard");
    return handle(res);
  },
  async updatePickup(id, data) {
    const res = await safeFetch(`${API_URL}/pickups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    clearApiCache("pickups");
    clearApiCache("my_pickups");
    clearApiCache("my_listings");
    clearApiCache("browse_listings");
    clearApiCache("dashboard");
    clearApiCache("analytics_business");
    clearApiCache("analytics_ngo");
    return handle(res);
  },
  async myPickups() {
    return fetchCached(`${API_URL}/pickups/mine`, "my_pickups");
  },
  async listingPickups(listingId) {
    return fetchCached(`${API_URL}/listings/${listingId}/pickups`, `listing_${listingId}_pickups`);
  },

  // Analytics & Food Rescue Dashboard
  async businessAnalytics() {
    return fetchCached(`${API_URL}/analytics/business`, "analytics_business");
  },
  async ngoAnalytics() {
    return fetchCached(`${API_URL}/analytics/ngo`, "analytics_ngo");
  },
  async getDashboardMetrics() {
    return fetchCached(`${API_URL}/analytics/dashboard`, "dashboard_metrics");
  },

  // AI Vision Food Freshness Inspector
  async inspectFreshness(imageBase64, itemHint = "") {
    const res = await safeFetch(`${API_URL}/ai/inspect-freshness`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ image_base64: imageBase64, item_hint: itemHint }),
    });
    return handle(res);
  },

  // QR Code Proof of Rescue Handshake Verification
  async verifyPickupHandshake(pickupId, handshakeToken = "", code = "") {
    const res = await safeFetch(`${API_URL}/pickups/${pickupId}/verify-handshake`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        pickup_id: Number(pickupId),
        handshake_token: handshakeToken,
        code: code,
      }),
    });
    clearApiCache("my_listings");
    clearApiCache("pickups");
    clearApiCache("browse_listings");
    clearApiCache("analytics_business");
    clearApiCache("dashboard");
    return handle(res);
  },

  // Direct 6-Digit Verification PIN Verification
  async verifyPickupByCode(code, pickupId = null) {
    const res = await safeFetch(`${API_URL}/pickups/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        code: String(code).trim(),
        pickup_id: pickupId ? Number(pickupId) : null,
      }),
    });
    clearApiCache("my_listings");
    clearApiCache("pickups");
    clearApiCache("browse_listings");
    clearApiCache("analytics_business");
    clearApiCache("dashboard");
    return handle(res);
  },
};
