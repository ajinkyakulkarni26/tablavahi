import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  getAuth,
  signInWithRedirect,
  signInWithPopup,
  signOut,
  type AuthError,
  type Auth,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { Composition } from "../types";

type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

const config: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

export type GoogleSignInMethod = "popup" | "redirect";

const redirectFallbackAuthCodes = new Set([
  "auth/cancelled-popup-request",
  "auth/operation-not-supported-in-this-environment",
  "auth/popup-blocked",
  "auth/popup-closed-by-user",
  "auth/web-storage-unsupported",
]);

function hasRequiredConfig(): boolean {
  return (
    Boolean(config.apiKey) &&
    Boolean(config.authDomain) &&
    Boolean(config.projectId) &&
    Boolean(config.appId)
  );
}

function ensureClient(): { auth: Auth; db: Firestore } {
  if (!hasRequiredConfig()) {
    throw new Error("Firebase config missing in environment variables.");
  }

  if (!app) {
    app = initializeApp(config);
    auth = getAuth(app);
    db = getFirestore(app);
  }

  if (!auth || !db) {
    throw new Error("Unable to initialize Firebase client.");
  }

  return { auth, db };
}

function compositionsCollection(firestore: Firestore) {
  return collection(firestore, "compositions");
}

export function isCloudConfigured(): boolean {
  return hasRequiredConfig();
}

export function subscribeCloudUser(
  onChange: (user: User | null) => void,
): () => void {
  if (!hasRequiredConfig()) {
    onChange(null);
    return () => {};
  }
  const { auth } = ensureClient();
  return onAuthStateChanged(auth, onChange);
}

export function isGoogleSignedIn(user: User | null): boolean {
  return Boolean(user && !user.isAnonymous);
}

function shouldUseRedirectFallback(error: unknown): boolean {
  const code = (error as AuthError).code;
  return redirectFallbackAuthCodes.has(code);
}

export async function signInWithGoogleAccount(): Promise<GoogleSignInMethod> {
  const { auth } = ensureClient();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    await signInWithPopup(auth, provider);
    return "popup";
  } catch (error) {
    // Some browsers close Firebase OAuth popups before the parent window receives
    // the result. Redirect sign-in is slower but survives those environments.
    if (shouldUseRedirectFallback(error)) {
      await signInWithRedirect(auth, provider);
      return "redirect";
    }
    throw error;
  }
}

export async function signOutCloudAccount(): Promise<void> {
  const { auth } = ensureClient();
  await signOut(auth);
}

export async function finalizeGoogleRedirectSignIn(): Promise<void> {
  const { auth } = ensureClient();
  await getRedirectResult(auth);
}

export async function loadCompositionsFromCloud(): Promise<Composition[]> {
  const { db } = ensureClient();
  // Firestore rules allow public read on /compositions — no sign-in required to browse.
  const snap = await getDocs(compositionsCollection(db));

  const results: Composition[] = [];
  snap.forEach((item) => {
    const data = item.data() as Composition;
    results.push({
      ...data,
      id: item.id,
    });
  });

  results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return results;
}

async function requireGoogleUser(): Promise<User> {
  const { auth } = ensureClient();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    throw new Error(
      "Please sign in with Google before saving compositions to the shared library.",
    );
  }
  return user;
}

export async function saveCompositionsToCloud(
  compositions: Composition[],
): Promise<void> {
  const { db } = ensureClient();
  const user = await requireGoogleUser();
  const owned = compositions.filter(
    (composition) => !composition.ownerUid || composition.ownerUid === user.uid,
  );
  const tasks = owned.map((composition) =>
    setDoc(
      doc(db, "compositions", composition.id),
      {
        ...composition,
        ownerUid: composition.ownerUid ?? user.uid,
        ownerDisplayName:
          composition.ownerDisplayName ??
          user.displayName ??
          user.email ??
          "Anonymous",
      },
      { merge: true },
    ),
  );
  await Promise.all(tasks);
}

export async function deleteCompositionFromCloud(id: string): Promise<void> {
  const { db } = ensureClient();
  await requireGoogleUser();
  await deleteDoc(doc(db, "compositions", id));
}
