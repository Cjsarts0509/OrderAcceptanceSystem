export interface OrderProduct {
  id: string;
  isbn: string;
  name: string;
  publisher: string;
  listPrice: number;
  salePrice: number;
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
 * Supabase 연결 시 이 함수의 반환값을 DB에 insert
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
  const totalSalePrice = params.products.reduce((s, p) => s + p.salePrice * p.quantity, 0);

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
    totalSalePrice,
    createdAt: new Date().toISOString(),
    status: "pending",
  };
}