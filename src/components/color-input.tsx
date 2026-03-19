import { useState } from "react";
import { validateHexColor } from "../utils/image-utils";

interface ColorInputProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
  defaultColor?: string;
  hint?: string;
}

export const ColorInput = ({
  value,
  onChange,
  label,
  defaultColor = "#F7F7F4",
  hint,
}: ColorInputProps) => {
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalValue(newColor);
    setError("");

    if (validateHexColor(newColor)) {
      onChange(newColor);
    }
  };

  const handleBlur = () => {
    if (!localValue) {
      setLocalValue(defaultColor);
      onChange(defaultColor);
      setError("");
      return;
    }

    if (!validateHexColor(localValue)) {
      setError("Invalid hex color format (e.g. #FF0000)");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="text-sm font-medium text-cursor-text">{label}</label>
        {hint ? (
          <p className="mt-0.5 text-xs text-cursor-muted text-pretty m-0">{hint}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={defaultColor}
          className={`flex-1 px-3 py-2.5 bg-cursor-input border text-sm text-cursor-text font-mono tabular-nums focus:outline-none focus:border-cursor-accent ${error ? "border-red-500" : "border-cursor-border"}`}
        />
        <div
          className="w-10 h-10 border border-cursor-border flex-shrink-0"
          style={{ backgroundColor: validateHexColor(localValue) ? localValue : defaultColor }}
        />
      </div>
      {error && <span className="text-xs text-[#ef4444]">{error}</span>}
    </div>
  );
};
