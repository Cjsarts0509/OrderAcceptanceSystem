import React from "react";
import {
  Add20Regular,
  Subtract20Regular,
  BoxMultiple20Regular,
} from "@fluentui/react-icons";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getBookImageUrl } from "../utils/dataStore";
import type { Product } from "./ProductCard";

interface ProductListItemProps {
  product: Product;
  quantity: number;
  onQuantityChange: (id: string, qty: number) => void;
}

function formatWon(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

export function ProductListItem({ product, quantity, onQuantityChange }: ProductListItemProps) {
  const discount = product.listPrice > 0
    ? Math.round(((product.listPrice - product.salePrice) / product.listPrice) * 100)
    : 0;
  const isSet = product.type === "set";
  const isSelected = quantity > 0;

  const handleIncrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(product.id, quantity + 1);
  };

  const handleDecrease = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(product.id, Math.max(0, quantity - 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseInt(e.target.value, 10);
    onQuantityChange(product.id, isNaN(val) || val < 0 ? 0 : val);
  };

  const handleRowClick = () => {
    if (quantity === 0) {
      onQuantityChange(product.id, 1);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`rounded-xl border transition-all duration-200 cursor-pointer ${
        isSelected
          ? "border-indigo-400/60 bg-indigo-50/30 shadow-[0_2px_12px_rgba(99,102,241,0.08)]"
          : "border-white/40 bg-white/25 hover:bg-white/40"
      } backdrop-blur-sm overflow-hidden`}
    >
      {/* 메인 행 */}
      <div className="flex items-center gap-3 p-2.5">
        {/* 이미지 */}
        <div className="relative w-14 h-[72px] rounded-lg overflow-hidden bg-gray-100/50 shrink-0">
          <ImageWithFallback
            src={product.imageUrl || getBookImageUrl(product.isbn)}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {isSet && (
            <span className="absolute top-0.5 left-0.5 bg-indigo-500 text-white text-[7px] px-1 py-[1px] rounded">
              세트
            </span>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <h4 className="text-gray-800 text-[13px] leading-tight truncate">{product.name}</h4>
          <p className="text-gray-400 text-[11px]">{product.publisher}</p>
          <div className="flex items-center gap-2">
            {discount > 0 && (
              <span className="text-red-500 text-[11px] font-medium">-{discount}%</span>
            )}
            <span className="text-indigo-600 text-[13px] font-medium">
              {formatWon(product.salePrice)}
            </span>
            {discount > 0 && (
              <span className="text-gray-400 text-[11px] line-through">
                {formatWon(product.listPrice)}
              </span>
            )}
          </div>
        </div>

        {/* 수량 컨트롤 */}
        <div className="shrink-0 flex flex-col items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <span className="text-gray-400 text-[10px]">수량</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleDecrease}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/50 bg-white/40 text-gray-500 hover:bg-white/70 transition-colors cursor-pointer active:scale-95"
            >
              <Subtract20Regular className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={handleInputChange}
              onClick={(e) => e.stopPropagation()}
              className="w-10 h-7 text-center text-[13px] text-gray-700 rounded-lg border border-white/50 bg-white/40 outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={handleIncrease}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-white/50 bg-white/40 text-gray-500 hover:bg-white/70 transition-colors cursor-pointer active:scale-95"
            >
              <Add20Regular className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 세트 상품 — 단품 리스트 */}
      {isSet && product.setItemDetails && product.setItemDetails.length > 0 && (
        <div className="border-t border-white/30 bg-white/10 px-3 py-1.5">
          <div className="flex items-center gap-1 mb-1">
            <BoxMultiple20Regular className="w-3 h-3 text-indigo-400" />
            <span className="text-[10px] text-indigo-500">세트 구성 ({product.setItemDetails.length}권)</span>
          </div>
          <div className="space-y-0.5">
            {product.setItemDetails.map((item, i) => (
              <div key={item.isbn || i} className="flex items-center gap-2 text-[11px] py-0.5">
                <span className="text-gray-400 w-4 text-right shrink-0">{i + 1}.</span>
                <span className="text-gray-600 truncate flex-1">{item.name}</span>
                <span className="text-gray-400 shrink-0">{item.publisher}</span>
                <span className="text-gray-500 shrink-0">{formatWon(item.salePrice)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
