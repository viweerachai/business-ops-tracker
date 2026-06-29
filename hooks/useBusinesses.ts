"use client";

import { useMemo, useState } from "react";
import {
  MOCK_ACTIVE_BUSINESS_ID,
  MOCK_BUSINESSES,
  MOCK_USER
} from "@/lib/mockData";
import type { Business } from "@/lib/expenseTypes";

// ---------------------------------------------------------------------------
// Mock version — bypasses Firebase/auth entirely for demo purposes
// ---------------------------------------------------------------------------

export function useBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>(MOCK_BUSINESSES);
  const [activeBusinessId, setActiveBusinessIdState] = useState<string>(
    MOCK_ACTIVE_BUSINESS_ID
  );

  const activeBusiness = useMemo(
    () =>
      businesses.find((b) => b.id === activeBusinessId) ??
      businesses[0] ??
      null,
    [activeBusinessId, businesses]
  );

  return {
    businesses,
    activeBusiness,
    activeBusinessId: activeBusiness?.id ?? null,
    user: { uid: "mock-uid", email: MOCK_USER.email, displayName: MOCK_USER.name },
    isLoggedIn: true,
    loading: false,
    error: null,
    createBusiness: async (input: { ownerEmail?: string; name: string; phone?: string }) => {
      const newBusiness: Business = {
        id: `biz-${Date.now()}`,
        ownerEmail: input.ownerEmail ?? MOCK_USER.email,
        name: input.name,
        phone: input.phone,
        plan: "free",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setBusinesses((prev) => [...prev, newBusiness]);
    },
    updateBusiness: async (businessId: string, patch: { name?: string; phone?: string }) => {
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === businessId
            ? { ...b, ...patch, updatedAt: new Date().toISOString() }
            : b
        )
      );
    },
    deleteBusiness: async (businessId: string) => {
      setBusinesses((prev) => prev.filter((b) => b.id !== businessId));
    },
    setActiveBusinessId: async (businessId: string) => {
      setActiveBusinessIdState(businessId);
    }
  };
}
