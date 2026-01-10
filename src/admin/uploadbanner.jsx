import { useState, useEffect } from "react";
import axios from "axios";
import { LuTrash2 } from "react-icons/lu";

function UploadBanner() {
  const API_BASE = "http://127.0.0.1:8000";

  const getToken = () =>
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [banners, setBanners] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fetchBanners = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/banners/`, {
        headers: authHeaders(),
      });
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

    if (!getToken()) return setError("Please login as admin to upload banners");

    try {
      setIsUploading(true);
      const base64 = await toBase64(selectedImage);
      await axios.post(
        `${API_BASE}/api/banners/`,
        {
          banner_name: title,
          banner_image: [base64],
        },
        { headers: authHeaders() }
      );

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
    if (!getToken()) return setError("Please login as admin to delete banners");
    try {
      await axios.delete(`${API_BASE}/api/banners/${id}/`, {
        headers: authHeaders(),
      });
      fetchBanners();
    } catch {
      setError("Failed to delete banner");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Upload Form */}
        <div className="bg-white max-w-full mx-auto rounded-2xl border border-gray-200 p-6">
          <div className="w-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Upload New Banner
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* PREVIEW BOX */}
              <div className="border border-dashed rounded-xl p-6 text-center relative">
                {/* Hidden input */}
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

                {!previewUrl ? (
                  <label
                    htmlFor="banner-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#ee6786]"
                  >
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      +
                    </div>
                    <p className="text-sm font-medium">
                      Click to upload banner image
                    </p>
                  </label>
                ) : (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-60 mx-auto rounded-lg border object-contain"
                    />

                    {/* Image URL */}
                    <p className="text-xs text-gray-500">
                      {selectedImage?.name} ·{" "}
                      {(selectedImage?.size / 1024).toFixed(1)} KB
                    </p>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        setPreviewUrl(null);
                      }}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>

              {/* Banner Title */}
              <input
                type="text"
                placeholder="Enter banner title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-3/4 rounded-lg border border-gray-300 px-3 py-3 text-sm
      focus:ring-2 focus:ring-[#ee6786]/30 focus:border-[#ee6786] outline-none"
              />

              {error && (
                <p className="text-sm font-medium text-red-500">{error}</p>
              )}

              {/* Upload Button */}
              <button
                type="submit"
                disabled={isUploading}
                className={`w-3/4 rounded-lg py-3 text-sm font-semibold text-white transition ${
                  isUploading
                    ? "bg-[#ee6786]/60 cursor-not-allowed"
                    : "bg-[#ee6786] hover:bg-[#d45573]"
                }`}
              >
                {isUploading ? "Uploading..." : "Upload Banner"}
              </button>
            </form>
          </div>
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
