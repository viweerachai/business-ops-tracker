"use client";

export type GeminiUsage = {
  todayKey: string;
  callsToday: number;
  dailyLimit: number;
};

const dailyLimitKey = "receipt-reader-gemini-daily-limit";
const defaultDailyLimit = 50;

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function numberFromStorage(key: string, fallback: number, options?: { min?: number }) {
  if (typeof window === "undefined") return fallback;
  const value = Number(localStorage.getItem(key));
  const min = options?.min ?? 0;
  return Number.isFinite(value) && value >= min ? value : fallback;
}

function usageKey(key: string) {
  return `receipt-reader-gemini-day-${key}`;
}

export function getGeminiUsage(): GeminiUsage {
  const todayKey = dateKey();
  return {
    todayKey,
    callsToday: numberFromStorage(usageKey(todayKey), 0),
    dailyLimit: numberFromStorage(dailyLimitKey, defaultDailyLimit, { min: 1 })
  };
}

export function canCallGemini(usage = getGeminiUsage()) {
  return usage.callsToday < usage.dailyLimit;
}

export function incrementGeminiUsage() {
  const usage = getGeminiUsage();
  localStorage.setItem(usageKey(usage.todayKey), String(usage.callsToday + 1));
  return getGeminiUsage();
}

export function setGeminiDailyLimit(dailyLimit: number) {
  localStorage.setItem(dailyLimitKey, String(Math.max(1, Math.floor(dailyLimit))));
  return getGeminiUsage();
}

export function resetGeminiUsageCounters() {
  const usage = getGeminiUsage();
  localStorage.removeItem(usageKey(usage.todayKey));
  return getGeminiUsage();
}
