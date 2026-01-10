import React, { useEffect, useMemo, useRef, useState } from "react";

function AddNewEvents() {
  const API_BASE = "http://127.0.0.1:8000";

  const getToken = () =>
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const authHeaders = (json = false) => {
    const token = getToken();
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  // Form state
  const [formData, setFormData] = useState({
    event_name: "",
    event_location: "",
    event_time: "",
    event_date: "",
    sale_date: "",
    ticket_price: "",
    category: "",
  });

  // Categories
  const [categories, setCategories] = useState([]);

  // Images
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);

  // UI state
  const [uploadStatus, setUploadStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Config
  const MAX_FILES = 10;
  const MAX_SIZE_MB = 5;
  const IMAGE_SEPARATOR = "|||SEPARATOR|||";

  // Refs
  const fileInputRef = useRef(null);

  // Fetch categories and default category
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories/`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error("Failed to fetch categories");
        const data = await res.json();
        setCategories(data || []);
        if (data?.length && !formData.category) {
          setFormData((p) => ({ ...p, category: data[0].id }));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, []);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    // Validate
    const valid = files.filter((f) => {
      const isImage = f.type.startsWith("image/");
      const within = f.size <= MAX_SIZE_MB * 1024 * 1024;
      if (!isImage) console.warn("Skipped non-image:", f.name);
      if (!within) setUploadStatus(`File ${f.name} exceeds ${MAX_SIZE_MB}MB`);
      return isImage && within;
    });

    // Merge and dedupe
    const existing = [...selectedFiles];
    const merged = [...existing];
    valid.forEach((nf) => {
      const dup = existing.some(
        (ef) =>
          ef.name === nf.name &&
          ef.size === nf.size &&
          ef.lastModified === nf.lastModified
      );
      if (!dup) merged.push(nf);
    });

    const finalFiles = merged.slice(0, MAX_FILES);
    if (merged.length > MAX_FILES) {
      setUploadStatus(`Limited to first ${MAX_FILES} images`);
    }

    setSelectedFiles(finalFiles);
    createPreviews(finalFiles);
  };

  const createPreviews = (files) => {
    const out = [];
    let loaded = 0;
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        out[i] = { url: e.target.result, name: file.name, size: file.size };
        loaded++;
        if (loaded === files.length) setPreviews([...out]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    const nf = selectedFiles.filter((_, i) => i !== index);
    const np = previews.filter((_, i) => i !== index);
    setSelectedFiles(nf);
    setPreviews(np);
    if (nf.length === 0 && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Drag and drop reorder
  const dragIndex = useRef(null);
  const handleDragStart = (index) => (e) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (index) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (index) => (e) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from === null || from === index) return;
    const reorder = (arr) => {
      const copy = [...arr];
      const [moved] = copy.splice(from, 1);
      copy.splice(index, 0, moved);
      return copy;
    };
    setSelectedFiles((arr) => reorder(arr));
    setPreviews((arr) => reorder(arr));
    dragIndex.current = null;
  };

  // Helpers
  const toNullIfEmpty = (v) => (v === "" ? null : v);

  const compressImage = (file, maxWidth = 1200, quality = 0.8) =>
    new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else if (height > maxWidth) {
          width = (width * maxWidth) / height;
          height = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve(out);
      };
      img.src = URL.createObjectURL(file);
    });

  const uploadEvent = async () => {
    if (!formData.event_name.trim()) {
      setUploadStatus("Please enter an event name");
      return;
    }

    setLoading(true);
    setUploadStatus("Processing images...");

    try {
      const compressed = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        setUploadStatus(`Processing image ${i + 1} of ${selectedFiles.length}...`);
        const base64 = await compressImage(selectedFiles[i]);
        compressed.push(base64);
      }

      const payload = {
        event_name: formData.event_name,
        event_location: toNullIfEmpty(formData.event_location),
        event_time: toNullIfEmpty(formData.event_time),
        event_date: toNullIfEmpty(formData.event_date),
        sale_date: toNullIfEmpty(formData.sale_date),
        ticket_price: toNullIfEmpty(formData.ticket_price),
        category: parseInt(formData.category),
        event_image:
          compressed.length > 0 ? compressed.join(IMAGE_SEPARATOR) : null,
      };

      await sendEventData(payload);
    } catch (err) {
      console.error(err);
      setUploadStatus("❌ Error processing images: " + err.message);
      setLoading(false);
    }
  };

  const sendEventData = async (payload) => {
    try {
      setUploadStatus("Uploading to server...");

      if (!getToken()) {
        setUploadStatus("❌ Please login as admin to create events");
        return;
      }

      const res = await fetch(`${API_BASE}/api/events/`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(payload),
      });

      if (res.status === 401 || res.status === 403) {
        setUploadStatus("❌ Unauthorized/Forbidden (admin only). Please login again.");
        return;
      }

      const ct = res.headers.get("content-type");
      const data = ct && ct.includes("application/json")
        ? await res.json()
        : await res.text();

      if (!res.ok) {
        const msg = typeof data === "string" ? data : JSON.stringify(data);
        setUploadStatus(`❌ Failed to create event: ${msg}`);
      } else {
        setUploadStatus(`✅ Event "${payload.event_name}" created successfully!`);
        // Reset
        setFormData((p) => ({
          event_name: "",
          event_location: "",
          event_time: "",
          event_date: "",
          sale_date: "",
          ticket_price: "",
          category: categories.length ? categories[0].id : "",
        }));
        setSelectedFiles([]);
        setPreviews([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (e) {
      setUploadStatus("❌ Network error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Derived
  const slotCount = useMemo(
    () => Math.max(6, previews.length || 0),
    [previews.length]
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-12">
          {/* Left: Posters area */}
          <div className="col-span-12 md:col-span-5 p-4 sm:p-6 relative md:border-r md:pr-6 border-gray-200">
            {/* Grid of slots */}
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: slotCount }).map((_, i) => {
                const pv = previews[i];
                return (
                  <div key={i} className="flex flex-col items-start">
                    <div
                      draggable={!!pv}
                      onDragStart={pv ? handleDragStart(i) : undefined}
                      onDragOver={handleDragOver(i)}
                      onDrop={handleDrop(i)}
                      className={`relative w-full aspect-[3/4] ${
                        pv
                          ? "border border-gray-300"
                          : "border-2 border-dashed border-gray-300"
                      } rounded-md overflow-hidden bg-gray-50`}
                    >
                      {pv ? (
                        <>
                          <img
                            src={pv.url}
                            alt={`poster-${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {/* Delete button */}
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 left-1 bg-black/80 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-black"
                            title="Remove"
                          >
                            ×
                          </button>
                          {/* Drag hint */}
                          <div className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                            drag
                          </div>
                        </>
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-gray-400 text-xs"
                          title="Empty slot"
                        >
                          Empty
                        </div>
                      )}
                    </div>
                    {/* Number below tile */}
                    <div className="mt-2 w-full flex justify-start">
                      <div className="w-6 h-6 rounded-full border border-gray-400 text-gray-700 text-xs flex items-center justify-center">
                        {i + 1}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer controls under grid */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-gray-600">
                <p>Drag to move posters and</p>
                <p>arrange display sequence</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 border border-gray-300 rounded-md px-4 py-2 hover:bg-gray-50"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-900">
                    <span className="text-gray-900 text-base leading-none">+</span>
                  </span>
                  <span className="text-sm">Add new poster</span>
                </button>
                <input
                  ref={fileInputRef}
                  id="image-input"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="col-span-12 md:col-span-7 p-4 sm:p-6">
            <div className="space-y-4">
              {/* Event name */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700">Event name</label>
                <input
                  type="text"
                  name="event_name"
                  value={formData.event_name}
                  onChange={handleInputChange}
                  className="flex-1 h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]"
                />
              </div>

              {/* Date */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700">Date</label>
                <input
                  type="text"
                  name="event_date"
                  value={formData.event_date}
                  onChange={handleInputChange}
                  placeholder="e.g., 2025-09-28"
                  className="flex-1 h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]"
                />
              </div>

              {/* Time */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700">Time</label>
                <input
                  type="text"
                  name="event_time"
                  value={formData.event_time}
                  onChange={handleInputChange}
                  placeholder="e.g., 18:30"
                  className="flex-1 h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]"
                />
              </div>

              {/* Location */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700">Location</label>
                <input
                  type="text"
                  name="event_location"
                  value={formData.event_location}
                  onChange={handleInputChange}
                  className="flex-1 h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]"
                />
              </div>

              {/* Sale Date */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700">Sale Date</label>
                <input
                  type="text"
                  name="sale_date"
                  value={formData.sale_date}
                  onChange={handleInputChange}
                  placeholder="e.g., 2025-09-15"
                  className="flex-1 h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]"
                />
              </div>

              {/* Price */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700">Price</label>
                <input
                  type="text"
                  name="ticket_price"
                  value={formData.ticket_price}
                  onChange={handleInputChange}
                  placeholder="e.g., Premium - 1000, Regular - 500"
                  className="flex-1 h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]"
                />
              </div>

              {/* Category (visible selector) */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700">Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="flex-1 h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]"
                >
                  {categories.length === 0 ? (
                    <option value="">Loading categories...</option>
                  ) : (
                    categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.category_name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Create button */}
              <div className="pt-2">
                <button
                  onClick={uploadEvent}
                  disabled={!formData.event_name.trim() || loading}
                  className={`w-full h-11 rounded-md text-white font-medium transition ${
                    !formData.event_name.trim() || loading
                      ? "bg-[#f28fa5]/40 cursor-not-allowed"
                      : "bg-[#ee6786ff] hover:bg-[#ee6786ff]/90"
                  }`}
                >
                  {loading ? "Creating Event..." : "Create Event"}
                </button>
              </div>

              {/* Status */}
              {uploadStatus && (
                <div
                  className={`text-sm mt-2 p-2 rounded ${
                    uploadStatus.includes("✅")
                      ? "bg-green-100 text-green-800"
                      : uploadStatus.includes("❌")
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {uploadStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddNewEvents;