import React from "react";
import {
  CheckboxChecked24Filled,
  CheckboxUnchecked24Regular,
} from "@fluentui/react-icons";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getBookImageUrl } from "../utils/dataStore";
import { formatWon } from "../utils/priceCalculator";

export interface Product {
  id: string;
  isbn: string;
  name: string;
  publisher: string;
  listPrice: number;
  imageUrl: string;
  type: "single" | "set";
  setItems?: string[];
  setItemDetails?: { isbn: string; name: string; publisher: string; listPrice: number }[];
}

interface ProductCardProps {
  product: Product;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function ProductCard({ product, selected, onToggle }: ProductCardProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(product.id)}
      className={`relative w-full text-left rounded-xl border transition-all duration-200 cursor-pointer ${
        selected
          ? "border-indigo-500 bg-indigo-50 shadow-[0_4px_20px_rgba(79,70,229,0.15)] ring-1 ring-indigo-500/20"
          : "border-gray-200 bg-white/60 hover:bg-white/80 hover:border-gray-300"
      } backdrop-blur-md overflow-hidden`}
    >
      <div className="absolute top-1.5 right-1.5 z-10">
        {selected ? (
          <CheckboxChecked24Filled className="text-indigo-600 w-5 h-5" />
        ) : (
          <CheckboxUnchecked24Regular className="text-gray-300 w-5 h-5" />
        )}
      </div>

      <div className="relative w-full aspect-[3/4] bg-gray-100/50">
        <ImageWithFallback
          src={product.imageUrl || getBookImageUrl(product.isbn)}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {product.type === "set" && (
          <span className="absolute top-1 left-1 bg-indigo-500 text-white text-[8px] px-1.5 py-0.5 rounded-md">
            세트
          </span>
        )}
      </div>

      <div className="p-2 space-y-0.5">
        <h4 className="text-gray-900 text-[12px] truncate font-semibold">{product.name}</h4>
        <p className="text-gray-600 text-[10px]">{product.publisher}</p>
        <p className="text-gray-500 text-[9px] font-mono">ISBN: {product.isbn}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-indigo-700 text-[13px] font-bold">
            {formatWon(product.listPrice)}
          </span>
        </div>
      </div>
    </button>
  );
}