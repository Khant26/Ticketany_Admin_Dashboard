import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff, FiLoader } from "react-icons/fi";

function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/";

  const getToken = () =>
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const authHeaders = (json = false) => {
    const token = getToken();
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    // Only set Content-Type for JSON, let browser handle FormData
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  // Data
  const [formData, setFormData] = useState({
    event_name: "",
    event_location: "",
    event_time: "",
    sale_date: "",
    category: "",
  });
  const [categories, setCategories] = useState([]);

  // Date input state (for date tags)
  const [dateInput, setDateInput] = useState("");
  const [selectedDates, setSelectedDates] = useState([]);

  // Price input state (for price tags)
  const [priceInput, setPriceInput] = useState("");
  const [selectedPrices, setSelectedPrices] = useState([]);

  // Posters (existing + new) via a combined view
  // existingImages: array of objects {id, image_url} from backend
  const [existingImages, setExistingImages] = useState([]);
  // newFiles: [{ file, preview }]
  const [newFiles, setNewFiles] = useState([]);
  // Track IDs of images to delete
  const [imagesToDelete, setImagesToDelete] = useState([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isHidden, setIsHidden] = useState(false);
  const [toggling, setToggling] = useState(false);
  const fileInputRef = useRef(null);

  const IMAGE_SEPARATOR = "|||SEPARATOR|||";
  const MAX_FILES = 10;

  // Word limit configuration for each field
  const WORD_LIMITS = {
    event_name: 10,
    event_location: 15,
    event_time: 5,
    sale_date: 10,
    ticket_price: 5,
  };

  // Utility function to count words
  const countWords = (text) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  // Utility function to check if word limit is exceeded
  const isWordLimitExceeded = (fieldName, text) => {
    return countWords(text) > WORD_LIMITS[fieldName];
  };

  // Inline edit state per field
  const [editing, setEditing] = useState({
    event_name: false,
    event_date: false,
    event_time: false,
    event_location: false,
    sale_date: false,
    ticket_price: false,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}categories/`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEvent = async () => {
    try {
      const res = await fetch(`${API_BASE}events/${id}/`, {
        headers: authHeaders(),
      });
      if (res.status === 401 || res.status === 403) {
        setStatus(
          "❌ Unauthorized/Forbidden (admin only). Please login again.",
        );
        navigate("/admin/login");
        return;
      }
      if (!res.ok) return;
      const data = await res.json();

      setFormData({
        event_name: data.event_name || "",
        event_location: data.event_location || "",
        event_time: data.event_time || "",
        sale_date: data.sale_date || "",
        category: data.category || "",
      });

      // Handle event_date - convert to array of date tags
      if (data.event_date) {
        let dates = [];
        if (Array.isArray(data.event_date)) {
          dates = data.event_date.map((d) => String(d));
        } else if (typeof data.event_date === "string") {
          try {
            const parsed = JSON.parse(data.event_date);
            if (Array.isArray(parsed)) {
              dates = parsed.map((d) => String(d));
            } else {
              dates = [String(data.event_date)];
            }
          } catch {
            dates = [String(data.event_date)];
          }
        } else {
          dates = [String(data.event_date)];
        }
        setSelectedDates(dates);
      } else {
        setSelectedDates([]);
      }

      // Handle ticket_price - convert to array of price tags
      if (data.ticket_price) {
        let prices = [];
        if (Array.isArray(data.ticket_price)) {
          prices = data.ticket_price.map((p) => String(p));
        } else if (typeof data.ticket_price === "object") {
          prices = Object.entries(data.ticket_price).map(
            ([key, val]) => `${key}: ${val}`,
          );
        } else if (typeof data.ticket_price === "string") {
          try {
            const parsed = JSON.parse(data.ticket_price);
            if (Array.isArray(parsed)) {
              prices = parsed.map((p) => String(p));
            } else if (typeof parsed === "object") {
              prices = Object.entries(parsed).map(
                ([key, val]) => `${key}: ${val}`,
              );
            } else {
              prices = [String(parsed)];
            }
          } catch {
            prices = [String(data.ticket_price)];
          }
        } else {
          prices = [String(data.ticket_price)];
        }
        setSelectedPrices(prices);
      } else {
        setSelectedPrices([]);
      }

      // Use the new images array structure with id and image_url
      if (data.images?.length > 0) {
        setExistingImages(data.images.map(img => ({ id: img.id, image_url: img.image_url })));
      } else if (data.event_image) {
        // Fallback for old event_image format
        const arr = data.event_image.includes(IMAGE_SEPARATOR)
          ? data.event_image.split(IMAGE_SEPARATOR)
          : [data.event_image];
        setExistingImages(arr.map(url => ({ id: null, image_url: url })));
      } else {
        setExistingImages([]);
      }
      // set hidden state
      setIsHidden(!!data.is_hidden);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInput = (name, value) => {
    setFormData((p) => ({ ...p, [name]: value }));
  };

  const toggleEdit = (name) => {
    setEditing((p) => ({ ...p, [name]: !p[name] }));
  };

  // Handle date input with Enter key
  const handleDateKeyDown = (e) => {
    if (e.key === "Enter" && dateInput.trim()) {
      e.preventDefault();
      const newDate = dateInput.trim();
      setSelectedDates((prev) => [...prev, newDate]);
      setDateInput("");
    }
  };

  // Handle date input with Add button
  const handleAddDate = () => {
    if (dateInput.trim()) {
      const newDate = dateInput.trim();
      setSelectedDates((prev) => [...prev, newDate]);
      setDateInput("");
    }
  };

  // Remove date tag
  const removeDateTag = (index) => {
    const updatedDates = selectedDates.filter((_, i) => i !== index);
    setSelectedDates(updatedDates);
  };

  // Handle price input with Enter key
  const handlePriceKeyDown = (e) => {
    if (e.key === "Enter" && priceInput.trim()) {
      e.preventDefault();
      const newPrice = priceInput.trim();
      setSelectedPrices((prev) => [...prev, newPrice]);
      setPriceInput("");
    }
  };

  // Handle price input with Add button
  const handleAddPrice = () => {
    if (priceInput.trim()) {
      const newPrice = priceInput.trim();
      setSelectedPrices((prev) => [...prev, newPrice]);
      setPriceInput("");
    }
  };

  // Remove price tag
  const removePriceTag = (index) => {
    const updatedPrices = selectedPrices.filter((_, i) => i !== index);
    setSelectedPrices(updatedPrices);
  };

  // Posters: combined view (existing first, then newly added)
  const posters = useMemo(
    () => [
      ...existingImages.map((img) => ({ kind: "existing", url: img.image_url, id: img.id })),
      ...newFiles.map((nf) => ({
        kind: "new",
        url: nf.preview,
        file: nf.file,
      })),
    ],
    [existingImages, newFiles],
  );

  const slotCount = useMemo(
    () => Math.max(6, posters.length || 0),
    [posters.length],
  );

  const handleNewFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = MAX_FILES - posters.length;
    const allowed = files.slice(0, Math.max(0, remaining));

    const mapped = allowed.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setNewFiles((prev) => [...prev, ...mapped]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePosterAt = (idx) => {
    // Remove from combined; then split back into existing + new
    const item = posters[idx];
    if (item && item.kind === "existing" && item.id) {
      setImagesToDelete(prev => [...prev, item.id]);
    }
    const next = posters.filter((_, i) => i !== idx);
    splitAndApply(next);
  };

  const dragIndex = useRef(null);
  const onDragStart = (index) => (e) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (index) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (index) => (e) => {
    e.preventDefault();
    const from = dragIndex.current;
    if (from == null || from === index) return;
    const copy = [...posters];
    const [moved] = copy.splice(from, 1);
    copy.splice(index, 0, moved);
    splitAndApply(copy);
    dragIndex.current = null;
  };

  const splitAndApply = (combined) => {
    const nextExisting = [];
    const nextNew = [];
    combined.forEach((it) => {
      if (it.kind === "existing") nextExisting.push({ id: it.id, image_url: it.url });
      else nextNew.push({ file: it.file, preview: it.url });
    });
    setExistingImages(nextExisting);
    setNewFiles(nextNew);
  };

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
        ctx.fillStyle = "#FFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = URL.createObjectURL(file);
    });

  const updateEvent = async () => {
    setLoading(true);
    setStatus("Updating event...");

    if (!getToken()) {
      setStatus("❌ Please login as admin to update events");
      navigate("/admin/login");
      setLoading(false);
      return;
    }

    try {
      // Create FormData object
      const formDataToSend = new FormData();

      // Add text fields with proper JSON handling for JSONField
      formDataToSend.append("event_name", formData.event_name);
      formDataToSend.append("event_location", formData.event_location || "");
      formDataToSend.append("event_time", formData.event_time || "");

      // Handle JSONField types - Django expects JSON strings
      if (selectedDates.length > 0) {
        formDataToSend.append("event_date", JSON.stringify(selectedDates));
      } else {
        formDataToSend.append("event_date", JSON.stringify(null));
      }

      formDataToSend.append("sale_date", formData.sale_date || "");

      // Handle ticket_price as array
      if (selectedPrices.length > 0) {
        formDataToSend.append("ticket_price", JSON.stringify(selectedPrices));
      } else {
        formDataToSend.append("ticket_price", JSON.stringify(null));
      }

      formDataToSend.append("category", formData.category || "");

      // Add new image files directly to FormData
      newFiles.forEach((fileObj) => {
        if (fileObj.file) {
          formDataToSend.append("images", fileObj.file);
        }
      });
      // Add existing image URLs to inform backend which to keep (optional, if needed)
      existingImages.forEach((img, index) => {
        formDataToSend.append(`existing_images[${index}]`, img.image_url);
      });
      // Add images_to_delete as JSON string
      if (imagesToDelete.length > 0) {
        formDataToSend.append("images_to_delete", JSON.stringify(imagesToDelete));
      }

      const res = await fetch(`${API_BASE}events/${id}/`, {
        method: "PUT",
        headers: authHeaders(), // Don't set Content-Type for FormData
        body: formDataToSend,
      });

      if (res.status === 401 || res.status === 403) {
        setStatus(
          "❌ Unauthorized/Forbidden (admin only). Please login again.",
        );
        navigate("/admin/login");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(`❌ Failed: ${JSON.stringify(data)}`);
      } else {
        setStatus("✅ Event updated successfully!");
        setNewFiles([]); // new files are now part of existing images on server
        // Refresh to pull normalized data from backend
        setTimeout(fetchEvent, 350);
      }
    } catch (e) {
      console.error(e);
      setStatus("❌ Network error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async () => {
    if (!window.confirm("Delete this event?")) return;

    if (!getToken()) {
      setStatus("❌ Please login as admin to delete events");
      navigate("/admin/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}events/${id}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (res.status === 401 || res.status === 403) {
        setStatus(
          "❌ Unauthorized/Forbidden (admin only). Please login again.",
        );
        navigate("/admin/login");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(`❌ Failed to delete: ${JSON.stringify(data)}`);
      } else {
        navigate("/admin/eventupload", { replace: true });
      }
    } catch (e) {
      setStatus("❌ Network error: " + e.message);
    }
  };

  const toggleEventHide = async () => {
    if (!getToken()) {
      setStatus("❌ Please login as admin to change visibility");
      navigate('/admin/login');
      return;
    }
    setToggling(true);
    setStatus("");
    try {
      const res = await fetch(`${API_BASE}events/${id}/toggle_hide/`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Toggle failed (${res.status}) ${txt}`);
      }
      // Refresh event data
      await fetchEvent();
      setStatus('✅ Visibility updated');
    } catch (e) {
      console.error(e);
      setStatus('❌ ' + (e.message || 'Failed to toggle visibility'));
    } finally {
      setToggling(false);
    }
  };

  const InlineRow = ({ label, name, placeholder, maxLength }) => (
    <div className="flex items-start gap-4">
      <div className="w-32 text-gray-700 pt-2">{label}</div>
      <div className="flex-1">
        {!editing[name] ? (
          <div className="flex items-center gap-2">
            <p className="text-gray-900">
              {formData[name] ? String(formData[name]) : "-"}
            </p>
            <button
              type="button"
              onClick={() => toggleEdit(name)}
              className="p-1 rounded hover:bg-gray-100"
              title="Edit"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path d="M12 20h9" strokeWidth="2" strokeLinecap="round"></path>
                <path
                  d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={formData[name] ?? ""}
                placeholder={placeholder}
                onChange={(e) => handleInput(name, e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && toggleEdit(name)}
                onBlur={() => toggleEdit(name)}
                maxLength={maxLength}
                className={`flex-1 h-10 rounded-md border ${
                  isWordLimitExceeded(name, formData[name] ?? "")
                    ? "border-red-500"
                    : "border-gray-300"
                } px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]`}
              />
            </div>
            <div className="flex justify-between">
              {maxLength && (
                <div className="text-xs text-gray-500">
                  {(formData[name] ?? "").length}/{maxLength} characters
                </div>
              )}
              {WORD_LIMITS[name] && (
                <div
                  className={`text-xs ${
                    isWordLimitExceeded(name, formData[name] ?? "")
                      ? "text-red-500 font-semibold"
                      : "text-gray-500"
                  }`}
                >
                  {countWords(formData[name] ?? "")}/{WORD_LIMITS[name]} words
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin/eventupload")}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
            title="Go back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h2 className="text-2xl font-bold">Edit Event</h2>
        </div>
        <div className="flex items-center gap-3"> 
          <button
            onClick={toggleEventHide}
            disabled={toggling}
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all ${
              isHidden ? 'bg-green-50 text-green-800 hover:bg-green-100' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'
            } ${toggling ? 'opacity-80 cursor-wait' : ''}`}
            title={isHidden ? 'Unhide event' : 'Hide event'}
          >
            {toggling ? (
              <FiLoader className="w-4 h-4 animate-spin" />
            ) : isHidden ? (
              <FiEyeOff className="w-4 h-4" />
            ) : (
              <FiEye className="w-4 h-4" />
            )}
            <span className="text-sm">{isHidden ? 'Unhide' : 'Hide'}</span>
          </button>

          <button
            onClick={deleteEvent}
            className=" flex items-center gap-2 px-4 py-2 rounded-md text-gray-700 hover:text-red-600 hover:bg-red-50 transition"
            title="Delete Event"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            <span className="text-sm font-medium">Delete Event</span>
          </button>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden relative">
        {/* Delete button in top right */}

        <div className="grid grid-cols-12">
          {/* Left: Posters */}
          <div className="col-span-12 md:col-span-5 p-4 sm:p-6 relative md:border-r md:pr-6 border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: slotCount }).map((_, i) => {
                const item = posters[i];
                return (
                  <div key={i} className="flex flex-col items-start">
                    <div
                      draggable={!!item}
                      onDragStart={item ? onDragStart(i) : undefined}
                      onDragOver={onDragOver(i)}
                      onDrop={onDrop(i)}
                      className={`relative w-full aspect-[3/4] ${
                        item
                          ? "border border-gray-300"
                          : "border-2 border-dashed border-gray-300"
                      } rounded-md overflow-hidden bg-gray-50`}
                    >
                      {item ? (
                        <>
                          <img
                            src={item.url}
                            alt={`poster-${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePosterAt(i)}
                            className="absolute top-1 left-1 bg-black/80 text-white rounded-full w-6 h-6 text-xs flex items-center justify-center hover:bg-black"
                            title="Remove"
                          >
                            ×
                          </button>
                          <div className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white">
                            drag
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                          Empty
                        </div>
                      )}
                    </div>
                    <div className="mt-2 w-full flex justify-start">
                      <div className="w-6 h-6 rounded-full border border-gray-400 text-gray-700 text-xs flex items-center justify-center">
                        {i + 1}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

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
                    <span className="text-gray-900 text-base leading-none">
                      +
                    </span>
                  </span>
                  <span className="text-sm">Add new poster</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewFiles}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Right: Inline-edit details */}
          <div className="col-span-12 md:col-span-7 p-4 sm:p-6 pt-16">
            <div className="space-y-5">
              <InlineRow
                label="Event"
                name="event_name"
                placeholder="Event name"
                maxLength={255}
              />

              {/* Date */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700">Date</label>
                <div className="flex-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      onKeyDown={handleDateKeyDown}
                      placeholder="e.g., 1 JAN 2026"
                      className="flex-1 h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]"
                    />
                    <button
                      type="button"
                      onClick={handleAddDate}
                      className="px-4 h-10 bg-[#f28fa5] text-white rounded-md hover:bg-[#f28fa5]/90 font-medium"
                    >
                      Add
                    </button>
                  </div>
                  {/* Display selected dates as tags */}
                  {selectedDates.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedDates.map((date, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-2 bg-[#f28fa5] text-white px-3 py-1 rounded-full text-sm"
                        >
                          <span>{date}</span>
                          <button
                            type="button"
                            onClick={() => removeDateTag(index)}
                            className="text-white hover:text-gray-200 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <InlineRow
                label="Time"
                name="event_time"
                placeholder="e.g, 18:00 - 19:00 PM"
                maxLength={101}
              />
              <InlineRow
                label="Location"
                name="event_location"
                placeholder="Venue or address"
                maxLength={255}
              />
              <InlineRow
                label="Sale Date"
                name="sale_date"
                placeholder="e.g, 1 July 2025 - 2 Sep 2025"
                maxLength={100}
              />

              {/* Price */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700">Price</label>
                <div className="flex-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      onKeyDown={handlePriceKeyDown}
                      placeholder="e.g., VIP-3000"
                      className="flex-1 h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]"
                    />
                    <button
                      type="button"
                      onClick={handleAddPrice}
                      className="px-4 h-10 bg-[#f28fa5] text-white rounded-md hover:bg-[#f28fa5]/90 font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {countWords(priceInput)}/{WORD_LIMITS.ticket_price} words
                  </div>
                  {/* Display selected prices as tags */}
                  {selectedPrices.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedPrices.map((price, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-2 bg-[#f28fa5] text-white px-3 py-1 rounded-full text-sm"
                        >
                          <span>{price}</span>
                          <button
                            type="button"
                            onClick={() => removePriceTag(index)}
                            className="text-white hover:text-gray-200 font-bold"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Category Select */}
              <div className="flex items-center gap-4">
                <label className="w-32 text-gray-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInput("category", e.target.value)}
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

              <div className="pt-2 flex flex-col gap-3">
                <button
                  onClick={updateEvent}
                  disabled={loading}
                  className={`w-full h-11 rounded-md text-white font-medium transition ${
                    loading
                      ? "bg-[#ee6786ff]/40 cursor-not-allowed"
                      : "bg-[#ee6786ff] hover:bg-[#ee6786ff]/90"
                  }`}
                >
                  {loading ? "Updating..." : "Save Changes"}
                </button>

                {status && (
                  <div className="text-sm mt-1 p-2 rounded bg-gray-50 border border-gray-200">
                    {status}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditEvent;
