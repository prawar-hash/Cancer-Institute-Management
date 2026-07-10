// src/features/camera/CameraCapture.tsx

import Webcam from "react-webcam";
import { useRef, useState } from "react";
import Button from "../../components/ui/Button";

interface Props {
  onCapture: (image: string) => void;
}

export default function CameraCapture({ onCapture }: Props) {
  const webcamRef = useRef<Webcam>(null);

  const [error, setError] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();

    if (imageSrc) {
      setCapturedImage(imageSrc);
    }
  };

  const retake = () => {
    setCapturedImage(null);
  };

  const usePhoto = () => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">

      {error && (
        <p className="text-red-500 text-sm">
          {error}
        </p>
      )}

      {!capturedImage ? (
        <>
          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            screenshotQuality={0.9}
            onUserMediaError={() =>
              setError("Camera permission denied")
            }
            className="rounded-lg w-full max-w-md"
          />

          <Button onClick={capture}>
            📷 Capture
          </Button>
        </>
      ) : (
        <>
          <img
            src={capturedImage}
            alt="Captured preview"
            className="rounded-lg w-full max-w-md"
          />

          <div className="flex gap-4">

            <Button onClick={retake}>
              ❌ Retake
            </Button>

            <Button onClick={usePhoto}>
              ✅ Use Photo
            </Button>

          </div>
        </>
      )}

    </div>
  );
}