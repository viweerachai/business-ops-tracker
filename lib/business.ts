import { expensesDb } from "@/lib/db";
import type { Business } from "@/lib/expenseTypes";
import { createId } from "@/lib/utils";

export const activeBusinessSettingKey = "activeBusinessId";

export type CreateBusinessInput = {
  ownerEmail: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function fallbackOwner(ownerEmail?: string | null) {
  return ownerEmail?.trim() || "local";
}

function makeBusiness(input: CreateBusinessInput): Business {
  const timestamp = nowIso();
  return {
    id: createId(),
    ownerEmail: fallbackOwner(input.ownerEmail),
    name: input.name.trim() || "ธุรกิจของฉัน",
    phone: input.phone?.trim() || undefined,
    avatarUrl: input.avatarUrl?.trim() || undefined,
    plan: "pro",
    createdAt: timestamp,
    updatedAt: timestamp,
    isActive: true
  };
}

export async function getActiveBusinessId() {
  const setting = await expensesDb.app_settings.get(activeBusinessSettingKey);
  return typeof setting?.value === "string" ? setting.value : null;
}

export async function setActiveBusinessId(businessId: string) {
  const timestamp = nowIso();
  await expensesDb.transaction("rw", expensesDb.businesses, expensesDb.app_settings, async () => {
    await expensesDb.businesses.toCollection().modify({ isActive: false });
    await expensesDb.businesses.update(businessId, {
      isActive: true,
      updatedAt: timestamp
    });
    await expensesDb.app_settings.put({
      key: activeBusinessSettingKey,
      value: businessId,
      updatedAt: timestamp
    });
  });
}

export async function createBusiness(input: CreateBusinessInput) {
  const business = makeBusiness(input);
  await expensesDb.businesses.put(business);
  await setActiveBusinessId(business.id);
  return business;
}

export async function updateBusiness(businessId: string, patch: Partial<Pick<Business, "name" | "phone" | "avatarUrl" | "plan">>) {
  await expensesDb.businesses.update(businessId, {
    ...patch,
    updatedAt: nowIso()
  });
}

export async function deleteBusiness(businessId: string) {
  await expensesDb.transaction("rw", expensesDb.businesses, expensesDb.app_settings, async () => {
    const setting = await expensesDb.app_settings.get(activeBusinessSettingKey);
    const activeId = typeof setting?.value === "string" ? setting.value : null;
    await expensesDb.businesses.delete(businessId);
    if (activeId === businessId) {
      const nextBusiness = await expensesDb.businesses.orderBy("createdAt").first();
      if (nextBusiness) {
        await expensesDb.app_settings.put({
          key: activeBusinessSettingKey,
          value: nextBusiness.id,
          updatedAt: nowIso()
        });
        await expensesDb.businesses.update(nextBusiness.id, { isActive: true });
      } else {
        await expensesDb.app_settings.delete(activeBusinessSettingKey);
      }
    }
  });
}

export async function ensureDefaultBusiness(ownerEmail?: string | null, userName?: string | null) {
  const owner = fallbackOwner(ownerEmail);
  const businesses = await expensesDb.businesses.toArray();
  let activeId = await getActiveBusinessId();
  let activeBusiness = activeId ? await expensesDb.businesses.get(activeId) : null;

  if (businesses.length === 0) {
    const expenseCount = await expensesDb.expenses.count();
    activeBusiness = await createBusiness({
      ownerEmail: owner,
      name: expenseCount > 0 ? "หมาชัย จำกัด" : userName ? `ธุรกิจของ ${userName}` : "ธุรกิจของฉัน",
      phone: expenseCount > 0 ? "0618292018" : undefined
    });
    activeId = activeBusiness.id;
  } else if (!activeBusiness) {
    activeBusiness = businesses[0];
    activeId = activeBusiness.id;
    await setActiveBusinessId(activeId);
  }

  if (!activeId) return null;

  await expensesDb.transaction("rw", expensesDb.expenses, expensesDb.expense_items, async () => {
    await expensesDb.expenses.filter((expense) => !expense.businessId).modify({ businessId: activeId });
    await expensesDb.expense_items.filter((item) => !item.businessId).modify({ businessId: activeId });
  });

  return expensesDb.businesses.get(activeId);
}
