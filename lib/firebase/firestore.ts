"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut as firebaseSignOut,
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
import type { Business, Expense, ExpenseItem } from "@/lib/expenseTypes";
import { CATEGORIES } from "@/lib/types/receipt";
import { createId } from "@/lib/utils";

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
  return user.displayName ? `ธุรกิจของ ${user.displayName}` : "ธุรกิจของฉัน";
}

function businessPayload(user: User, businessId: string, input: { name: string; phone?: string }) {
  return {
    id: businessId,
    ownerUid: user.uid,
    ownerEmail: user.email ?? "",
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

  useEffect(() => {
    if (!hasFirebaseConfig()) {
      setLoading(false);
      return;
    }
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncFirebaseAuth() {
      if (status === "loading") return;
      if (!hasFirebaseConfig()) {
        setError("ยังไม่ได้ตั้งค่า Firebase env");
        setLoading(false);
        return;
      }
      const auth = getFirebaseAuth();
      if (!session?.googleAccessToken || session.googleTokenError) {
        if (auth.currentUser) await firebaseSignOut(auth);
        if (!cancelled) {
          setUser(null);
          setLoading(false);
          setError(null);
        }
        return;
      }

      try {
        setLoading(true);
        const credential = GoogleAuthProvider.credential(null, session.googleAccessToken);
        const result = await signInWithCredential(auth, credential);
        if (!cancelled) {
          setUser(result.user);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Firebase login failed");
          setLoading(false);
        }
      }
    }

    syncFirebaseAuth();
    return () => {
      cancelled = true;
    };
  }, [session?.googleAccessToken, session?.googleTokenError, status]);

  return {
    user,
    loading: loading || status === "loading",
    error,
    hasSession: Boolean(session?.googleAccessToken && !session.googleTokenError)
  };
}

export async function ensureUserRoot(user: User) {
  await setDoc(
    doc(db(), "users", user.uid),
    {
      id: user.uid,
      email: user.email ?? "",
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

export async function getExpenseWithItemsDoc(user: User, businessId: string, expenseId: string) {
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

export async function deleteExpenseDoc(user: User, businessId: string, expenseId: string) {
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
  user: User;
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
  user: User;
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
