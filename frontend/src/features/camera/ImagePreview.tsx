// src/features/camera/ImagePreview.tsx
import Button from "../../components/ui/Button";

interface Props {
  image: string;
  onRetake: () => void;
  onUse: () => void;
}

export default function ImagePreview({ image, onRetake, onUse }: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <img src={image} className="rounded-lg max-w-md" />

      <div className="flex gap-3">
        <Button variant="danger" onClick={onRetake}>
          Retake
        </Button>
        <Button onClick={onUse}>Use Photo</Button>
      </div>
    </div>
  );
}
