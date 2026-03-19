import { useRef, useState } from "react";
import { toast } from "sonner";
import { fileToDataURL } from "../utils/image-utils";

interface ImageUploaderProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label: string;
  defaultImage?: string;
  /** When false and value is empty, do not show defaultImage in the preview slot */
  useDefaultWhenEmpty?: boolean;
  accept?: string;
  /** Muted helper under the label */
  hint?: string;
  /** Smaller drop zone for dense panels */
  compact?: boolean;
  /** Omit title + hint (e.g. when the parent renders them above a justify-between column) */
  hideLabel?: boolean;
  /** Used for `aria-label` on the drop zone when `hideLabel` is true */
  accessibilityLabel?: string;
}

export const ImageUploader = ({
  value,
  onChange,
  label,
  defaultImage,
  useDefaultWhenEmpty = true,
  accept = "image/*",
  hint,
  compact = false,
  hideLabel = false,
  accessibilityLabel,
}: ImageUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    
    if (!isImage && !isSvg) {
      toast.error("Choose an image or SVG file.");
      return;
    }

    try {
      const dataUrl = await fileToDataURL(file);
      onChange(dataUrl);
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Couldn’t read that file.");
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

  const defaultForDisplay =
    defaultImage !== undefined && defaultImage !== ""
      ? defaultImage
      : "/bn.png";
  const displayImage =
    value ?? (useDefaultWhenEmpty ? defaultForDisplay : null);

  const dropClass = compact
    ? "aspect-[8/5] max-h-[112px] min-h-[88px]"
    : "aspect-video";

  const dropAriaLabel = `${accessibilityLabel ?? label}: choose file`;

  return (
    <div className="flex flex-col gap-2">
      {!hideLabel ? (
        <div>
          <label className="text-sm font-medium text-cursor-text">{label}</label>
          {hint ? (
            <p className="mt-0.5 text-xs text-cursor-muted text-pretty m-0">
              {hint}
            </p>
          ) : null}
        </div>
      ) : null}
      <div
        className={`flex w-full cursor-pointer items-center justify-center overflow-hidden border-2 border-dashed bg-cursor-input/50 transition-colors ${dropClass} ${isDragging ? "border-cursor-accent bg-cursor-input" : "border-cursor-border hover:border-cursor-accent/70 hover:bg-cursor-input"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={dropAriaLabel}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="px-2 text-center text-xs text-cursor-muted">
            <span>
              {accept === "image/svg+xml"
                ? "Drop SVG or click"
                : "Drop image or click"}
            </span>
          </div>
        )}
      </div>
      <div className={`flex gap-2 ${compact ? "" : ""}`}>
        <button
          type="button"
          className={`flex-1 cursor-pointer border-none bg-cursor-accent text-sm font-medium text-white transition-colors hover:bg-cursor-accent-hover ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}
          onClick={() => fileInputRef.current?.click()}
        >
          {value ? "Replace" : "Choose file"}
        </button>
        {value && (
          <button
            type="button"
            className={`flex-1 cursor-pointer border border-cursor-border bg-transparent text-sm font-medium text-cursor-text transition-colors hover:border-cursor-muted hover:bg-cursor-hover ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}
            onClick={handleClear}
          >
            {useDefaultWhenEmpty ? "Reset" : "Clear"}
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
