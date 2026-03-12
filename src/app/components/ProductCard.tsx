import React from "react";
import {
  CheckboxChecked24Filled,
  CheckboxUnchecked24Regular,
} from "@fluentui/react-icons";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getBookImageUrl } from "../utils/dataStore";

export interface Product {
  id: string;
  isbn: string;
  name: string;
  publisher: string;
  listPrice: number;
  salePrice: number;
  imageUrl: string;
  type: "single" | "set";
  setItems?: string[];
  setItemDetails?: { isbn: string; name: string; publisher: string; listPrice: number; salePrice: number }[];
}

interface ProductCardProps {
  product: Product;
  selected: boolean;
  onToggle: (id: string) => void;
}

function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export function ProductCard({ product, selected, onToggle }: ProductCardProps) {
  const discount = Math.round(
    ((product.listPrice - product.salePrice) / product.listPrice) * 100
  );

  return (
    <button
      type="button"
      onClick={() => onToggle(product.id)}
      className={`relative w-full text-left rounded-xl border transition-all duration-200 cursor-pointer ${
        selected
          ? "border-indigo-400/60 bg-indigo-50/40 shadow-[0_4px_20px_rgba(99,102,241,0.1)]"
          : "border-white/40 bg-white/30 hover:bg-white/50 hover:border-white/50"
      } backdrop-blur-md overflow-hidden`}
    >
      {/* 체크 아이콘 */}
      <div className="absolute top-1.5 right-1.5 z-10">
        {selected ? (
          <CheckboxChecked24Filled className="text-indigo-500 w-5 h-5" />
        ) : (
          <CheckboxUnchecked24Regular className="text-gray-300 w-5 h-5" />
        )}
      </div>

      {/* 이미지 */}
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
        {discount > 0 && (
          <span className="absolute bottom-1 left-1 bg-red-500 text-white text-[9px] px-1 py-0.5 rounded-md">
            -{discount}%
          </span>
        )}
      </div>

      {/* 정보 */}
      <div className="p-2 space-y-0.5">
        <h4 className="text-gray-800 text-[12px] truncate">{product.name}</h4>
        <p className="text-gray-400 text-[10px]">{product.publisher}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <span className="text-indigo-600 text-[13px]">
            {formatWon(product.salePrice)}
          </span>
        </div>
        <p className="text-gray-400 text-[10px] line-through">
          {formatWon(product.listPrice)}
        </p>
      </div>
    </button>
  );
}