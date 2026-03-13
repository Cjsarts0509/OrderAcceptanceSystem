import { calculateTotalPrice } from "./priceCalculator";

export interface OrderProduct {
  id: string;
  isbn: string;
  name: string;
  publisher: string;
  listPrice: number;
  imageUrl: string;
  type: "single" | "set";
  setItems?: string[];
  quantity: number;
}

export interface OrderData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  zipCode: string;
  shippingAddress: string;
  shippingAddressDetail: string;
  products: OrderProduct[];
  paymentMethod: "card" | "bank";
  receiptType?: "none" | "personal" | "business";
  receiptNumber?: string;
  pin: string;
  totalListPrice: number;
  totalSalePrice: number;
  createdAt: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  trackingNumber?: string;
}

/**
 * 주문번호 자동 채번
 * 형식: ORD-YYYYMMDD-XXXXXX (랜덤 6자리)
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

/**
 * 주문 데이터 생성
 * 가격은 주문(장바구니) 총계 기준으로 계산
 */
export function createOrderData(params: {
  customerName: string;
  customerPhone: string;
  zipCode: string;
  shippingAddress: string;
  shippingAddressDetail: string;
  products: OrderProduct[];
  paymentMethod: "card" | "bank";
  receiptType?: "none" | "personal" | "business";
  receiptNumber?: string;
  pin: string;
}): OrderData {
  const totalListPrice = params.products.reduce((s, p) => s + p.listPrice * p.quantity, 0);
  
  // 주문 단위로 할인/학원지원금 계산
  const totalPrices = calculateTotalPrice(
    params.products.map((p) => ({ listPrice: p.listPrice, quantity: p.quantity }))
  );

  return {
    orderNumber: generateOrderNumber(),
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    zipCode: params.zipCode,
    shippingAddress: params.shippingAddress,
    shippingAddressDetail: params.shippingAddressDetail,
    products: params.products,
    paymentMethod: params.paymentMethod,
    receiptType: params.receiptType,
    receiptNumber: params.receiptNumber,
    pin: params.pin,
    totalListPrice,
    totalSalePrice: totalPrices.finalPrice,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
}
