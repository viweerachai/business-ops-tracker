"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createBusinessDoc,
  deleteBusinessDoc,
  ensureDefaultBusinessDoc,
  seedDefaultCategories,
  setActiveBusinessDoc,
  subscribeBusinesses,
  updateBusinessDoc,
  useFirebaseUser
} from "@/lib/firebase/firestore";
import { formatFirestoreError } from "@/lib/firebase/errors";
import type { Business } from "@/lib/expenseTypes";

export function useBusinesses() {
  const { user, loading: authLoading, error: authError, hasSession } = useFirebaseUser();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setBusinesses([]);
      setActiveBusinessIdState(null);
      setLoading(false);
      setError(authError);
      return;
    }
    const currentUser = user;

    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    async function start() {
      try {
        setLoading(true);
        await ensureDefaultBusinessDoc(currentUser);
        await seedDefaultCategories(currentUser);
        if (cancelled) return;

        unsubscribe = subscribeBusinesses(
          currentUser,
          (nextState) => {
            if (cancelled) return;
            setBusinesses(nextState.businesses);
            setActiveBusinessIdState(nextState.activeBusinessId);
            setLoading(false);
            setError(null);
          },
          (err) => {
            if (cancelled) return;
            setError(formatFirestoreError(err));
            setLoading(false);
          }
        );
      } catch (err) {
        if (cancelled) return;
        setError(formatFirestoreError(err));
        setLoading(false);
      }
    }

    start();
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [authError, authLoading, user]);

  const activeBusiness = useMemo(
    () => businesses.find((business) => business.id === activeBusinessId) ?? businesses[0] ?? null,
    [activeBusinessId, businesses]
  );

  return {
    businesses,
    activeBusiness,
    activeBusinessId: activeBusiness?.id ?? null,
    user,
    isLoggedIn: Boolean(user && hasSession),
    loading: authLoading || loading,
    error,
    createBusiness: async (input: { ownerEmail?: string; name: string; phone?: string }) => {
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ Google ก่อนสร้างธุรกิจ");
      return createBusinessDoc(user, input);
    },
    updateBusiness: async (businessId: string, patch: { name?: string; phone?: string }) => {
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ Google ก่อนแก้ไขธุรกิจ");
      return updateBusinessDoc(user, businessId, patch);
    },
    deleteBusiness: async (businessId: string) => {
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ Google ก่อนลบธุรกิจ");
      return deleteBusinessDoc(user, businessId);
    },
    setActiveBusinessId: async (businessId: string) => {
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ Google ก่อนสลับธุรกิจ");
      return setActiveBusinessDoc(user, businessId);
    }
  };
}
