import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";

function eventupload() {
  // Form state for event data
  const [formData, setFormData] = useState({
    event_name: "",
    event_location: "",
    event_time: "",
    event_date: "",
    sale_date: "",
    ticket_price: "",
    category: "",
  });

  // Image handling state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploadStatus, setUploadStatus] = useState("");
  const [loading, setLoading] = useState(false);

  // Date input state (for date tags)
  const [dateInput, setDateInput] = useState("");
  const [selectedDates, setSelectedDates] = useState([]);

  // Price input state (for price tags)
  const [priceInput, setPriceInput] = useState("");
  const [selectedPrices, setSelectedPrices] = useState([]);

  // Events display state
  const [events, setEvents] = useState([]);
  const [fetchingEvents, setFetchingEvents] = useState(false);

  // Categories state
  const [categories, setCategories] = useState([]);

  // Configuration constants
  const MAX_FILES = 10;
  const MAX_SIZE_MB = 5;
  const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api/";

  // Word limit configuration for each field
  const WORD_LIMITS = {
    event_name: 10,
    event_location: 15,
    event_time: 5,
    sale_date: 10,
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

  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const dragIndex = useRef(null);

  const getToken = () =>
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const authHeaders = (json = false) => {
    const token = getToken();
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    // Only set Content-Type for JSON requests, let browser handle FormData
    if (json) h["Content-Type"] = "application/json";
    return h;
  };

  // Fetch events and categories on component mount
  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, []);

  // Fetch categories from backend API
  const fetchCategories = async () => {
    try {
      const url = `${API_BASE}categories/`;
      console.log("Fetching categories from:", url);
      const response = await fetch(url, {
        headers: authHeaders(),
      });
      console.log("Categories response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Categories fetched successfully:", data);
        setCategories(data);
        // Set first category as default if no category is selected
        if (data.length > 0 && !formData.category) {
          setFormData((prev) => ({ ...prev, category: data[0].id }));
        }
      } else {
        const errorText = await response.text();
        console.error(
          `Failed to fetch categories. Status: ${response.status}`,
          errorText,
        );
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  // Fetch events from backend API
  const fetchEvents = async () => {
    setFetchingEvents(true);
    try {
      const url = `${API_BASE}events/`;
      console.log("Fetching events from:", url);
      const response = await fetch(url, {
        headers: authHeaders(),
      });
      console.log("Events response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Events fetched successfully:", data);
        setEvents(data);
      } else {
        const errorText = await response.text();
        console.error(
          `Failed to fetch events. Status: ${response.status}`,
          errorText,
        );
        setUploadStatus(`❌ Failed to fetch events (${response.status})`);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setUploadStatus("❌ Error fetching events: " + error.message);
    } finally {
      setFetchingEvents(false);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

  // Truncate long file names for display
  const truncateFileName = (fileName, maxLength = 30) => {
    if (!fileName || fileName.length <= maxLength) return fileName;

    const lastDot = fileName.lastIndexOf(".");
    const extension = lastDot > -1 ? fileName.slice(lastDot) : "";
    const base = lastDot > -1 ? fileName.slice(0, lastDot) : fileName;

    const keep = Math.floor((maxLength - extension.length - 3) / 2);
    const start = base.slice(0, keep);
    const end = base.slice(-keep);

    return `${start}...${end}${extension}`;
  };

  // Handle file selection with validation and deduplication
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    // Filter valid image files within size limit
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const withinSize = file.size <= MAX_SIZE_MB * 1024 * 1024;

      if (!isImage) {
        console.warn(`Skipped non-image file: ${file.name}`);
        return false;
      }
      if (!withinSize) {
        setUploadStatus(`File ${file.name} exceeds ${MAX_SIZE_MB}MB limit`);
        return false;
      }
      return true;
    });

    // Merge with existing files and remove duplicates
    const existingFiles = [...selectedFiles];
    const mergedFiles = [...existingFiles];

    validFiles.forEach((newFile) => {
      const isDuplicate = existingFiles.some(
        (existing) =>
          existing.name === newFile.name &&
          existing.size === newFile.size &&
          existing.lastModified === newFile.lastModified,
      );
      if (!isDuplicate) {
        mergedFiles.push(newFile);
      }
    });

    // Limit to MAX_FILES
    const finalFiles = mergedFiles.slice(0, MAX_FILES);
    if (mergedFiles.length > MAX_FILES) {
      setUploadStatus(`Limited to first ${MAX_FILES} images`);
    }

    setSelectedFiles(finalFiles);
    createPreviews(finalFiles);
  };

  // Create preview images for selected files
  const createPreviews = (files) => {
    const newPreviews = [];
    let loadedCount = 0;

    files.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newPreviews[index] = {
          url: e.target.result,
          name: file.name,
          size: file.size,
        };
        loadedCount++;
        if (loadedCount === files.length) {
          setPreviews([...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Remove image from selection
  const removeImage = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);

    setSelectedFiles(newFiles);
    setPreviews(newPreviews);

    // Clear input if no files remain
    if (newFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Compress image and convert to base64
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = (width * maxWidth) / height;
            height = maxWidth;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Fill with white background and draw image
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64 with compression
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  // Drag and drop reorder (from AddNewEvents design)
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

  // Derived for poster grid slots
  const slotCount = useMemo(
    () => Math.max(6, previews.length || 0),
    [previews.length],
  );

  // Convert empty strings to null for backend
  const toNullIfEmpty = (value) => {
    return value === "" ? null : value;
  };

  // Main upload function
  const uploadEvent = async () => {
    // Inline validation
    const errors = [];

    // Required field validation
    if (!formData.event_name?.trim()) {
      errors.push("Event name is required");
    }
    if (!formData.event_location?.trim()) {
      errors.push("Event location is required");
    }
    if (selectedDates.length === 0) {
      errors.push("At least one event date is required");
    }
    if (!formData.event_time) {
      errors.push("Event time is required");
    }
    if (!formData.category) {
      errors.push("Category is required");
    }
    if (selectedFiles.length === 0) {
      errors.push("At least one image is required");
    }
    if (selectedFiles.length > MAX_FILES) {
      errors.push(`Maximum ${MAX_FILES} images allowed`);
    }

    if (errors.length > 0) {
      setUploadStatus("❌ Validation errors:\n" + errors.join("\n"));
      return;
    }

    setLoading(true);
    setUploadStatus("Uploading event...");

    try {
      // Create FormData with proper backend format
      const formDataToSend = new FormData();

      // Add text fields exactly as Django expects
      formDataToSend.append("event_name", formData.event_name);
      formDataToSend.append("event_location", formData.event_location || "");
      formDataToSend.append("event_time", formData.event_time || "");

      // IMPORTANT: Handle JSONField types - Django expects JSON strings for these
      // Convert to proper JSON format
      if (selectedDates.length > 0) {
        // For event_date, send as a JSON array of dates
        formDataToSend.append("event_date", JSON.stringify(selectedDates));
        console.log("Sending event_date as:", JSON.stringify(selectedDates));
      } else {
        // Send null for empty event_date
        formDataToSend.append("event_date", JSON.stringify(null));
      }

      if (selectedPrices.length > 0) {
        // For ticket_price, send as a JSON array of prices
        formDataToSend.append("ticket_price", JSON.stringify(selectedPrices));
        console.log("Sending ticket_price as:", JSON.stringify(selectedPrices));
      } else {
        // Send null for empty ticket_price
        formDataToSend.append("ticket_price", JSON.stringify(null));
      }

      if (formData.sale_date) {
        formDataToSend.append("sale_date", formData.sale_date);
      }

      // IMPORTANT: Category as integer (foreign key)
      if (formData.category) {
        const categoryId = parseInt(formData.category, 10);
        formDataToSend.append("category", categoryId);
        console.log("Sending category as:", categoryId);
      }

      // Add image files (this part was correct)
      selectedFiles.forEach((file, index) => {
        formDataToSend.append("images", file);
        console.log(`Adding image ${index}:`, file.name, file.type);
      });

      // Debug: show all FormData entries
      console.log("=== Complete FormData being sent ===");
      for (let pair of formDataToSend.entries()) {
        console.log(`${pair[0]}:`, pair[1]);
      }

      await sendEventData(formDataToSend);
    } catch (error) {
      console.error("Error processing upload:", error);
      setUploadStatus("❌ Error uploading event: " + error.message);
      setLoading(false);
    }
  };

  // Send event data to backend
  const sendEventData = async (formDataToSend) => {
    try {
      setUploadStatus("Uploading to server...");

      const token = getToken();
      if (!token) {
        setUploadStatus("❌ Please login as admin to create events");
        navigate("/admin/login");
        return;
      }

      const response = await fetch(`${API_BASE}events/`, {
        method: "POST",
        headers: authHeaders(), // Don't set Content-Type for FormData
        body: formDataToSend, // Send FormData directly
      });

      if (response.status === 401 || response.status === 403) {
        setUploadStatus(
          "❌ Unauthorized/Forbidden (admin only). Please login again.",
        );
        navigate("/admin/login");
        return;
      }

      const contentType = response.headers.get("content-type");
      const responseData =
        contentType && contentType.includes("application/json")
          ? await response.json()
          : await response.text();

      if (response.ok) {
        setUploadStatus(
          `✅ Event "${formDataToSend.get("event_name")}" created successfully!`,
        );

        // Reset form
        setFormData({
          event_name: "",
          event_location: "",
          event_time: "",
          event_date: "",
          sale_date: "",
          ticket_price: "",
          category: categories.length > 0 ? categories[0].id : "",
        });
        setSelectedDates([]);
        setDateInput("");
        setSelectedPrices([]);
        setPriceInput("");
        setSelectedFiles([]);
        setPreviews([]);

        // Clear file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Refresh events list
        fetchEvents();
      } else {
        // Handle error responses with better error parsing
        let errorMsg = "Failed to create event";

        if (typeof responseData === "object" && responseData) {
          // Handle validation errors from Django
          const errors = [];
          Object.entries(responseData).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              errors.push(`${key}: ${value.join(", ")}`);
            } else {
              errors.push(`${key}: ${value}`);
            }
          });
          errorMsg =
            errors.length > 0
              ? errors.join("\\n")
              : JSON.stringify(responseData);
        } else if (typeof responseData === "string") {
          errorMsg = responseData;
        }

        setUploadStatus(`❌ ${errorMsg}`);
      }
    } catch (error) {
      console.error("Network error:", error);
      setUploadStatus("❌ Network error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete event function
  const deleteEvent = async (eventId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) {
      return;
    }

    const token = getToken();
    if (!token) {
      setUploadStatus("❌ Please login as admin to delete events");
      navigate("/admin/login");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}events/${eventId}/`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (response.status === 401 || response.status === 403) {
        setUploadStatus(
          "❌ Unauthorized/Forbidden (admin only). Please login again.",
        );
        navigate("/admin/login");
        return;
      }

      if (response.ok) {
        setUploadStatus("✅ Event deleted successfully");
        fetchEvents(); // Refresh list
      } else {
        setUploadStatus("❌ Failed to delete event");
      }
    } catch (error) {
      console.error("Delete error:", error);
      setUploadStatus("❌ Error deleting event: " + error.message);
    }
  };

  // Helper to get events for a specific category
  const getEventsForCategory = (categoryId) => {
    return events.filter((event) => event.category === categoryId);
  };

  // Helper to get cover image
  const getCoverImageForDisplay = (event) => {
    // Use the new images array structure with image_url
    if (event?.images?.length > 0) {
      return event.images[0].image_url; // Use image_url from EventImageSerializer
    }

    // Fallback for old event_image format
    if (event.event_image && typeof event.event_image === "string") {
      if (event.event_image.includes(IMAGE_SEPARATOR)) {
        const images = event.event_image.split(IMAGE_SEPARATOR);
        return images[0];
      } else {
        return event.event_image;
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen pt-6 pb-16">
      {/* Event Creation Form Section */}
      <div className="max-w-7xl mx-auto mb-12">
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
                      <span className="text-gray-900 text-base leading-none">
                        +
                      </span>
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
                  <div className="flex-1">
                    <input
                      type="text"
                      name="event_name"
                      value={formData.event_name}
                      onChange={handleInputChange}
                      maxLength={255}
                      className={`w-full h-10 rounded-md border ${
                        isWordLimitExceeded("event_name", formData.event_name)
                          ? "border-red-500"
                          : "border-gray-300"
                      } px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]`}
                    />
                    <div className="flex justify-between mt-1">
                      <div className="text-xs text-gray-500">
                        {formData.event_name.length}/255 characters
                      </div>
                      <div
                        className={`text-xs ${
                          isWordLimitExceeded("event_name", formData.event_name)
                            ? "text-red-500 font-semibold"
                            : "text-gray-500"
                        }`}
                      >
                        {countWords(formData.event_name)}/{WORD_LIMITS.event_name} words
                      </div>
                    </div>
                  </div>
                </div>

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

                {/* Time */}
                <div className="flex items-center gap-4">
                  <label className="w-32 text-gray-700">Time</label>
                  <div className="flex-1">
                    <input
                      type="text"
                      name="event_time"
                      value={formData.event_time}
                      onChange={handleInputChange}
                      maxLength={101}
                      placeholder="e.g., 18:00 - 19:00 PM"
                      className={`w-full h-10 rounded-md border ${
                        isWordLimitExceeded("event_time", formData.event_time)
                          ? "border-red-500"
                          : "border-gray-300"
                      } px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]`}
                    />
                    <div className="flex justify-between mt-1">
                      <div className="text-xs text-gray-500">
                        {formData.event_time.length}/101 characters
                      </div>
                      <div
                        className={`text-xs ${
                          isWordLimitExceeded("event_time", formData.event_time)
                            ? "text-red-500 font-semibold"
                            : "text-gray-500"
                        }`}
                      >
                        {countWords(formData.event_time)}/{WORD_LIMITS.event_time} words
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-center gap-4">
                  <label className="w-32 text-gray-700">Location</label>
                  <div className="flex-1">
                    <input
                      type="text"
                      name="event_location"
                      value={formData.event_location}
                      onChange={handleInputChange}
                      maxLength={255}
                      className={`w-full h-10 rounded-md border ${
                        isWordLimitExceeded("event_location", formData.event_location)
                          ? "border-red-500"
                          : "border-gray-300"
                      } px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]`}
                    />
                    <div className="flex justify-between mt-1">
                      <div className="text-xs text-gray-500">
                        {formData.event_location.length}/255 characters
                      </div>
                      <div
                        className={`text-xs ${
                          isWordLimitExceeded("event_location", formData.event_location)
                            ? "text-red-500 font-semibold"
                            : "text-gray-500"
                        }`}
                      >
                        {countWords(formData.event_location)}/{WORD_LIMITS.event_location} words
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sale Date */}
                <div className="flex items-center gap-4">
                  <label className="w-32 text-gray-700">Sale Date</label>
                  <div className="flex-1">
                    <input
                      type="text"
                      name="sale_date"
                      value={formData.sale_date}
                      onChange={handleInputChange}
                      maxLength={100}
                      placeholder="e.g., 1 DEC 2025"
                      className={`w-full h-10 rounded-md border ${
                        isWordLimitExceeded("sale_date", formData.sale_date)
                          ? "border-red-500"
                          : "border-gray-300"
                      } px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]`}
                    />
                    <div className="flex justify-between mt-1">
                      <div className="text-xs text-gray-500">
                        {formData.sale_date.length}/100 characters
                      </div>
                      <div
                        className={`text-xs ${
                          isWordLimitExceeded("sale_date", formData.sale_date)
                            ? "text-red-500 font-semibold"
                            : "text-gray-500"
                        }`}
                      >
                        {countWords(formData.sale_date)}/{WORD_LIMITS.sale_date} words
                      </div>
                    </div>
                  </div>
                </div>

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
                {/* Create button */}
                <div className="pt-4 flex items-center gap-4">
                  {/* spacer = label width */}
                  <div className="w-32"></div>

                  {/* button behaves like an input field */}
                  <div className="flex-1">
                    <button
                      onClick={uploadEvent}
                      disabled={!formData.event_name.trim() || loading}
                      className={`w-full h-11 rounded-md text-white font-medium transition ${
                        !formData.event_name.trim() || loading
                          ? "bg-[#ee6786ff] hover:bg-[#ee6786ff]/90 cursor-default"
                          : "bg-[#ee6786ff] hover:bg-[#ee6786ff]/90"
                      }`}
                    >
                      {loading ? "Creating Event..." : "Create Event"}
                    </button>
                  </div>
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

      {/* Events Display Section with Categories */}
      {events.length === 0 ? (
        <div className="max-w-full mx-auto px-4 text-center py-12">
          <p className="text-gray-600 text-lg">No events found</p>
          <p className="text-gray-500 text-sm mt-2">
            Create an event above to see it here
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-6 py-6  mx-auto max-w-7xl">
          {/* Events by Categories */}
          {categories.map((category) => {
            const categoryEvents = getEventsForCategory(category.id);
            if (categoryEvents.length === 0) return null;

            return (
              <div key={category.id} className="mb-16">
                <h3 className="text-2xl sm:text-2xl font-bold tracking-tight text-gray-900 mb-8">
                  {category.category_name}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {categoryEvents.map((event) => {
                    const coverImage = getCoverImageForDisplay(event);
                    // Use new images array for count, fallback to old format
                    const imageCount =
                      event?.images?.length > 0
                        ? event.images.length
                        : event.event_image
                          ? event.event_image.split(IMAGE_SEPARATOR).length
                          : 0;

                    return (
                      <button
                        key={event.id}
                        onClick={() =>
                          navigate(`/admin/events/${event.id}/edit`)
                        }
                        className="group relative block w-full rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 overflow-hidden text-left bg-white"
                      >
                        {/* Image */}
                        {coverImage ? (
                          <img
                            src={coverImage}
                            alt={event.event_name}
                            className="w-70 h-70 object-cover block"
                            onError={(e) => {
                              e.currentTarget.src =
                                "https://via.placeholder.com/400x256/e2e8f0/64748b?text=" +
                                encodeURIComponent(event.event_name);
                            }}
                          />
                        ) : (
                          <div className="w-full h-80 bg-gray-200 flex flex-col items-center justify-center text-gray-500">
                            <div className="text-lg font-bold">
                              {event.event_name}
                            </div>
                            <div className="text-sm">No Posters Available</div>
                          </div>
                        )}

                        {/* Image count badge */}
                        {imageCount > 0 && (
                          <div className="absolute top-3 right-3 bg-black/70 text-white rounded-full px-3 py-1 text-xs font-semibold">
                            {imageCount} {imageCount === 1 ? "image" : "images"}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex flex-col p-4 gap-2">
                          <div className="text-sm font-medium text-red-500">
                            {event.event_date}
                          </div>
                          <div className="text-md font-semibold text-gray-900">
                            {event.event_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {event.event_location}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default eventupload;
