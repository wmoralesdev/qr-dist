import { useRef, useState } from "react";
import { fileToDataURL } from "../utils/imageUtils";

interface ImageUploaderProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label: string;
  defaultImage?: string;
  accept?: string;
}

export const ImageUploader = ({
  value,
  onChange,
  label,
  defaultImage = "/bn.png",
  accept = "image/*",
}: ImageUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    
    if (!isImage && !isSvg) {
      alert("Please select an image or SVG file");
      return;
    }

    try {
      const dataUrl = await fileToDataURL(file);
      onChange(dataUrl);
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Error reading file");
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClear = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const displayImage = value || (defaultImage ?? null);

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-[#e0e0e0]">{label}</label>
      <div
        className={`w-full aspect-video border-2 border-dashed rounded-lg bg-[#2a2a2a] flex items-center justify-center cursor-pointer transition-all overflow-hidden ${isDragging ? "border-[#3b82f6] bg-[#333333]" : "border-[#404040]"} hover:border-[#3b82f6] hover:bg-[#333333]`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center text-[#a0a0a0] text-sm">
            <span>{accept === "image/svg+xml" ? "Click or drag SVG here" : "Click or drag image here"}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 px-4 py-2.5 bg-[#3b82f6] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[#2563eb]"
          onClick={() => fileInputRef.current?.click()}
        >
          {value ? "Change Image" : "Upload Image"}
        </button>
        {value && (
          <button
            type="button"
            className="flex-1 px-4 py-2.5 bg-[#404040] text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[#525252]"
            onClick={handleClear}
          >
            {defaultImage ? "Reset to Default" : "Remove"}
          </button>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
};
