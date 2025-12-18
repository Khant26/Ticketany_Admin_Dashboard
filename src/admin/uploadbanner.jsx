import { useState, useEffect } from "react";
import axios from "axios";
import { LuTrash2 } from "react-icons/lu";

function UploadBanner() {
  const [banners, setBanners] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fetchBanners = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/banners/");
      const sorted = res.data.sort((a, b) => a.order - b.order);
      setBanners(sorted);
    } catch {
      setError("Failed to fetch banners");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Please enter a banner title");
    if (!selectedImage) return setError("Please select an image");

    try {
      setIsUploading(true);
      const base64 = await toBase64(selectedImage);
      await axios.post("http://127.0.0.1:8000/api/banners/", {
        banner_name: title,
        banner_image: [base64],
      });

      setTitle("");
      setSelectedImage(null);
      setPreviewUrl(null);
      setError("");
      fetchBanners();
    } catch {
      setError("Failed to upload banner");
    } finally {
      setIsUploading(false);
    }
  };

  const removeBanner = async (id) => {
    if (!window.confirm("Delete this banner?")) return;
    await axios.delete(`http://127.0.0.1:8000/api/banners/${id}/`);
    fetchBanners();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Upload Form */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold mb-6 text-gray-900">
            Upload New Banner
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-6 items-start"
          >
            {/* LEFT SIDE */}
            <div className="space-y-8">
              {/* Upload Image Button */}
              <div>
                <input
                  id="banner-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setSelectedImage(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                />

                <label
                  htmlFor="banner-upload"
                  className="inline-flex items-center justify-center
          w-full py-3 rounded-lg border border-gray-300
          bg-gray-50 cursor-pointer text-sm font-medium text-gray-700
          hover:border-[#ee6786] hover:text-[#ee6786] transition"
                >
                  Upload Image
                </label>
              </div>

              {/* Banner Title */}
              <input
                type="text"
                placeholder="Enter banner title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-gray-300
        px-3 py-3 text-sm focus:ring-2 focus:ring-[#ee6786]/30
        focus:border-[#ee6786] outline-none"
              />

              {error && (
                <p className="text-sm font-medium text-red-500">{error}</p>
              )}

              {/* Upload Button */}
              <button
                type="submit"
                disabled={isUploading}
                className={`w-full rounded-lg py-3 text-sm font-semibold text-white transition ${
                  isUploading
                    ? "bg-[#ee6786]/60 cursor-not-allowed"
                    : "bg-[#ee6786] hover:bg-[#d45573]"
                }`}
              >
                {isUploading ? "Uploading..." : "Upload Banner"}
              </button>
            </div>

            {/* RIGHT SIDE — PREVIEW */}
            <div className="relative">
              {previewUrl ? (
                <>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-50 object-contain rounded-xl border"
                  />

                  {/* ❌ Remove */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full
            bg-black/60 text-white flex items-center justify-center
            hover:bg-black transition"
                    title="Remove image"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <div
                  className="h-50 w-3/4 flex items-center justify-center
        rounded-xl border border-dashed text-gray-400 text-sm"
                >
                  Image preview will appear here
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            All Banners ({banners.length})
          </h2>

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              Loading banners...
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No banners uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {banners.map((banner) => (
                <div
                  key={banner.id}
                  className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                >
                  <img
                    src={banner.banner_image[0]}
                    alt={banner.banner_name}
                    className="h-48 w-full object-cover"
                  />
                  <div className="p-4 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {banner.banner_name}
                    </h3>
                    <button
                      onClick={() => removeBanner(banner.id)}
                      className="p-2 rounded-md text-black hover:scale-105 transition-all"
                      title="Delete"
                    >
                      <LuTrash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadBanner;
