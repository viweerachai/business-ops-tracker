"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut as firebaseSignOut,
  updateProfile,
  type User
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Unsubscribe
} from "firebase/firestore";
import { getFirebaseAuth, getFirestoreDb, hasFirebaseConfig } from "@/lib/firebase/client";
import type { FirestoreBusiness, FirestoreExpense, FirestoreExpenseItem } from "@/lib/firebase/types";
import type { Business, Expense, ExpenseItem, ProductCatalogSourceItem } from "@/lib/expenseTypes";
import { CATEGORIES } from "@/lib/types/receipt";
import { createId } from "@/lib/utils";

type AuthUserRef = {
  uid: string;
};

let firebaseAuthSyncInFlight: Promise<User | null> | null = null;
let firebaseAuthSyncInFlightKey: string | null = null;
let firebaseAuthSyncPaused = false;

function tokenDebug(value: string | undefined) {
  return value ? { present: true, length: value.length } : { present: false, length: 0 };
}

export function pauseFirebaseAuthSync(reason = "unknown") {
  firebaseAuthSyncPaused = true;
  console.log("[firebase-auth] sync paused", { reason });
}

export function resumeFirebaseAuthSync(reason = "unknown") {
  firebaseAuthSyncPaused = false;
  console.log("[firebase-auth] sync resumed", { reason });
}

function formatFirebaseAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : "Firebase login failed";
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";

  if (code.includes("auth/invalid-credential") || message.includes("INVALID_IDP_RESPONSE")) {
    return "Firebase ไม่รับ Google token นี้ กรุณาตรวจ Google provider ใน Firebase และลองเข้าสู่ระบบใหม่";
  }
  if (code.includes("auth/operation-not-allowed")) {
    return "Firebase Google sign-in ยังไม่ถูกเปิดใช้งานในโปรเจกต์นี้";
  }
  if (code.includes("auth/unauthorized-domain")) {
    return "โดเมนนี้ยังไม่ได้รับอนุญาตใน Firebase Authentication";
  }

  return message;
}

function timestampToIso(value: unknown) {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  return new Date().toISOString();
}

export function businessPath(uid: string, businessId: string) {
  return `users/${uid}/businesses/${businessId}`;
}

export function expensePath(uid: string, businessId: string, expenseId: string) {
  return `users/${uid}/businesses/${businessId}/expenses/${expenseId}`;
}

export function appSettingsPath(uid: string) {
  return `users/${uid}/settings/app`;
}

function db() {
  return getFirestoreDb();
}

function defaultBusinessName(user: User) {
  return user.displayName ? `ธุรกิจของ ${user.displayName}` : user.email ? `ธุรกิจของ ${user.email}` : `ธุรกิจของ ${user.uid}`;
}

function businessPayload(user: User, businessId: string, input: { name: string; phone?: string }) {
  return {
    id: businessId,
    ownerUid: user.uid,
    ownerEmail: user.email ?? user.uid ?? "",
    name: input.name.trim() || defaultBusinessName(user),
    phone: input.phone?.trim() || "",
    businessType: "shop" as const,
    taxId: "",
    branchName: "",
    branchCode: "",
    address: "",
    color: "#2563eb",
    plan: "pro" as const,
    googleDriveCompanyFolderId: "",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

export function mapBusinessDoc(data: FirestoreBusiness): Business {
  return {
    id: data.id,
    ownerEmail: data.ownerEmail,
    name: data.name,
    phone: data.phone || undefined,
    plan: data.plan,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    googleDriveRootFolderId: data.googleDriveCompanyFolderId || undefined
  };
}

export function mapExpenseDoc(data: FirestoreExpense): Expense {
  const originalCurrency = data.originalCurrency ?? data.currency;
  const baseCurrency = data.baseCurrency ?? "THB";
  const exchangeRate = data.exchangeRate ?? (originalCurrency === baseCurrency ? 1 : 0);

  return {
    id: data.id,
    businessId: data.businessId,
    ownerUid: data.ownerUid,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
    purchaseDate: data.purchaseDate,
    uploadDate: data.uploadDate,
    documentType: data.documentType as Expense["documentType"],
    storeName: data.storeName,
    detail: data.detail,
    payerName: data.requesterName,
    paymentStatus: data.status === "confirmed" ? "paid" : data.status === "review_needed" ? "review_needed" : data.status === "failed" ? "failed" : "draft",
    subtotal: data.subtotal,
    tax: data.tax,
    withholdingTax: data.withholdingTax,
    total: data.total ?? 0,
    currency: data.currency,
    originalCurrency,
    baseCurrency,
    exchangeRate,
    exchangeRateSource: data.exchangeRateSource ?? "manual",
    exchangeRateDate: data.exchangeRateDate ?? null,
    manualAmountOverride: data.manualAmountOverride ?? true,
    subtotalOriginal: data.subtotalOriginal ?? data.subtotal ?? 0,
    vatOriginal: data.vatOriginal ?? data.tax ?? 0,
    whtOriginal: data.whtOriginal ?? data.withholdingTax ?? 0,
    totalOriginal: data.totalOriginal ?? data.total ?? 0,
    subtotalBase: data.subtotalBase ?? data.subtotal ?? 0,
    vatBase: data.vatBase ?? data.tax ?? 0,
    whtBase: data.whtBase ?? data.withholdingTax ?? 0,
    totalBase: data.totalBase ?? data.total ?? 0,
    categorySummary: data.category,
    companyName: "",
    invoiceNumber: data.invoiceNumber,
    hasTaxInvoice: data.hasTaxInvoice,
    expenseType: data.expenseType,
    subCategory: data.subCategory,
    requesterName: data.requesterName,
    vendorName: data.vendorName,
    vendorTaxId: data.vendorTaxId,
    vendorBranchName: data.vendorBranchName,
    vendorBranchCode: data.vendorBranchCode,
    vendorAddress: data.vendorAddress,
    imageDriveFileId: data.imageDriveFileId,
    imageDriveUrl: data.imageDriveUrl,
    ocrText: data.ocrText,
    aiMemo: data.aiMemo,
    syncStatus: "synced"
  };
}

export function mapExpenseItemDoc(data: FirestoreExpenseItem): ExpenseItem {
  return {
    id: data.id,
    expenseId: data.expenseId,
    businessId: data.businessId,
    rawName: data.rawName,
    displayName: data.displayName,
    category: data.category,
    quantity: data.quantity,
    unitPrice: data.unitPrice,
    totalPrice: data.totalPrice,
    isResaleItem: data.isResaleItem,
    memo: data.memo,
    createdAt: timestampToIso(data.createdAt)
  };
}

export function useFirebaseUser() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFailedSessionEmailRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasFirebaseConfig()) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      console.log("[firebase-auth] auth state changed", {
        uid: nextUser?.uid ?? null,
        email: nextUser?.email ?? null
      });
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncFirebaseAuth() {
      console.log("[firebase-auth] sync start", {
        status,
        sessionEmail: session?.user?.email ?? null,
        accessToken: tokenDebug(session?.googleAccessToken),
        idToken: tokenDebug(session?.googleIdToken),
        googleTokenError: session?.googleTokenError ?? null
      });
      if (status === "loading") return;
      if (!hasFirebaseConfig()) {
        setError("ยังไม่ได้ตั้งค่า Firebase env");
        setLoading(false);
        return;
      }
      const auth = getFirebaseAuth();
      if (firebaseAuthSyncPaused) {
        console.log("[firebase-auth] sync paused, skipping firebase sign-in");
        if (!cancelled) {
          setUser(null);
          setLoading(false);
          setError(null);
        }
        if (status === "unauthenticated" || !session?.user) {
          resumeFirebaseAuthSync("session-cleared");
        }
        return;
      }
      if (!session?.user) {
        console.log("[firebase-auth] no session user, signing out firebase if needed");
        if (auth.currentUser) await firebaseSignOut(auth);
        firebaseAuthSyncInFlight = null;
        firebaseAuthSyncInFlightKey = null;
        lastFailedSessionEmailRef.current = null;
        if (!cancelled) {
          setUser(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      const sessionEmail = session.user.email?.trim();
      if (!sessionEmail) {
        console.warn("[firebase-auth] missing session email, skipping firebase sign-in");
        if (auth.currentUser) await firebaseSignOut(auth);
        firebaseAuthSyncInFlight = null;
        firebaseAuthSyncInFlightKey = null;
        if (!cancelled) {
          setUser(null);
          setError("ไม่พบอีเมลใน Google session");
          setLoading(false);
        }
        return;
      }

      try {
        if (
          auth.currentUser &&
          auth.currentUser.uid === sessionEmail
        ) {
          console.log("[firebase-auth] firebase user already signed in, skipping sign-in");
          lastFailedSessionEmailRef.current = null;
          if (!cancelled) {
            setUser(auth.currentUser);
            setError(null);
            setLoading(false);
          }
          return;
        }

        if (lastFailedSessionEmailRef.current === sessionEmail) {
          console.log("[firebase-auth] skip retry for previously failed session email");
          if (!cancelled) {
            setLoading(false);
          }
          return;
        }

        if (
          firebaseAuthSyncInFlight &&
          firebaseAuthSyncInFlightKey === sessionEmail
        ) {
          console.log("[firebase-auth] awaiting existing firebase sign-in");
          const existingUser = await firebaseAuthSyncInFlight;
          if (!cancelled) {
            setUser(existingUser);
            setError(null);
            setLoading(false);
          }
          return;
        }

        console.log("[firebase-auth] requesting firebase custom token", {
          sessionEmail,
          accessToken: tokenDebug(session.googleAccessToken),
          idToken: tokenDebug(session.googleIdToken)
        });
        setLoading(true);
        const signInPromise = (async () => {
          const tokenResponse = await fetch("/api/firebase-custom-token", {
            method: "GET",
            headers: {
              "cache-control": "no-cache"
            }
          });
          if (!tokenResponse.ok) {
            throw new Error(`Firebase custom token request failed with ${tokenResponse.status}`);
          }

          const tokenPayload = (await tokenResponse.json()) as {
            success?: boolean;
            firebaseCustomToken?: string;
            error?: string;
          };

          if (!tokenPayload.success || !tokenPayload.firebaseCustomToken) {
            throw new Error(tokenPayload.error || "Could not create Firebase custom token.");
          }

          const result = await signInWithCustomToken(auth, tokenPayload.firebaseCustomToken);
          return result.user;
        })();

        firebaseAuthSyncInFlight = signInPromise;
        firebaseAuthSyncInFlightKey = sessionEmail;
        const firebaseUser = await signInPromise;
        if (firebaseUser.displayName !== session.user.name || firebaseUser.photoURL !== session.user.image) {
          await updateProfile(firebaseUser, {
            displayName: session.user.name ?? firebaseUser.displayName ?? undefined,
            photoURL: session.user.image ?? firebaseUser.photoURL ?? undefined
          });
        }
        console.log("[firebase-auth] firebase sign-in success", {
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? null
        });
        lastFailedSessionEmailRef.current = null;
        if (!cancelled) {
          setUser(firebaseUser);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        console.error("[firebase-auth] firebase sign-in failed", err);
        lastFailedSessionEmailRef.current = sessionEmail;
        if (!cancelled) {
          setError(formatFirebaseAuthError(err));
          setLoading(false);
        }
      } finally {
        if (firebaseAuthSyncInFlightKey === sessionEmail) {
          firebaseAuthSyncInFlight = null;
          firebaseAuthSyncInFlightKey = null;
        }
      }
    }

    syncFirebaseAuth();
    return () => {
      cancelled = true;
    };
  }, [
    session?.googleAccessToken,
    session?.googleIdToken,
    session?.googleTokenError,
    session?.user?.email,
    session?.user?.name,
    session?.user?.image,
    status
  ]);

  return {
    user,
    loading: loading || status === "loading",
    error,
    hasSession: Boolean(session?.user)
  };
}

export async function ensureUserRoot(user: User) {
  await setDoc(
    doc(db(), "users", user.uid),
    {
      id: user.uid,
      email: user.email ?? user.uid ?? "",
      name: user.displayName ?? "",
      image: user.photoURL ?? "",
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function createBusinessDoc(user: User, input: { name: string; phone?: string }) {
  const businessId = createId();
  const firestoreDb = db();
  const businessRef = doc(firestoreDb, businessPath(user.uid, businessId));
  const settingsRef = doc(firestoreDb, appSettingsPath(user.uid));
  const batch = writeBatch(firestoreDb);
  batch.set(businessRef, businessPayload(user, businessId, input));
  batch.set(
    settingsRef,
    {
      activeBusinessId: businessId,
      receiptRootFolderId: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
  await batch.commit();
  return businessId;
}

export async function ensureDefaultBusinessDoc(user: User) {
  await ensureUserRoot(user);
  const firestoreDb = db();
  const businessesRef = collection(firestoreDb, "users", user.uid, "businesses");
  const snapshot = await getDocs(businessesRef);
  const settingsRef = doc(firestoreDb, appSettingsPath(user.uid));
  const settings = await getDoc(settingsRef);
  const activeBusinessId = typeof settings.data()?.activeBusinessId === "string" ? settings.data()?.activeBusinessId : "";
  const defaultName = defaultBusinessName(user);

  if (snapshot.empty) {
    await setDoc(
      settingsRef,
      {
        activeBusinessId: "",
        receiptRootFolderId: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    return null;
  }

  const businessDocs = snapshot.docs;
  const businessIds = new Set(businessDocs.map((businessDoc) => businessDoc.id));
  const duplicateDefaultDocs = businessDocs.filter((businessDoc) => {
    const data = businessDoc.data() as Partial<FirestoreBusiness>;
    return data.ownerUid === user.uid && data.name === defaultName && !data.phone;
  });

  if (duplicateDefaultDocs.length > 1) {
    const keepDoc =
      duplicateDefaultDocs.find((businessDoc) => businessDoc.id === activeBusinessId) ?? duplicateDefaultDocs[0];
    const batch = writeBatch(firestoreDb);
    for (const duplicateDoc of duplicateDefaultDocs) {
      if (duplicateDoc.id === keepDoc.id) continue;
      const expenses = await getDocs(collection(duplicateDoc.ref, "expenses"));
      if (expenses.empty) {
        batch.delete(duplicateDoc.ref);
      }
    }
    if (!activeBusinessId || !businessIds.has(activeBusinessId)) {
      batch.set(
        settingsRef,
        {
          activeBusinessId: keepDoc.id,
          receiptRootFolderId: "",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    }
    await batch.commit();
    return keepDoc.id;
  }

  if (!activeBusinessId) {
    const firstBusinessId = businessDocs[0].id;
    await setDoc(
      settingsRef,
      {
        activeBusinessId: firstBusinessId,
        receiptRootFolderId: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    return firstBusinessId;
  }

  return activeBusinessId;
}

export function subscribeBusinesses(user: User, callback: (data: { businesses: Business[]; activeBusinessId: string | null }) => void, onError: (error: Error) => void): Unsubscribe {
  const firestoreDb = db();
  const businessesRef = collection(firestoreDb, "users", user.uid, "businesses");
  const settingsRef = doc(firestoreDb, appSettingsPath(user.uid));
  let businesses: Business[] = [];
  let activeBusinessId: string | null = null;

  const emit = () => callback({ businesses, activeBusinessId });
  const unsubBusinesses = onSnapshot(
    query(businessesRef, orderBy("createdAt", "asc")),
    (snapshot) => {
      businesses = snapshot.docs.map((businessDoc) => mapBusinessDoc(businessDoc.data() as FirestoreBusiness));
      emit();
    },
    onError
  );
  const unsubSettings = onSnapshot(
    settingsRef,
    (snapshot) => {
      const value = snapshot.data()?.activeBusinessId;
      activeBusinessId = typeof value === "string" ? value : null;
      emit();
    },
    onError
  );

  return () => {
    unsubBusinesses();
    unsubSettings();
  };
}

export async function setActiveBusinessDoc(user: User, businessId: string) {
  await setDoc(
    doc(db(), appSettingsPath(user.uid)),
    {
      activeBusinessId: businessId,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

export async function updateBusinessDoc(user: User, businessId: string, patch: { name?: string; phone?: string }) {
  await updateDoc(doc(db(), businessPath(user.uid, businessId)), {
    ...patch,
    updatedAt: serverTimestamp()
  });
}

export async function deleteBusinessDoc(user: User, businessId: string) {
  await deleteDoc(doc(db(), businessPath(user.uid, businessId)));
}

export function subscribeExpenses(user: User, businessId: string, callback: (expenses: Expense[]) => void, onError: (error: Error) => void): Unsubscribe {
  const expensesRef = collection(db(), "users", user.uid, "businesses", businessId, "expenses");
  return onSnapshot(
    query(expensesRef, orderBy("purchaseDate", "desc")),
    (snapshot) => callback(snapshot.docs.map((expenseDoc) => mapExpenseDoc(expenseDoc.data() as FirestoreExpense))),
    onError
  );
}

export function subscribeProductSourceItems(
  user: User,
  businessId: string,
  callback: (items: ProductCatalogSourceItem[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const expensesRef = collection(db(), "users", user.uid, "businesses", businessId, "expenses");
  let requestId = 0;

  return onSnapshot(
    query(expensesRef, orderBy("purchaseDate", "desc")),
    (snapshot) => {
      const currentRequestId = ++requestId;
      void (async () => {
        const itemGroups = await Promise.all(
          snapshot.docs.map(async (expenseDoc) => {
            const expense = mapExpenseDoc(expenseDoc.data() as FirestoreExpense);
            const itemsSnap = await getDocs(collection(expenseDoc.ref, "items"));
            return itemsSnap.docs.map((itemDoc) => {
              const item = mapExpenseItemDoc(itemDoc.data() as FirestoreExpenseItem);
              return {
                ...item,
                storeName: expense.storeName,
                purchaseDate: expense.purchaseDate,
                originalCurrency: expense.originalCurrency ?? expense.currency,
                baseCurrency: expense.baseCurrency ?? "THB",
                exchangeRate:
                  expense.exchangeRate ?? ((expense.originalCurrency ?? expense.currency) === (expense.baseCurrency ?? "THB") ? 1 : 0),
                expenseDetail: expense.detail
              } satisfies ProductCatalogSourceItem;
            });
          })
        );

        if (currentRequestId !== requestId) return;
        callback(itemGroups.flat());
      })().catch((err) => {
        if (currentRequestId !== requestId) return;
        onError(err instanceof Error ? err : new Error("โหลดข้อมูลสินค้าไม่สำเร็จ"));
      });
    },
    onError
  );
}

export async function getExpenseWithItemsDoc(user: AuthUserRef, businessId: string, expenseId: string) {
  const expenseRef = doc(db(), expensePath(user.uid, businessId, expenseId));
  const expenseSnap = await getDoc(expenseRef);
  if (!expenseSnap.exists()) return null;
  const itemsSnap = await getDocs(collection(expenseRef, "items"));
  return {
    ...mapExpenseDoc(expenseSnap.data() as FirestoreExpense),
    items: itemsSnap.docs.map((itemDoc) => mapExpenseItemDoc(itemDoc.data() as FirestoreExpenseItem)),
    image: null
  };
}

export async function getExpenseWithItemsForUserDoc(user: AuthUserRef, expenseId: string) {
  const businessesRef = collection(db(), "users", user.uid, "businesses");
  const businessesSnap = await getDocs(businessesRef);

  for (const businessDoc of businessesSnap.docs) {
    const expense = await getExpenseWithItemsDoc(user, businessDoc.id, expenseId);
    if (expense) return expense;
  }

  return null;
}

export async function deleteExpenseDoc(user: AuthUserRef, businessId: string, expenseId: string) {
  const firestoreDb = db();
  const expenseRef = doc(firestoreDb, expensePath(user.uid, businessId, expenseId));
  const itemsSnap = await getDocs(collection(expenseRef, "items"));
  const batch = writeBatch(firestoreDb);
  for (const itemDoc of itemsSnap.docs) {
    batch.delete(itemDoc.ref);
  }
  batch.delete(expenseRef);
  await batch.commit();
}

export async function saveExpenseWithItemsDoc({
  user,
  businessId,
  expense,
  items
}: {
  user: AuthUserRef;
  businessId: string;
  expense: Omit<FirestoreExpense, "createdAt" | "updatedAt" | "ownerUid" | "businessId">;
  items: Array<Omit<FirestoreExpenseItem, "createdAt" | "updatedAt" | "ownerUid" | "businessId" | "expenseId">>;
}) {
  const firestoreDb = db();
  const expenseRef = doc(firestoreDb, expensePath(user.uid, businessId, expense.id));
  const batch = writeBatch(firestoreDb);
  batch.set(expenseRef, {
    ...expense,
    businessId,
    ownerUid: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  for (const item of items) {
    const itemRef = doc(expenseRef, "items", item.id);
    batch.set(itemRef, {
      ...item,
      expenseId: expense.id,
      businessId,
      ownerUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
  await batch.commit();
}

export async function updateExpenseWithItemsDoc({
  user,
  businessId,
  expenseId,
  expense,
  items
}: {
  user: AuthUserRef;
  businessId: string;
  expenseId: string;
  expense: Partial<Omit<FirestoreExpense, "createdAt" | "updatedAt" | "ownerUid" | "businessId" | "id">>;
  items: Array<Omit<FirestoreExpenseItem, "createdAt" | "updatedAt" | "ownerUid" | "businessId" | "expenseId">>;
}) {
  const firestoreDb = db();
  const expenseRef = doc(firestoreDb, expensePath(user.uid, businessId, expenseId));
  const expenseSnap = await getDoc(expenseRef);

  if (!expenseSnap.exists()) {
    throw new Error("ไม่พบรายจ่ายนี้ใน Firestore");
  }

  const current = expenseSnap.data() as DocumentData;
  const batch = writeBatch(firestoreDb);
  batch.set(
    expenseRef,
    {
      ...expense,
      id: expenseId,
      businessId,
      ownerUid: user.uid,
      updatedAt: serverTimestamp(),
      ...(current.sheetSyncStatus || current.spreadsheetId || current.spreadsheetUrl ? { sheetSyncStatus: "pending" } : {})
    },
    { merge: true }
  );

  const itemsSnap = await getDocs(collection(expenseRef, "items"));
  for (const itemDoc of itemsSnap.docs) {
    batch.delete(itemDoc.ref);
  }

  for (const item of items) {
    const itemRef = doc(expenseRef, "items", item.id);
    batch.set(itemRef, {
      ...item,
      expenseId,
      businessId,
      ownerUid: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  await batch.commit();
}

export async function seedDefaultCategories(user: User) {
  const firestoreDb = db();
  const categoriesRef = collection(firestoreDb, "users", user.uid, "categories");
  const snapshot = await getDocs(categoriesRef);
  if (!snapshot.empty) return;

  const batch = writeBatch(firestoreDb);
  for (const category of CATEGORIES) {
    const categoryId = category.replace(/\s+/g, "-").toLowerCase();
    batch.set(doc(categoriesRef, categoryId), {
      id: categoryId,
      name: category,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
  await batch.commit();
}
