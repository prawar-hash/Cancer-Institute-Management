// src/features/camera/useUploadImage.ts
import { useState } from "react";
import api from "../../lib/api";

export function useUploadImage() {
  const [loading, setLoading] = useState(false);

  const upload = async (file: Blob) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "YOUR_UPLOAD_PRESET");

      // 1. Upload to Cloudinary
      const cloudRes = await fetch(
        "https://api.cloudinary.com/v1_1/fye4bvdk/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const cloudData = await cloudRes.json();

      // 2. Send URL to FastAPI
      await api.post("/api/v1/images", {
        image_url: cloudData.secure_url,
      });

      return cloudData.secure_url;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { upload, loading };
}