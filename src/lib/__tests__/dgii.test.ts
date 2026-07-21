import { describe, it, expect } from "vitest";
import { tipoIdDgii, fechaDgii, montoDgii, docDgii, rangoMes, nombreArchivo, linea } from "../dgii";

describe("tipoIdDgii", () => {
  it("mapea cédula a 2", () => {
    expect(tipoIdDgii("cedula")).toBe("2");
  });
  it("mapea rnc_empresa y rnc_persona a 1", () => {
    expect(tipoIdDgii("rnc_empresa")).toBe("1");
    expect(tipoIdDgii("rnc_persona")).toBe("1");
  });
  it("usa 3 (pasaporte) por defecto para valores desconocidos", () => {
    expect(tipoIdDgii(undefined)).toBe("3");
    expect(tipoIdDgii(null)).toBe("3");
  });
});

describe("fechaDgii", () => {
  it("convierte YYYY-MM-DD a AAAAMMDD", () => {
    expect(fechaDgii("2026-07-21")).toBe("20260721");
  });
  it("devuelve vacío para valores nulos", () => {
    expect(fechaDgii(null)).toBe("");
    expect(fechaDgii(undefined)).toBe("");
  });
});

describe("montoDgii", () => {
  it("formatea con 2 decimales sin separador de miles", () => {
    expect(montoDgii(1234.5)).toBe("1234.50");
    expect(montoDgii("1000")).toBe("1000.00");
  });
  it("devuelve 0.00 para valores no numéricos o nulos", () => {
    expect(montoDgii(null)).toBe("0.00");
    expect(montoDgii(undefined)).toBe("0.00");
    expect(montoDgii("abc")).toBe("0.00");
  });
});

describe("docDgii", () => {
  it("deja solo dígitos", () => {
    expect(docDgii("131-12345-6")).toBe("131123456");
  });
  it("maneja null como cadena vacía", () => {
    expect(docDgii(null)).toBe("");
  });
});

describe("rangoMes", () => {
  it("calcula inicio, fin y periodoDgii de un mes de 31 días", () => {
    const r = rangoMes("2026-01");
    expect(r.inicio).toBe("2026-01-01");
    expect(r.fin).toBe("2026-01-31");
    expect(r.periodoDgii).toBe("202601");
  });
  it("calcula correctamente febrero en año no bisiesto", () => {
    const r = rangoMes("2026-02");
    expect(r.fin).toBe("2026-02-28");
  });
});

describe("nombreArchivo", () => {
  it("arma el nombre estándar DGII_{reporte}_{RNC}_{PERIODO}.txt", () => {
    expect(nombreArchivo("606", "131-12345-6", "202601")).toBe("DGII_606_131123456_202601.txt");
  });
  it("usa SIN_RNC si no hay documento", () => {
    expect(nombreArchivo("607", "", "202601")).toBe("DGII_607_SIN_RNC_202601.txt");
  });
});

describe("linea", () => {
  it("une campos con pipe y trata null/undefined como vacío", () => {
    expect(linea("A", 1, null, undefined, "B")).toBe("A|1|||B");
  });
});
