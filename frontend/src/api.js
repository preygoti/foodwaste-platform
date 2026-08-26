const API_URL =
  import.meta.env.VITE_API_URL || "https://foodwaste-platform.onrender.com";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  if (!res.ok) {
    if (res.status === 401) {
      // Invalidate stale token and notify AuthContext
      localStorage.removeItem("token");
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

export const api = {
  async register(data) {
    const payload = {
      ...data,
      email: (data.email || "").trim().toLowerCase(),
      org_name: (data.org_name || "").trim(),
    };
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handle(res);
  },

  async login(email, password) {
    const form = new URLSearchParams();
    form.set("username", (email || "").trim().toLowerCase());
    form.set("password", password);
    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    return handle(res);
  },

  async forgotPassword(email) {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: (email || "").trim().toLowerCase() }),
    });
    return handle(res);
  },

  async verifyOtp(email, otp) {
    const res = await fetch(`${API_URL}/auth/verify-otp`, {
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
    const res = await fetch(`${API_URL}/auth/reset-password`, {
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
    const res = await fetch(`${API_URL}/auth/me`, { headers: authHeaders() });
    return handle(res);
  },

  // Inventory (Business Only)
  async listInventory() {
    const res = await fetch(`${API_URL}/inventory`, { headers: authHeaders() });
    return handle(res);
  },
  async createInventoryItem(data) {
    const res = await fetch(`${API_URL}/inventory`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handle(res);
  },
  async updateInventoryItem(id, data) {
    const res = await fetch(`${API_URL}/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handle(res);
  },
  async deleteInventoryItem(id) {
    const res = await fetch(`${API_URL}/inventory/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    return handle(res);
  },
  async bulkUploadCsv(rows) {
    const res = await fetch(`${API_URL}/inventory/bulk-csv`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(rows),
    });
    return handle(res);
  },

  // Listings
  async createListing(data) {
    const res = await fetch(`${API_URL}/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handle(res);
  },
  async browseListings() {
    const res = await fetch(`${API_URL}/listings?status_filter=available`, { headers: authHeaders() });
    return handle(res);
  },
  async myListings() {
    const res = await fetch(`${API_URL}/listings/mine`, { headers: authHeaders() });
    return handle(res);
  },

  // Pickups
  async requestPickup(data) {
    const res = await fetch(`${API_URL}/pickups`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handle(res);
  },
  async updatePickup(id, data) {
    const res = await fetch(`${API_URL}/pickups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(data),
    });
    return handle(res);
  },
  async myPickups() {
    const res = await fetch(`${API_URL}/pickups/mine`, { headers: authHeaders() });
    return handle(res);
  },
  async listingPickups(listingId) {
    const res = await fetch(`${API_URL}/listings/${listingId}/pickups`, { headers: authHeaders() });
    return handle(res);
  },

  // Analytics & Food Rescue Dashboard
  async businessAnalytics() {
    const res = await fetch(`${API_URL}/analytics/business`, { headers: authHeaders() });
    return handle(res);
  },
  async ngoAnalytics() {
    const res = await fetch(`${API_URL}/analytics/ngo`, { headers: authHeaders() });
    return handle(res);
  },
  async getDashboardMetrics() {
    const res = await fetch(`${API_URL}/analytics/dashboard`, { headers: authHeaders() });
    return handle(res);
  },
};
