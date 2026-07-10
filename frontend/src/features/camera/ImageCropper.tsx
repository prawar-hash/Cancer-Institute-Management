// src/features/camera/ImageCropper.tsx
import Cropper from "react-easy-crop";
import { useState } from "react";
import Button from "../../components/ui/Button";

interface Props {
  image: string;
  onDone: (cropped: Blob) => void;
}

export default function ImageCropper({ image, onDone }: Props) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleCrop = async () => {
    const res = await fetch(image);
    const blob = await res.blob();
    onDone(blob);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full h-64">
        <Cropper image={image} crop={crop} zoom={zoom} onCropChange={setCrop} onZoomChange={setZoom} />
      </div>

      <Button onClick={handleCrop}>Confirm Crop</Button>
    </div>
  );
}
