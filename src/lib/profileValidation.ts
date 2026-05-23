// Validators for the local vault profile fields. Pure functions, no React,
// no I/O — they're used both by the form UI and by other services.

import { isValidCNP } from "@/services/docIntelligence";

export type FieldStatus = "empty" | "valid" | "invalid";

export type FieldResult = {
  status: FieldStatus;
  message?: string;
};

const OK: FieldResult = { status: "valid" };
const EMPTY: FieldResult = { status: "empty" };

export function validateCnp(value: string): FieldResult {
  const trimmed = value.trim();
  if (!trimmed) return EMPTY;
  if (!/^\d{13}$/.test(trimmed)) {
    return { status: "invalid", message: "CNP-ul are exact 13 cifre." };
  }
  if (!isValidCNP(trimmed)) {
    return {
      status: "invalid",
      message: "Cifra de control nu corespunde — verifică ce ai scris.",
    };
  }
  return OK;
}

export function validatePhone(value: string): FieldResult {
  const trimmed = value.trim();
  if (!trimmed) return EMPTY;
  // Accept "+40 7xx xxx xxx" or "07xx xxx xxx" with optional spaces / dashes.
  const digits = trimmed.replace(/[\s\-.()]/g, "");
  if (!/^(\+?40|0)\d{9}$/.test(digits)) {
    return {
      status: "invalid",
      message: "Format așteptat: +40 7xx xxx xxx sau 07xx xxx xxx.",
    };
  }
  return OK;
}

export function validateEmail(value: string): FieldResult {
  const trimmed = value.trim();
  if (!trimmed) return EMPTY;
  // Pragmatic email check — covers ~all real addresses, ignores RFC edge cases.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    return { status: "invalid", message: "Adresa de email nu pare validă." };
  }
  return OK;
}

export function validateBirthDate(value: string): FieldResult {
  if (!value) return EMPTY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { status: "invalid", message: "Dată invalidă." };
  }
  const now = new Date();
  if (date > now) {
    return { status: "invalid", message: "Data de naștere nu poate fi în viitor." };
  }
  const yearsAgo = now.getFullYear() - date.getFullYear();
  if (yearsAgo > 130) {
    return { status: "invalid", message: "Verifică anul." };
  }
  return OK;
}

export function validateAddress(value: string): FieldResult {
  const trimmed = value.trim();
  if (!trimmed) return EMPTY;
  // We expect at least a street + locality. Use a 10-char floor as a soft
  // signal; anything shorter is almost certainly incomplete.
  if (trimmed.length < 10) {
    return { status: "invalid", message: "Adresa pare incompletă — adaugă strada și localitatea." };
  }
  return OK;
}

export function validateFullName(value: string): FieldResult {
  const trimmed = value.trim();
  if (!trimmed) return EMPTY;
  if (trimmed.split(/\s+/).length < 2) {
    return {
      status: "invalid",
      message: "Introdu prenumele și numele.",
    };
  }
  return OK;
}
