"use client";

export type VisionUsage = {
  todayKey: string;
  monthKey: string;
  callsToday: number;
  callsThisMonth: number;
  dailyLimit: number;
  monthlyLimit: number;
};

const dailyLimitKey = "receipt-reader-vision-daily-limit";
const monthlyLimitKey = "receipt-reader-vision-monthly-limit";
const defaultDailyLimit = 30;
const defaultMonthlyLimit = 900;

function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function numberFromStorage(key: string, fallback: number, options?: { min?: number }) {
  if (typeof window === "undefined") return fallback;
  const value = Number(localStorage.getItem(key));
  const min = options?.min ?? 0;
  return Number.isFinite(value) && value >= min ? value : fallback;
}

function usageKey(period: "day" | "month", key: string) {
  return `receipt-reader-vision-${period}-${key}`;
}

export function getVisionUsage(): VisionUsage {
  const todayKey = dateKey();
  const currentMonthKey = monthKey();
  return {
    todayKey,
    monthKey: currentMonthKey,
    callsToday: numberFromStorage(usageKey("day", todayKey), 0),
    callsThisMonth: numberFromStorage(usageKey("month", currentMonthKey), 0),
    dailyLimit: numberFromStorage(dailyLimitKey, defaultDailyLimit, { min: 1 }),
    monthlyLimit: numberFromStorage(monthlyLimitKey, defaultMonthlyLimit, { min: 1 })
  };
}

export function canCallVision(usage = getVisionUsage()) {
  return usage.callsToday < usage.dailyLimit && usage.callsThisMonth < usage.monthlyLimit;
}

export function incrementVisionUsage() {
  const usage = getVisionUsage();
  localStorage.setItem(usageKey("day", usage.todayKey), String(usage.callsToday + 1));
  localStorage.setItem(usageKey("month", usage.monthKey), String(usage.callsThisMonth + 1));
  return getVisionUsage();
}

export function setVisionLimits(dailyLimit: number, monthlyLimit: number) {
  localStorage.setItem(dailyLimitKey, String(Math.max(1, Math.floor(dailyLimit))));
  localStorage.setItem(monthlyLimitKey, String(Math.max(1, Math.floor(monthlyLimit))));
  return getVisionUsage();
}

export function resetVisionUsageCounters() {
  const usage = getVisionUsage();
  localStorage.removeItem(usageKey("day", usage.todayKey));
  localStorage.removeItem(usageKey("month", usage.monthKey));
  return getVisionUsage();
}
