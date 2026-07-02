"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import type { Business } from "@/lib/expenseTypes";
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

type BusinessesState = {
  businesses: Business[];
  activeBusinessId: string | null;
  loading: boolean;
  error: string | null;
};

function getFallbackActiveBusinessId(businesses: Business[], activeBusinessId: string | null) {
  return businesses.find((business) => business.id === activeBusinessId)?.id ?? businesses[0]?.id ?? null;
}

function useBusinessesSubscription(user: User | null, enabled: boolean) {
  const [state, setState] = useState<BusinessesState>({
    businesses: [],
    activeBusinessId: null,
    loading: enabled,
    error: null
  });

  useEffect(() => {
    if (!enabled) {
      setState({
        businesses: [],
        activeBusinessId: null,
        loading: false,
        error: null
      });
      return;
    }

    if (!user) {
      setState({
        businesses: [],
        activeBusinessId: null,
        loading: false,
        error: null
      });
      return;
    }

    let unsubscribe: () => void = () => {};
    let cancelled = false;

    setState((current) => ({
      ...current,
      loading: true,
      error: null
    }));

    void (async () => {
      try {
        await ensureDefaultBusinessDoc(user);
        await seedDefaultCategories(user);

        if (cancelled) return;

        unsubscribe = subscribeBusinesses(
          user,
          ({ businesses, activeBusinessId }) => {
            setState({
              businesses,
              activeBusinessId: getFallbackActiveBusinessId(businesses, activeBusinessId),
              loading: false,
              error: null
            });
          },
          (error) => {
            setState((current) => ({
              ...current,
              loading: false,
              error: error.message
            }));
          }
        );
      } catch (error) {
        if (cancelled) return;
        setState((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : "โหลดข้อมูลธุรกิจไม่สำเร็จ"
        }));
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled, user]);

  return state;
}

export function useBusinesses() {
  const { user, loading: authLoading, error: authError, hasSession } = useFirebaseUser();
  const subscription = useBusinessesSubscription(user, true);

  const activeBusiness = useMemo(
    () =>
      subscription.businesses.find((business) => business.id === subscription.activeBusinessId) ??
      subscription.businesses[0] ??
      null,
    [subscription.activeBusinessId, subscription.businesses]
  );

  return {
    businesses: subscription.businesses,
    activeBusiness,
    activeBusinessId: activeBusiness?.id ?? null,
    user: user
      ? {
          uid: user.uid,
          email: user.email ?? "",
          displayName: user.displayName ?? user.email ?? "ผู้ใช้"
        }
      : null,
    isLoggedIn: hasSession,
    loading: authLoading || subscription.loading,
    error: authError ?? subscription.error,
    createBusiness: async (input: { name: string; phone?: string }) => {
      if (!user) {
        throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      }
      await createBusinessDoc(user, input);
    },
    updateBusiness: async (businessId: string, patch: { name?: string; phone?: string }) => {
      if (!user) {
        throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      }
      await updateBusinessDoc(user, businessId, patch);
    },
    deleteBusiness: async (businessId: string) => {
      if (!user) {
        throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      }

      const nextBusiness = subscription.businesses.find((business) => business.id !== businessId) ?? null;
      await deleteBusinessDoc(user, businessId);

      if (subscription.activeBusinessId === businessId && nextBusiness) {
        await setActiveBusinessDoc(user, nextBusiness.id);
      }
    },
    setActiveBusinessId: async (businessId: string) => {
      if (!user) {
        throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      }
      await setActiveBusinessDoc(user, businessId);
    }
  };
}
