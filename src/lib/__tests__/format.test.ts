import { describe, it, expect } from "vitest";
import { validarRNC, validarCedula, today } from "../format";

describe("validarRNC", () => {
  it("acepta RNC de 9 dígitos o de 11 (cédula de compañía)", () => {
    expect(validarRNC("123456789")).toBe(true);
    expect(validarRNC("12345678901")).toBe(true);
  });
  it("ignora espacios y guiones", () => {
    expect(validarRNC("1-23456789")).toBe(true);
    expect(validarRNC("123 456 789")).toBe(true);
  });
  it("rechaza longitudes inválidas", () => {
    expect(validarRNC("12345")).toBe(false);
    expect(validarRNC("1234567890")).toBe(false);
  });
});

describe("validarCedula", () => {
  it("acepta cédula de 11 dígitos", () => {
    expect(validarCedula("00112345678")).toBe(true);
  });
  it("rechaza cédula con longitud distinta de 11", () => {
    expect(validarCedula("123")).toBe(false);
  });
});

describe("today", () => {
  it("devuelve la fecha en formato YYYY-MM-DD", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
