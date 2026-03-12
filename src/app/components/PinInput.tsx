import React, { useRef } from "react";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function PinInput({ value, onChange }: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(4, "").split("").slice(0, 4);

  const handleChange = (index: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const arr = digits.slice();
    arr[index] = char;
    const next = arr.join("").replace(/ /g, "");
    onChange(next);
    if (char && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex items-center gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digits[i]?.trim() || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 rounded-xl border border-white/40 bg-white/40 backdrop-blur-sm text-center text-gray-700 text-[20px] outline-none transition-all focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/40"
        />
      ))}
    </div>
  );
}
