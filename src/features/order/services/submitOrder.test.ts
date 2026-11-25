/**
 * El suplemento por urgencia lo decide la tienda (Dulce Flor, 25/11/2026): la
 * web no lo cobra nunca, y el kiosk solo si se marca. Que el pedido sea
 * urgente se sigue marcando igual: es lo que avisa al obrador.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { URGENT_ORDER_SURCHARGE_CENTS } from "@/config/business";
import type {
  OrderDraftDerived,
  OrderDraftState,
} from "@/features/order/state/OrderDraftContext";

import { submitOrder } from "./submitOrder";

// Sin almacenamiento ni base de datos: el pedido se devuelve tal cual llega.
vi.mock("@/services/orderRepository", () => ({
  orderRepository: {
    create: (draft: object) => ({
      ...draft,
      id: "id-1",
      publicId: "DF-2026-PRUEBA",
      createdAt: "2026-08-18T16:00:00.000Z",
      status: "pending",
    }),
  },
}));

/** Martes 18/08/2026 a las 18:00: el miércoles 19 es urgente; el sábado 22, no. */
const AHORA = new Date(2026, 7, 18, 18, 0, 0);

const BORRADOR: OrderDraftState = {
  customerType: "individual",
  items: [
    {
      id: "art-1",
      selection: {
        productId: "tres-leches",
        customerType: "individual",
        sizeId: "5-6",
        toppingIds: [],
        extraIds: [],
      },
      customization: {
        size: { id: "5-6", label: "5–6 porciones" },
        toppings: [],
        extras: [],
        boxAccepted: true,
        cinnamon: true,
      },
      quantity: 1,
    },
  ],
  fulfillmentType: "pickup",
  address: null,
  requestedDate: "2026-08-19",
  requestedTime: "12:00",
  customer: { name: "Ana", phone: "600000000" },
  reusableTray: false,
  urgencySurcharge: true,
  clientRequestId: "req-1",
};

function registrar(source: "web" | "kiosk", cambios: Partial<OrderDraftState> = {}) {
  const result = submitOrder({ ...BORRADOR, ...cambios }, {} as OrderDraftDerived, source);
  if (!result.ok) throw new Error(result.errors.join(" | "));
  return result.order;
}

describe("suplemento por urgencia: solo lo pone la tienda", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AHORA);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("la web no lo cobra nunca, aunque el borrador guardado lo pida", () => {
    const pedido = registrar("web");
    expect(pedido.urgent).toBe(true);
    expect(pedido.pricing.urgencySurchargeCents).toBeUndefined();
  });

  it("el kiosk lo cobra solo si se marca", () => {
    const conSuplemento = registrar("kiosk");
    const sinSuplemento = registrar("kiosk", { urgencySurcharge: false });
    expect(conSuplemento.pricing.urgencySurchargeCents).toBe(URGENT_ORDER_SURCHARGE_CENTS);
    expect(conSuplemento.pricing.totalCents - sinSuplemento.pricing.totalCents).toBe(
      URGENT_ORDER_SURCHARGE_CENTS
    );
    expect(sinSuplemento.pricing.urgencySurchargeCents).toBeUndefined();
    // Urgente sigue siéndolo: el aviso al obrador no depende del cobro.
    expect(sinSuplemento.urgent).toBe(true);
  });

  it("la tienda puede cobrarlo aunque el pedido no sea urgente", () => {
    const pedido = registrar("kiosk", { requestedDate: "2026-08-22" });
    expect(pedido.urgent).toBeUndefined();
    expect(pedido.pricing.urgencySurchargeCents).toBe(URGENT_ORDER_SURCHARGE_CENTS);
  });

  it("la canela de la tres leches llega al pedido", () => {
    expect(registrar("web").items[0].customization.cinnamon).toBe(true);
  });
});
