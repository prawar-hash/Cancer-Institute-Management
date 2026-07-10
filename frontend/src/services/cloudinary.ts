export const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "upload_preset",
    "YOUR_UPLOAD_PRESET"
  );

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/fye4bvdk/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  return data.secure_url;
};