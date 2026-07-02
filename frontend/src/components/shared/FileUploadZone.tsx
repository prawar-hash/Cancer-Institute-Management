import React, { useState, useRef, DragEvent } from 'react';
import { Upload, Camera, CheckCircle, Trash2 } from 'lucide-react';
import Button from '../ui/Button.tsx';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
}

export default function FileUploadZone({ onFileSelect }: FileUploadZoneProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // 1. Drag & Drop Handlers
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  // 2. Camera Snapping Handlers
  const startCamera = async () => {
    setIsCameraActive(true);
    setSelectedFile(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Webcam access error:', err);
      setIsCameraActive(false);
      alert('Could not access webcam device.');
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera_capture_${Date.now()}.jpg`, {
              type: 'image/jpeg',
            });
            setSelectedFile(file);
            onFileSelect(file);
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      {!isCameraActive ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-[#0B63CE] bg-[#0B63CE]/5'
              : 'border-gray-300 bg-gray-50 hover:bg-gray-100/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.dcm"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              <CheckCircle className="h-10 w-10 text-emerald-500" />
              <p className="mt-3 text-sm font-semibold text-[#0E1116] truncate max-w-xs">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-400">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection} className="h-8 py-1 px-3 text-xs">
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-full bg-white p-3 shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
                <Upload className="h-6 w-6 text-[#0B63CE]" />
              </div>
              <p className="mt-4 text-sm font-semibold text-[#0E1116]">
                Drag & drop files here or <span className="text-[#0B63CE] underline">browse</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Supports PDF, PNG, JPG, JPEG, and DCM (Max 10MB)
              </p>
              <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                <Button variant="secondary" onClick={startCamera} className="h-9 py-1 px-4 text-xs font-semibold">
                  <Camera className="mr-1.5 h-4 w-4" /> Capture with Camera
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-gray-300 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="h-64 w-full object-cover transform scale-x-[-1]"
          />
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
            <Button variant="primary" onClick={captureSnapshot} className="h-9 text-xs py-1 px-4 shadow-lg">
              Capture Snapshot
            </Button>
            <Button variant="secondary" onClick={stopCamera} className="h-9 text-xs py-1 px-4 bg-white/20 text-white hover:bg-white/30 backdrop-blur border-none">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
