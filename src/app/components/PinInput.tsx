import React, { useRef, useEffect } from "react";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: () => void;
  inputId?: string;
}

export function PinInput({ value, onChange, onComplete, inputId }: PinInputProps) {
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
    if (char && index === 3) {
      onComplete?.();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /** 외부에서 첫 번째 입력으로 포커스할 수 있도록 */
  const focusFirst = () => inputRefs.current[0]?.focus();

  useEffect(() => {
    if (inputId) {
      const el = document.getElementById(inputId);
      if (el) {
        (el as any).__pinFocus = focusFirst;
      }
    }
  });

  return (
    <div className="flex items-center gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          id={i === 0 && inputId ? inputId : undefined}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={digits[i]?.trim() || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-12 h-14 rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm text-center text-gray-900 text-[20px] font-bold outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25"
        />
      ))}
    </div>
  );
}