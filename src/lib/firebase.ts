import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  writeBatch 
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { Transaction } from "../types";

// Determine if Firebase has a valid config loaded
export const isFirebaseConfigured = !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

// Lazy or safe loading
const app = isFirebaseConfigured 
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApp())
  : null;

export const auth = app ? getAuth(app) : null;
export const db = (app && firebaseConfig.firestoreDatabaseId)
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : (app ? getFirestore(app) : null);

export const googleProvider = new GoogleAuthProvider();

// Error Handling Infrastructure representing the 8 Pillars & secure schema metrics
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Google Authentication Google Sign In Helper
export async function loginWithGoogle(): Promise<User | null> {
  if (!auth) {
    throw new Error("Firebase Authentication is not configured or terms are not accepted.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google authentication failed:", error);
    throw error;
  }
}

// Sign out
export async function logoutUser(): Promise<void> {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Google Sign Out failed:", error);
    throw error;
  }
}

// Save User Profile to Cloud
export async function saveCloudUserProfile(userId: string, data: { name: string; profilePic: string; monthlyBudget: number }) {
  if (!db) return;
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, "users", userId), {
      userId,
      name: data.name,
      profilePic: data.profilePic,
      monthlyBudget: data.monthlyBudget
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Sync / Push list of transactions to Firestore (Upsert)
export async function backupTransactionsToCloud(userId: string, transactions: Transaction[]): Promise<void> {
  if (!db) return;
  const path = `users/${userId}/transactions`;
  try {
    const batch = writeBatch(db);
    
    // For each transaction, queue in batch
    transactions.forEach((tx) => {
      const docRef = doc(db, "users", userId, "transactions", tx.id);
      batch.set(docRef, {
        id: tx.id,
        title: tx.title,
        amount: Number(tx.amount),
        type: tx.type,
        category: tx.category,
        date: tx.date,
        description: tx.description || "",
        isRecurring: !!tx.isRecurring,
        currency: tx.currency || "INR"
      });
    });

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Retrieve entire Transaction ledger from cloud
export async function fetchTransactionsFromCloud(userId: string): Promise<Transaction[]> {
  if (!db) return [];
  const path = `users/${userId}/transactions`;
  try {
    const colRef = collection(db, "users", userId, "transactions");
    const snapshot = await getDocs(colRef);
    const list: Transaction[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      list.push({
        id: data.id,
        title: data.title,
        amount: Number(data.amount),
        type: data.type,
        category: data.category,
        date: data.date,
        description: data.description || "",
        isRecurring: !!data.isRecurring,
        currency: data.currency || "INR"
      });
    });

    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// Sync single newly added / updated transaction
export async function syncSingleTransactionToCloud(userId: string, tx: Transaction): Promise<void> {
  if (!db) return;
  const path = `users/${userId}/transactions/${tx.id}`;
  try {
    await setDoc(doc(db, "users", userId, "transactions", tx.id), {
      id: tx.id,
      title: tx.title,
      amount: Number(tx.amount),
      type: tx.type,
      category: tx.category,
      date: tx.date,
      description: tx.description || "",
      isRecurring: !!tx.isRecurring,
      currency: tx.currency || "INR"
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete single transaction
export async function deleteSingleTransactionFromCloud(userId: string, txId: string): Promise<void> {
  if (!db) return;
  const path = `users/${userId}/transactions/${txId}`;
  try {
    await deleteDoc(doc(db, "users", userId, "transactions", txId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
