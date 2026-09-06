import { useState, useEffect } from "react";
import axios from "axios";
import { LuTrash2 } from "react-icons/lu";
import { FiEye, FiEyeOff, FiLoader } from "react-icons/fi";

function CategoriesManagement() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/';

  const getToken = () =>
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken");

  const authHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [togglingCategoryId, setTogglingCategoryId] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_BASE}categories/`, {
        headers: authHeaders(),
      });
      setCategories(res.data);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch categories");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- categories are loaded once on mount
  }, []);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim())
      return setError("Please enter a category name");

    if (!getToken()) return setError("Please login as admin to create categories");

    try {
      setIsCreating(true);
      // Use FormData with actual file (like events and banners)
      const formData = new FormData();
      formData.append('category_name', newCategoryName);

      if (newCategoryImage) {
        formData.append('category_image', newCategoryImage);
      }

      await axios.post(`${API_BASE}categories/`, formData, {
        headers: {
          ...authHeaders(),
          // Don't set Content-Type, let browser handle multipart/form-data
        },
      });

      setNewCategoryName("");
      setNewCategoryImage(null);
      setPreviewUrl(null);
      setError("");
      fetchCategories();
    } catch (err) {
      console.error(err);
      setError("Failed to create category");
    } finally {
      setIsCreating(false);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Delete this category?")) return;
    if (!getToken()) return setError("Please login as admin to delete categories");
    try {
      await axios.delete(`${API_BASE}categories/${id}/`, {
        headers: authHeaders(),
      });
      fetchCategories();
    } catch (err) {
      console.error(err);
      setError("Failed to delete category");
    }
  };

  const toggleCategoryHide = async (id) => {
    if (!getToken()) return setError("Please login as admin to toggle category");
    setTogglingCategoryId(id);
    try {
      await axios.post(`${API_BASE}categories/${id}/toggle_hide/`, null, {
        headers: authHeaders(),
      });
      await fetchCategories();
    } catch (err) {
      console.error(err);
      setError("Failed to toggle category visibility");
    } finally {
      setTogglingCategoryId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Create Category Form */}
        <div className="bg-white max-w-full mx-auto rounded-2xl border border-gray-200 p-6">
          <div className="w-xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">
              Create New Category
            </h2>

            <form onSubmit={handleCreateCategory} className="space-y-6">
              {/* Category Name */}

              {/* Preview Box */}
              <div className="border border-dashed rounded-xl p-6 text-center relative">
                {/* Hidden input */}
                <input
                  id="category-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setNewCategoryImage(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                />

                {!previewUrl ? (
                  <label
                    htmlFor="category-image-upload"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#f28fa5]"
                  >
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      +
                    </div>
                    <p className="text-sm font-medium">
                      Click to upload category image
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
                      {newCategoryImage?.name} ·{" "}
                      {(newCategoryImage?.size / 1024).toFixed(1)} KB
                    </p>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => {
                        setNewCategoryImage(null);
                        setPreviewUrl(null);
                      }}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Remove image
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-sm font-medium text-red-500">{error}</p>
              )}

              <input
                type="text"
                placeholder="Enter category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="w-3/4 rounded-lg border border-gray-300 px-3 py-3 text-sm
                focus:ring-2 focus:ring-[#f28fa5]/30 focus:border-[#f28fa5] outline-none"
              />

              {/* Create Button */}
              <button
                type="submit"
                disabled={isCreating}
                className={`w-3/4 rounded-lg py-3 text-sm font-semibold text-white transition ${
                  isCreating
                    ? "bg-[#f28fa5]/60 cursor-not-allowed"
                    : "bg-[#f28fa5] hover:bg-[#d45573]"
                }`}
              >
                {isCreating ? "Creating..." : "Create Category"}
              </button>
            </form>
          </div>
        </div>

        {/* Categories List */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            All Categories ({categories.length})
          </h2>

          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No categories found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                >
                  {category.category_image_url && (
                    <img
                      src={category.category_image_url}
                      alt={category.category_name}
                      className="h-30 w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://placehold.co/300x120/e2e8f0/666?text=" + encodeURIComponent(category.category_name || "Category");
                      }}
                    />
                  )}
                  <div className="p-4 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {category.category_name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleCategoryHide(category.id)}
                        className={`px-2 py-1 rounded-md text-sm inline-flex items-center gap-2 ${
                          category.is_hidden ? 'bg-green-50 text-green-800 hover:bg-green-100' : 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                        } ${togglingCategoryId === category.id ? 'opacity-80 cursor-wait' : ''}`}
                        title={category.is_hidden ? 'Unhide' : 'Hide'}
                      >
                        {togglingCategoryId === category.id ? (
                          <FiLoader className="w-4 h-4 animate-spin" />
                        ) : category.is_hidden ? (
                          <FiEyeOff className="w-4 h-4" />
                        ) : (
                          <FiEye className="w-4 h-4" />
                        )}
                        <span className="text-sm">{category.is_hidden ? 'Unhide' : 'Hide'}</span>
                      </button>

                      <button
                        onClick={() => deleteCategory(category.id)}
                        className="p-2 rounded-md text-black hover:scale-105 transition-all"
                        title="Delete"
                      >
                        <LuTrash2 size={18} />
                      </button>
                    </div>
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

export default CategoriesManagement;
