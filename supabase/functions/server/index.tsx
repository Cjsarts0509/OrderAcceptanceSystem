import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const PREFIX = "/make-server-81c2c616";

// ─── Health ───
app.get(`${PREFIX}/health`, (c) => c.json({ status: "ok" }));

// ═══════════════════════════════════════════════
//  Products  (key: "book_products")
// ═══════════════════════════════════════════════
app.get(`${PREFIX}/products`, async (c) => {
  try {
    const data = await kv.get("book_products");
    return c.json({ data: data || [] });
  } catch (e) {
    console.log("GET /products error:", e);
    return c.json({ error: `Failed to get products: ${e}` }, 500);
  }
});

app.put(`${PREFIX}/products`, async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("book_products", body.data);
    return c.json({ ok: true });
  } catch (e) {
    console.log("PUT /products error:", e);
    return c.json({ error: `Failed to save products: ${e}` }, 500);
  }
});

// ═══════════════════════════════════════════════
//  Sets  (key: "book_sets")
// ═══════════════════════════════════════════════
app.get(`${PREFIX}/sets`, async (c) => {
  try {
    const data = await kv.get("book_sets");
    return c.json({ data: data || [] });
  } catch (e) {
    console.log("GET /sets error:", e);
    return c.json({ error: `Failed to get sets: ${e}` }, 500);
  }
});

app.put(`${PREFIX}/sets`, async (c) => {
  try {
    const body = await c.req.json();
    await kv.set("book_sets", body.data);
    return c.json({ ok: true });
  } catch (e) {
    console.log("PUT /sets error:", e);
    return c.json({ error: `Failed to save sets: ${e}` }, 500);
  }
});

// ═══════════════════════════════════════════════
//  Orders  (key per order: "book_order:{orderNumber}")
// ═══════════════════════════════════════════════

// Get ALL orders
app.get(`${PREFIX}/orders`, async (c) => {
  try {
    const data = await kv.getByPrefix("book_order:");
    return c.json({ data: data || [] });
  } catch (e) {
    console.log("GET /orders error:", e);
    return c.json({ error: `Failed to get orders: ${e}` }, 500);
  }
});

// Create a new order
app.post(`${PREFIX}/orders`, async (c) => {
  try {
    const body = await c.req.json();
    const order = body.data;
    if (!order || !order.orderNumber) {
      return c.json({ error: "Invalid order data: missing orderNumber" }, 400);
    }
    await kv.set(`book_order:${order.orderNumber}`, order);
    return c.json({ ok: true, orderNumber: order.orderNumber });
  } catch (e) {
    console.log("POST /orders error:", e);
    return c.json({ error: `Failed to create order: ${e}` }, 500);
  }
});

// Update an existing order
app.put(`${PREFIX}/orders/:orderNumber`, async (c) => {
  try {
    const orderNumber = c.req.param("orderNumber");
    const body = await c.req.json();
    const existing = await kv.get(`book_order:${orderNumber}`);
    if (!existing) {
      return c.json({ error: `Order not found: ${orderNumber}` }, 404);
    }
    const updated = { ...existing, ...body.data };
    await kv.set(`book_order:${orderNumber}`, updated);
    return c.json({ ok: true, data: updated });
  } catch (e) {
    console.log("PUT /orders/:orderNumber error:", e);
    return c.json({ error: `Failed to update order: ${e}` }, 500);
  }
});

// Lookup orders by phone + pin
app.post(`${PREFIX}/orders/lookup`, async (c) => {
  try {
    const { phone, pin } = await c.req.json();
    if (!phone || !pin) {
      return c.json({ error: "Phone and PIN are required" }, 400);
    }
    const allOrders = await kv.getByPrefix("book_order:");
    const matched = (allOrders || []).filter(
      (o: any) => o.customerPhone === phone && o.pin === pin
    );
    return c.json({ data: matched });
  } catch (e) {
    console.log("POST /orders/lookup error:", e);
    return c.json({ error: `Failed to lookup orders: ${e}` }, 500);
  }
});

// Delete an order
app.delete(`${PREFIX}/orders/:orderNumber`, async (c) => {
  try {
    const orderNumber = c.req.param("orderNumber");
    await kv.del(`book_order:${orderNumber}`);
    return c.json({ ok: true });
  } catch (e) {
    console.log("DELETE /orders/:orderNumber error:", e);
    return c.json({ error: `Failed to delete order: ${e}` }, 500);
  }
});

// ═══════════════════════════════════════════════
//  Send Order Confirmation Email (Resend API)
// ═══════════════════════════════════════════════
app.post(`${PREFIX}/send-order-email`, async (c) => {
  try {
    const { email, order } = await c.req.json();
    if (!email || !order) {
      return c.json({ error: "email and order are required" }, 400);
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured — skipping email send");
      return c.json({ ok: false, reason: "RESEND_API_KEY not configured" });
    }

    const productsHtml = (order.products || [])
      .map(
        (p: any) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#333;">${p.name}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;color:#666;">${p.quantity || 1}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;color:#4f46e5;">${Number(p.salePrice * (p.quantity || 1)).toLocaleString("ko-KR")}원</td>
          </tr>`
      )
      .join("");

    const htmlBody = `
      <div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#333;">
        <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 24px;border-radius:16px 16px 0 0;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;">주문이 접수되었습니다</h1>
          <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">교보문고 주문 확인</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
            <tr><td style="padding:6px 0;color:#888;width:90px;">주문번호</td><td style="padding:6px 0;font-family:monospace;color:#333;">${order.orderNumber}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">수신인</td><td style="padding:6px 0;">${order.customerName}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">연락처</td><td style="padding:6px 0;">${order.customerPhone}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">배송주소</td><td style="padding:6px 0;">[${order.zipCode || ""}] ${order.shippingAddress} ${order.shippingAddressDetail || ""}</td></tr>
            <tr><td style="padding:6px 0;color:#888;">결제수단</td><td style="padding:6px 0;">${order.paymentMethod === "card" ? "카드 결제" : "계좌 이체"}</td></tr>
          </table>
          <h3 style="font-size:15px;color:#333;margin:16px 0 8px;">주문 상품</h3>
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="background:#f9fafb;">
              <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500;">상품명</th>
              <th style="padding:8px 12px;text-align:center;color:#888;font-weight:500;">수량</th>
              <th style="padding:8px 12px;text-align:right;color:#888;font-weight:500;">금액</th>
            </tr></thead>
            <tbody>${productsHtml}</tbody>
          </table>
          <div style="margin-top:16px;padding:12px;background:#f5f3ff;border-radius:8px;text-align:right;">
            <span style="color:#888;font-size:13px;">결제 금액</span>
            <span style="margin-left:12px;color:#4f46e5;font-size:18px;font-weight:600;">${Number(order.totalSalePrice).toLocaleString("ko-KR")}원</span>
          </div>
          <div style="margin-top:20px;padding:16px;background:#fef3c7;border-radius:8px;text-align:center;">
            <p style="margin:0 0 4px;font-size:13px;color:#92400e;">주문 조회용 비밀번호</p>
            <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:8px;color:#92400e;font-family:monospace;">${order.pin}</p>
            <p style="margin:8px 0 0;font-size:11px;color:#b45309;">전화번호 + 이 비밀번호로 주문 조회/취소가 가능합니다.</p>
          </div>
        </div>
        <div style="padding:16px;text-align:center;color:#9ca3af;font-size:11px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;background:#fafafa;">
          본 메일은 발신 전용입니다. 문의사항은 교보문고 고객센터로 연락해 주세요.
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "교보문고 주문 <onboarding@resend.dev>",
        to: [email],
        subject: `[교보문고] 주문이 접수되었습니다 (${order.orderNumber})`,
        html: htmlBody,
      }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.log("Resend API error:", JSON.stringify(result));
      return c.json({ ok: false, error: `Resend API error: ${JSON.stringify(result)}` }, 500);
    }

    console.log("Order email sent successfully to:", email);
    return c.json({ ok: true, id: result.id });
  } catch (e) {
    console.log("POST /send-order-email error:", e);
    return c.json({ error: `Failed to send email: ${e}` }, 500);
  }
});

Deno.serve(app.fetch);