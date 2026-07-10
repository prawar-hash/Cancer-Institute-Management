import { useState } from "react";
import CameraCapture from "./CameraCapture";
import ImagePreview from "./ImagePreview";
import ImageCropper from "./ImageCropper";
import { useUploadImage } from "./useUploadImage";
import { toast } from "react-hot-toast";

export default function CameraFlow({ onUploadSuccess }: any) {
  const [step, setStep] = useState<"camera" | "preview" | "crop">("camera");
  const [image, setImage] = useState<string>("");
  const [openCamera, setOpenCamera] = useState(false);
  const { upload, loading } = useUploadImage();

  return (
    <div className="flex flex-col items-center gap-4">

      {/* STEP 1: OPEN BUTTON */}
      {!openCamera && (
        <button
          onClick={() => setOpenCamera(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Open Camera
        </button>
      )}

      {/* STEP 2: CAMERA */}
      {openCamera && step === "camera" && (
        <CameraCapture
          onCapture={(img) => {
            setImage(img);
            setStep("preview");
          }}
        />
      )}

      {/* STEP 3: PREVIEW */}
      {openCamera && step === "preview" && (
        <ImagePreview
          image={image}
          onRetake={() => {
            setStep("camera");
            setImage("");
          }}
          onUse={() => setStep("crop")}
        />
      )}

      {/* STEP 4: CROP + UPLOAD */}
      {openCamera && step === "crop" && (
        <ImageCropper
          image={image}
          onDone={async (blob) => {
            try {
              const url = await upload(blob); // 👈 GET URL

              onUploadSuccess(url); // 👈 SEND TO PARENT

              toast.success("Image uploaded successfully");

              // reset
              setStep("camera");
              setImage("");
              setOpenCamera(false);

            } catch {
              toast.error("Upload failed. Try again.");
            }
          }}
        />
      )}

      {/* Loading */}
      {loading && <p className="text-sm text-gray-500">Uploading...</p>}
    </div>
  );
}