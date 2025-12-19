import { useState, useEffect } from "react";
import axios from "axios";
import { LuTrash2 } from "react-icons/lu";

function CategoriesManagement() {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryImage, setNewCategoryImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/api/categories/");
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
  }, []);

  const toBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim())
      return setError("Please enter a category name");

    try {
      setIsCreating(true);
      let payload = { category_name: newCategoryName };

      if (newCategoryImage) {
        const base64Image = await toBase64(newCategoryImage);
        payload.category_image = base64Image;
      }

      await axios.post("http://127.0.0.1:8000/api/categories/", payload);

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
    try {
      await axios.delete(`http://127.0.0.1:8000/api/categories/${id}/`);
      fetchCategories();
    } catch (err) {
      console.error(err);
      setError("Failed to delete category");
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
                    className="cursor-pointer flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-[#ee6786]"
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
                focus:ring-2 focus:ring-[#ee6786]/30 focus:border-[#ee6786] outline-none"
              />

              {/* Create Button */}
              <button
                type="submit"
                disabled={isCreating}
                className={`w-3/4 rounded-lg py-3 text-sm font-semibold text-white transition ${
                  isCreating
                    ? "bg-[#ee6786]/60 cursor-not-allowed"
                    : "bg-[#ee6786] hover:bg-[#d45573]"
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
                  {category.category_image && (
                    <img
                      src={category.category_image}
                      alt={category.category_name}
                      className="h-30 w-full object-cover"
                    />
                  )}
                  <div className="p-4 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 truncate">
                      {category.category_name}
                    </h3>
                    <button
                      onClick={() => deleteCategory(category.id)}
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

export default CategoriesManagement;
