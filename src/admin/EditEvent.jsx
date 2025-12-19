import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Data
  const [formData, setFormData] = useState({
    event_name: "",
    event_location: "",
    event_time: "",
    event_date: "",
    sale_date: "",
    ticket_price: "",
    category: "",
  });
  const [categories, setCategories] = useState([]);

  // Posters (existing + new) via a combined view
  // existingImages: array of base64/url strings from backend
  const [existingImages, setExistingImages] = useState([]);
  // newFiles: [{ file, preview }]
  const [newFiles, setNewFiles] = useState([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const fileInputRef = useRef(null);

  const IMAGE_SEPARATOR = "|||SEPARATOR|||";
  const MAX_FILES = 10;

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
      const res = await fetch("http://127.0.0.1:8000/api/categories/");
      if (!res.ok) return;
      const data = await res.json();
      setCategories(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEvent = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/events/${id}/`);
      if (!res.ok) return;
      const data = await res.json();

      setFormData({
        event_name: data.event_name || "",
        event_location: data.event_location || "",
        event_time: data.event_time || "",
        event_date: data.event_date || "",
        sale_date: data.sale_date || "",
        ticket_price: data.ticket_price || "",
        category: data.category || "",
      });

      if (data.event_image) {
        const arr = data.event_image.includes(IMAGE_SEPARATOR)
          ? data.event_image.split(IMAGE_SEPARATOR)
          : [data.event_image];
        setExistingImages(arr);
      } else {
        setExistingImages([]);
      }
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

  // Posters: combined view (existing first, then newly added)
  const posters = useMemo(
    () => [
      ...existingImages.map((url) => ({ kind: "existing", url })),
      ...newFiles.map((nf) => ({
        kind: "new",
        url: nf.preview,
        file: nf.file,
      })),
    ],
    [existingImages, newFiles]
  );

  const slotCount = useMemo(
    () => Math.max(6, posters.length || 0),
    [posters.length]
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
      if (it.kind === "existing") nextExisting.push(it.url);
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

    try {
      // Compress new files in current visual order
      const combined = posters;
      const compressedNew = [];
      for (const it of combined) {
        if (it.kind === "new" && it.file) {
          const base64 = await compressImage(it.file);
          compressedNew.push(base64);
        }
      }

      // Build final images in current order
      const finalImages = combined.map((it) =>
        it.kind === "existing" ? it.url : null
      );
      // Replace nulls (for new) with compressedNew in order encountered
      let ni = 0;
      for (let i = 0; i < finalImages.length; i++) {
        if (finalImages[i] === null) {
          finalImages[i] = compressedNew[ni++];
        }
      }

      const payload = {
        ...formData,
        ticket_price: formData.ticket_price
          ? String(formData.ticket_price)
          : null,
        event_image: finalImages.length
          ? finalImages.join(IMAGE_SEPARATOR)
          : null,
      };

      const res = await fetch(`http://127.0.0.1:8000/api/events/${id}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

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
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/events/${id}/`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setStatus(`❌ Failed to delete: ${JSON.stringify(data)}`);
      } else {
        navigate("/admin/events/all", { replace: true });
      }
    } catch (e) {
      setStatus("❌ Network error: " + e.message);
    }
  };

  const InlineRow = ({ label, name, placeholder }) => (
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
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type={name === "ticket_price" ? "text" : "text"}
              value={formData[name] ?? ""}
              placeholder={placeholder}
              onChange={(e) => handleInput(name, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && toggleEdit(name)}
              onBlur={() => toggleEdit(name)}
              className="w-full h-10 rounded-md border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#f28fa5]"
            />
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
              />
              <InlineRow
                label="Date"
                name="event_date"
                placeholder="12 Sep, 13 Sep..."
              />
              <InlineRow
                label="Time"
                name="event_time"
                placeholder="20:00 - 22:00"
              />
              <InlineRow
                label="Location"
                name="event_location"
                placeholder="Venue or address"
              />
              <InlineRow
                label="Sale Date"
                name="sale_date"
                placeholder="1 July 2025 - 2 Sep 2025"
              />
              <InlineRow
                label="Price"
                name="ticket_price"
                placeholder="1799 THB, 2599 THB, ..."
              />

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
                      ? "bg-[ee6786ff]/40 cursor-not-allowed"
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
