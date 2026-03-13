import React from "react";
import {
  Add20Regular,
  Subtract20Regular,
  BoxMultiple20Regular,
} from "@fluentui/react-icons";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { getBookImageUrl } from "../utils/dataStore";
import { formatWon } from "../utils/priceCalculator";
import type { Product } from "./ProductCard";

interface ProductListItemProps {
  product: Product;
  quantity: number;
  onQuantityChange: (id: string, qty: number) => void;
}

export function ProductListItem({ product, quantity, onQuantityChange }: ProductListItemProps) {
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
          ? "border-indigo-500 bg-indigo-50 shadow-[0_2px_12px_rgba(99,102,241,0.12)]"
          : "border-gray-200 bg-white hover:bg-gray-50"
      } overflow-hidden`}
    >
      {/* 데스크톱 레이아웃 */}
      <div className="hidden sm:flex items-center gap-3 p-3">
        {/* 이미지 */}
        <div className="relative w-20 h-[104px] rounded-lg overflow-hidden bg-gray-100/50 shrink-0">
          <ImageWithFallback
            src={product.imageUrl || getBookImageUrl(product.isbn)}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          {isSet && (
            <span className="absolute top-1 left-1 bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded">
              세트
            </span>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start gap-2">
            {!isSet && (
              <span className="text-gray-500 text-[11px] font-mono shrink-0 mt-0.5">
                {product.isbn}
              </span>
            )}
            <h4 className="text-gray-900 text-[14px] leading-tight font-medium">
              {product.name}
            </h4>
          </div>
          <p className="text-gray-500 text-[12px]">{product.publisher}</p>
          <div className="flex items-center gap-2 text-[13px] pt-1">
            <span className="text-gray-600 font-medium">정가</span>
            <span className="text-indigo-600 font-semibold">
              {formatWon(product.listPrice)}
            </span>
          </div>
        </div>

        {/* 수량 컨트롤 */}
        <div className="shrink-0 flex flex-col items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <span className="text-gray-400 text-[11px]">수량</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDecrease}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer active:scale-95"
            >
              <Subtract20Regular className="w-4 h-4" />
            </button>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={handleInputChange}
              onClick={(e) => e.stopPropagation()}
              className="w-12 h-8 text-center text-[14px] text-gray-900 font-bold rounded-lg border border-gray-200 bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/25 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={handleIncrease}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer active:scale-95"
            >
              <Add20Regular className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 레이아웃 (2줄 구조) */}
      <div className="sm:hidden p-2.5 space-y-1.5">
        {/* 1줄: 이미지 + 상품명 + 출판사 + 수량 */}
        <div className="flex items-center gap-2">
          <div className="relative w-10 h-13 rounded-md overflow-hidden bg-gray-100/50 shrink-0">
            <ImageWithFallback
              src={product.imageUrl || getBookImageUrl(product.isbn)}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {isSet && (
              <span className="absolute top-0.5 left-0.5 bg-indigo-500 text-white text-[7px] px-1 py-px rounded">
                세트
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-gray-900 text-[13px] leading-tight font-medium truncate">
              {product.name}
            </h4>
            <p className="text-gray-500 text-[10px]">{product.publisher}</p>
          </div>
          <div className="shrink-0 flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={handleDecrease}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 active:scale-95 cursor-pointer"
            >
              <Subtract20Regular className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={handleInputChange}
              onClick={(e) => e.stopPropagation()}
              className="w-9 h-7 text-center text-[13px] text-gray-900 font-bold rounded-md border border-gray-200 bg-white outline-none focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={handleIncrease}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 active:scale-95 cursor-pointer"
            >
              <Add20Regular className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {/* 2줄: 정가만 표시 */}
        <div className="flex items-center pl-12 text-[12px]">
          <span className="text-indigo-600 font-semibold">{formatWon(product.listPrice)}</span>
        </div>
      </div>

      {/* 세트 상품 — 단품 리스트 */}
      {isSet && product.setItemDetails && product.setItemDetails.length > 0 && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-2.5">
          <div className="flex items-center gap-1.5 mb-2">
            <BoxMultiple20Regular className="w-4 h-4 text-indigo-600" />
            <span className="text-[11px] text-indigo-700 font-semibold">세트 구성 ({product.setItemDetails.length}권)</span>
          </div>
          <div className="space-y-1.5">
            {product.setItemDetails.map((item, i) => (
              <div key={item.isbn || i} className="flex items-center gap-2 text-[12px] py-1 bg-white rounded-lg px-2 border border-gray-100">
                <span className="text-gray-500 w-5 text-right shrink-0">{i + 1}.</span>
                <span className="text-gray-500 font-mono text-[10px] shrink-0">{item.isbn}</span>
                <span className="text-gray-800 flex-1 min-w-0 truncate font-medium">{item.name}</span>
                <span className="text-gray-500 shrink-0 text-[11px]">{item.publisher}</span>
                <span className="text-gray-700 shrink-0 font-semibold">{formatWon(item.listPrice)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}