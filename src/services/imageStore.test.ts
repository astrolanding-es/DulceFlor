/**
 * La subida de la imagen de referencia al Storage depende de dos piezas puras
 * y fáciles de romper sin darse cuenta: la ruta del archivo y la conversión
 * del data URL a Blob. El resto (red, sesión) se prueba a mano contra Supabase.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  dataUrlToBlob,
  enqueueImageUpload,
  flushImageUploads,
  getImage,
  remoteImagePath,
} from "./imageStore";

const upload = vi.fn();
vi.mock("./supabase", () => ({
  isSupabaseConfigured: () => true,
  getSupabase: async () => ({ storage: { from: () => ({ upload }) } }),
}));

/**
 * El navegador da unos 5 MB por web y cada foto ocupa unos 200 K. La tablet de
 * la tienda se llenó en noviembre de 2026 con las fotos de pedidos ya subidos,
 * y dejó de aceptar productos con foto. De ahí la regla: foto que está a salvo
 * en el servidor, foto que se borra del dispositivo. Y solo entonces.
 */
describe("flushImageUploads libera el dispositivo", () => {
  const FOTO = "data:image/jpeg;base64,YWJj";
  const clave = (id: string) => `dulce-flor:ref-image:${id}`;

  beforeEach(() => {
    const datos = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
      removeItem: (k: string) => void datos.delete(k),
    });
    upload.mockReset();
  });

  it("borra la copia local cuando la subida va bien", async () => {
    localStorage.setItem(clave("a"), FOTO);
    enqueueImageUpload("a");
    upload.mockResolvedValue({ error: null });
    await flushImageUploads();
    expect(upload).toHaveBeenCalledTimes(1);
    expect(getImage("a")).toBeNull();
    expect(localStorage.getItem("dulce-flor:ref-images-pending")).toBe("[]");
  });

  it("también la de un pedido antiguo que ya estaba subida y no está en la cola", async () => {
    localStorage.setItem(clave("vieja"), FOTO);
    upload.mockResolvedValue({ error: { message: "The resource already exists" } });
    await flushImageUploads(["vieja"]);
    expect(getImage("vieja")).toBeNull();
  });

  it("no borra nada si la subida falla: es la única copia", async () => {
    localStorage.setItem(clave("b"), FOTO);
    localStorage.setItem(clave("c"), FOTO);
    enqueueImageUpload("b");
    upload
      .mockResolvedValueOnce({ error: { message: "Failed to fetch" } })
      // Contiene «exist» pero no es un «ya existe»: no puede contar como subida.
      .mockResolvedValueOnce({ error: { message: "The related resource does not exist" } });
    await flushImageUploads(["c"]);
    expect(getImage("b")).toBe(FOTO);
    expect(getImage("c")).toBe(FOTO);
    expect(localStorage.getItem("dulce-flor:ref-images-pending")).toBe('["b"]');
  });
});

describe("remoteImagePath", () => {
  it("usa el id como nombre de archivo .jpg", () => {
    expect(remoteImagePath("abc-123")).toBe("abc-123.jpg");
  });
});

describe("dataUrlToBlob", () => {
  it("reconstruye los bytes y el tipo desde un data URL", async () => {
    // "abc" en base64 es "YWJj" (3 bytes).
    const blob = dataUrlToBlob("data:image/jpeg;base64,YWJj");
    expect(blob.type).toBe("image/jpeg");
    expect(blob.size).toBe(3);
    expect(await blob.text()).toBe("abc");
  });

  it("respeta el tipo declarado (png)", () => {
    const blob = dataUrlToBlob("data:image/png;base64,YWJj");
    expect(blob.type).toBe("image/png");
  });

  it("cae a image/jpeg si el encabezado no trae tipo", () => {
    const blob = dataUrlToBlob("data:;base64,YWJj");
    expect(blob.type).toBe("image/jpeg");
  });
});
