import { useState } from "react";
import { validateHexColor } from "../utils/imageUtils";

interface ColorInputProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  defaultColor?: string;
}

export const ColorInput = ({
  value,
  onChange,
  label,
  defaultColor = "#F7F7F4",
}: ColorInputProps) => {
  const [error, setError] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setError("");

    if (!newColor) {
      onChange(defaultColor);
      return;
    }

    if (validateHexColor(newColor)) {
      onChange(newColor);
    } else {
      setError("Invalid hex color format");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#e0e0e0]">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={defaultColor}
          className={`flex-1 px-3 py-2.5 bg-[#333333] border rounded-md text-sm text-[#e0e0e0] font-mono focus:outline-none focus:border-[#3b82f6] ${error ? "border-[#ef4444]" : "border-[#404040]"}`}
        />
        <div
          className="w-10 h-10 rounded-md border border-[#404040] flex-shrink-0"
          style={{ backgroundColor: validateHexColor(value) ? value : defaultColor }}
        />
      </div>
      {error && <span className="text-xs text-[#ef4444]">{error}</span>}
    </div>
  );
};
