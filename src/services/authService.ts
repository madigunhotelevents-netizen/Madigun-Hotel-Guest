import { UserProfile, DutyStatus } from '../types/hotel';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';

const AUTH_CHANNEL_NAME = 'madigun_hotel_auth_channel';
const FIRESTORE_ACCOUNTS_COLLECTION = 'accounts';
const SESSION_STORAGE_KEY = 'madigun_hotel_user_session_v2';

function loadSession(): UserProfile | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    }
  } catch (e) {
    console.warn('Error loading auth session:', e);
  }
  return null;
}

export const INITIAL_ACCOUNTS: UserProfile[] = [
  {
    id: 'user-dev-admin',
    username: 'developer',
    password: 'password123',
    name: 'Alex Rivera (Lead Developer)',
    email: 'developer@madigunhotel.com',
    role: 'developer',
    roleTitle: 'Lead Developer & Primary Admin',
    department: 'IT & System Administration',
    phone: '+1 (555) 019-8234',
    shift: 'All Access / 24/7 DevOps',
    bio: 'Primary developer account with full authority to provision employee accounts, modify all profiles, inspect real-time logs, and manage system operations.',
    avatarColor: '#C5A880',
    isPrimaryDeveloper: true,
    dutyStatus: 'ON_DUTY',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30, // 30 days ago
    lastLoginAt: Date.now(),
  },
  {
    id: 'user-staff-sarah',
    username: 'sarah.frontdesk',
    password: 'password123',
    name: 'Sarah Jenkins',
    email: 'sarah.j@madigunhotel.com',
    role: 'staff',
    roleTitle: 'Front Desk Supervisor',
    department: 'Front Desk',
    phone: '+1 (555) 012-4411',
    shift: 'Day Shift (07:00 - 15:30)',
    bio: 'Senior guest relations concierge specializing in fast room assistance, check-in hospitality, and VIP guest accommodations.',
    avatarColor: '#3B82F6',
    isPrimaryDeveloper: false,
    dutyStatus: 'ON_DUTY',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    lastLoginAt: Date.now() - 1000 * 60 * 30,
  },
  {
    id: 'user-staff-elena',
    username: 'elena.housekeeping',
    password: 'password123',
    name: 'Elena Rostova',
    email: 'elena.r@madigunhotel.com',
    role: 'staff',
    roleTitle: 'Housekeeping Supervisor',
    department: 'Housekeeping',
    phone: '+1 (555) 014-9922',
    shift: 'Morning Shift (08:00 - 16:30)',
    bio: 'Supervising in-room linens, complimentary supplies, hygiene protocols, and rapid turnover cleaning services.',
    avatarColor: '#10B981',
    isPrimaryDeveloper: false,
    dutyStatus: 'ON_DUTY',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 10,
    lastLoginAt: Date.now() - 1000 * 60 * 120,
  },
  {
    id: 'user-staff-marcus',
    username: 'marcus.maintenance',
    password: 'password123',
    name: 'Marcus Chen',
    email: 'marcus.c@madigunhotel.com',
    role: 'staff',
    roleTitle: 'Chief Maintenance Engineer',
    department: 'Maintenance & Engineering',
    phone: '+1 (555) 017-3388',
    shift: 'Evening Shift (14:00 - 22:30)',
    bio: 'Managing room air conditioning, plumbing, lighting fixtures, and technical guest room diagnostics.',
    avatarColor: '#F59E0B',
    isPrimaryDeveloper: false,
    dutyStatus: 'OFF_DUTY',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
    lastLoginAt: Date.now() - 1000 * 60 * 60 * 8,
  },
];

let authBroadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    authBroadcastChannel = new BroadcastChannel(AUTH_CHANNEL_NAME);
  }
} catch {
  // BroadcastChannel unavailable
}

function notifyAuthChange(type: string, data?: any) {
  if (authBroadcastChannel) {
    authBroadcastChannel.postMessage({ type, data, timestamp: Date.now() });
  }
}

let accountsCache: UserProfile[] = [...INITIAL_ACCOUNTS];
let currentLoggedUser: UserProfile | null = loadSession();
let isAccountsInitialFetchDone = false;
let accountsFirestoreUnsubscribe: (() => void) | null = null;

function initAccountsFirestoreRealtimeSync() {
  if (accountsFirestoreUnsubscribe || typeof window === 'undefined') return;

  try {
    const accsRef = collection(db, FIRESTORE_ACCOUNTS_COLLECTION);
    accountsFirestoreUnsubscribe = onSnapshot(
      accsRef,
      (snapshot) => {
        if (snapshot.empty && !isAccountsInitialFetchDone) {
          seedInitialFirestoreAccounts();
          return;
        }

        const freshList: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const item = { id: docSnap.id, ...(docSnap.data() as Omit<UserProfile, 'id'>) } as UserProfile;
          freshList.push(item);
        });

        if (freshList.length > 0) {
          accountsCache = freshList;
          isAccountsInitialFetchDone = true;
          notifyAuthChange('ACCOUNTS_UPDATED');
        }
      },
      (err) => {
        console.warn('Firestore accounts sync error:', err);
      }
    );
  } catch (err) {
    console.warn('Could not setup Firestore accounts listener:', err);
  }
}

async function seedInitialFirestoreAccounts() {
  try {
    const batch = writeBatch(db);
    INITIAL_ACCOUNTS.forEach((acc) => {
      const docRef = doc(db, FIRESTORE_ACCOUNTS_COLLECTION, acc.id);
      batch.set(docRef, acc);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Failed to seed initial Firestore accounts:', err);
  }
}

// Background fetch accounts from Firestore/Server
export async function fetchAccountsFromServer(): Promise<UserProfile[]> {
  try {
    const accsRef = collection(db, FIRESTORE_ACCOUNTS_COLLECTION);
    const snap = await getDocs(accsRef);
    if (!snap.empty) {
      const serverData: UserProfile[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserProfile, 'id'>),
      }));
      accountsCache = serverData;
      isAccountsInitialFetchDone = true;
      notifyAuthChange('ACCOUNTS_UPDATED');
      return serverData;
    }
  } catch {
    // Fallback to Express backend if exists
    try {
      const res = await fetch('/api/accounts', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const serverData = await res.json();
        if (Array.isArray(serverData) && serverData.length > 0) {
          accountsCache = serverData;
          isAccountsInitialFetchDone = true;
          notifyAuthChange('ACCOUNTS_UPDATED');
          return serverData;
        }
      }
    } catch {}
  }
  return accountsCache.length > 0 ? accountsCache : INITIAL_ACCOUNTS;
}

if (typeof window !== 'undefined') {
  initAccountsFirestoreRealtimeSync();
  fetchAccountsFromServer().catch(() => {});
}

export function getAllAccounts(): UserProfile[] {
  if (accountsCache.length > 0) {
    return accountsCache;
  }
  return INITIAL_ACCOUNTS;
}

export function saveAllAccounts(accounts: UserProfile[]): void {
  accountsCache = accounts;
  notifyAuthChange('ACCOUNTS_UPDATED');
}

export function getCurrentUser(): UserProfile | null {
  return currentLoggedUser;
}

export function setCurrentUser(user: UserProfile | null): void {
  currentLoggedUser = user;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (user) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  } catch (e) {
    console.warn('Error saving auth session:', e);
  }
  notifyAuthChange('AUTH_STATE_CHANGED', { user });
}

export function login(
  usernameOrEmail: string,
  password: string
): { success: boolean; user?: UserProfile; error?: string } {
  const cleanInput = usernameOrEmail.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanInput || !cleanPassword) {
    return { success: false, error: 'Please enter both username/email and password.' };
  }

  const accounts = getAllAccounts();
  const match = accounts.find(
    (acc) =>
      acc.username.toLowerCase() === cleanInput ||
      acc.email.toLowerCase() === cleanInput
  );

  if (!match) {
    return { success: false, error: 'No account found with this username or email.' };
  }

  if (match.password !== cleanPassword) {
    return { success: false, error: 'Incorrect password. Please verify your credentials.' };
  }

  // Update last login timestamp
  const updatedUser: UserProfile = {
    ...match,
    lastLoginAt: Date.now(),
    dutyStatus: match.dutyStatus === 'OFF_DUTY' ? 'ON_DUTY' : match.dutyStatus,
  };

  const updatedAccounts = accounts.map((acc) => (acc.id === match.id ? updatedUser : acc));
  saveAllAccounts(updatedAccounts);
  setCurrentUser(updatedUser);

  // Sync to Firestore
  try {
    const docRef = doc(db, FIRESTORE_ACCOUNTS_COLLECTION, updatedUser.id);
    updateDoc(docRef, {
      lastLoginAt: updatedUser.lastLoginAt,
      dutyStatus: updatedUser.dutyStatus,
    }).catch(() => {});
  } catch {}

  return { success: true, user: updatedUser };
}

export function logout(): void {
  setCurrentUser(null);
}

export function createAccount(
  actor: UserProfile | null,
  newAccount: Omit<UserProfile, 'id' | 'createdAt'>
): { success: boolean; account?: UserProfile; error?: string } {
  if (!actor || (actor.role !== 'developer' && !actor.isPrimaryDeveloper)) {
    return {
      success: false,
      error: 'Authority Denied: Only the Primary Admin / Developer account has authority to create employee accounts.',
    };
  }

  const cleanUsername = newAccount.username.trim().toLowerCase();
  if (!cleanUsername) {
    return { success: false, error: 'Username is required.' };
  }
  if (!newAccount.name.trim()) {
    return { success: false, error: 'Employee full name is required.' };
  }
  if (!newAccount.password || newAccount.password.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }

  const accounts = getAllAccounts();
  const exists = accounts.some(
    (a) => a.username.toLowerCase() === cleanUsername || (a.email && a.email.toLowerCase() === newAccount.email.trim().toLowerCase())
  );

  if (exists) {
    return {
      success: false,
      error: `An account with username "${newAccount.username}" or email "${newAccount.email}" already exists.`,
    };
  }

  const created: UserProfile = {
    ...newAccount,
    id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    username: cleanUsername,
    name: newAccount.name.trim(),
    email: newAccount.email.trim() || `${cleanUsername}@madigunhotel.com`,
    roleTitle: newAccount.roleTitle.trim() || (newAccount.role === 'developer' ? 'Developer' : 'Staff Concierge'),
    department: newAccount.department.trim() || 'Front Desk',
    phone: newAccount.phone.trim() || '+1 (555) 000-0000',
    shift: newAccount.shift.trim() || 'Standard Shift',
    bio: newAccount.bio.trim() || 'Madigun Hotel team member.',
    avatarColor: newAccount.avatarColor || '#3B82F6',
    dutyStatus: newAccount.dutyStatus || 'ON_DUTY',
    isPrimaryDeveloper: false,
    createdAt: Date.now(),
  };

  const updated = [created, ...accounts];
  saveAllAccounts(updated);

  // Sync with Firestore
  try {
    const docRef = doc(db, FIRESTORE_ACCOUNTS_COLLECTION, created.id);
    setDoc(docRef, created).catch((err) => {
      console.warn('Firestore create account error:', err);
    });
  } catch {}

  // Sync with Express API
  fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(created),
  }).catch(() => {});

  return { success: true, account: created };
}

export function updateAccount(
  actor: UserProfile | null,
  accountId: string,
  updates: Partial<UserProfile>
): { success: boolean; account?: UserProfile; error?: string } {
  if (!actor) {
    return { success: false, error: 'Authentication required.' };
  }

  const isDev = actor.role === 'developer' || actor.isPrimaryDeveloper;
  const isSelf = actor.id === accountId;

  if (!isDev && !isSelf) {
    return {
      success: false,
      error: 'Authority Denied: You can only edit your own personal profile or must be the Primary Developer to edit other accounts.',
    };
  }

  const accounts = getAllAccounts();
  const target = accounts.find((a) => a.id === accountId);
  if (!target) {
    return { success: false, error: 'Account not found.' };
  }

  // If changing username or email, ensure uniqueness
  if (updates.username && updates.username.toLowerCase() !== target.username.toLowerCase()) {
    const cleanU = updates.username.trim().toLowerCase();
    const collision = accounts.some((a) => a.id !== accountId && a.username.toLowerCase() === cleanU);
    if (collision) {
      return { success: false, error: `Username "${updates.username}" is already taken.` };
    }
  }

  // Protect primary developer role
  let roleToSet = updates.role ?? target.role;
  let isPrimaryDev = target.isPrimaryDeveloper;
  if (target.isPrimaryDeveloper) {
    roleToSet = 'developer';
    isPrimaryDev = true;
  }

  const updatedAccount: UserProfile = {
    ...target,
    ...updates,
    role: roleToSet,
    isPrimaryDeveloper: isPrimaryDev,
  };

  const updatedList = accounts.map((a) => (a.id === accountId ? updatedAccount : a));
  saveAllAccounts(updatedList);

  // Sync update with Firestore
  try {
    const docRef = doc(db, FIRESTORE_ACCOUNTS_COLLECTION, accountId);
    updateDoc(docRef, { ...updates, role: roleToSet, isPrimaryDeveloper: isPrimaryDev }).catch((err) => {
      console.warn('Firestore update account error:', err);
    });
  } catch {}

  // Sync update with server API
  fetch(`/api/accounts/${encodeURIComponent(accountId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedAccount),
  }).catch(() => {});

  // If actor edited their own profile, sync current user session
  if (isSelf) {
    setCurrentUser(updatedAccount);
  }

  return { success: true, account: updatedAccount };
}

export function deleteAccount(
  actor: UserProfile | null,
  accountId: string
): { success: boolean; error?: string } {
  if (!actor || (actor.role !== 'developer' && !actor.isPrimaryDeveloper)) {
    return {
      success: false,
      error: 'Authority Denied: Only the Primary Admin / Developer account has authority to delete employee accounts.',
    };
  }

  const accounts = getAllAccounts();
  const target = accounts.find((a) => a.id === accountId);
  if (!target) {
    return { success: false, error: 'Account not found.' };
  }

  if (target.isPrimaryDeveloper) {
    return { success: false, error: 'Security Protection: The Primary Developer Admin account cannot be deleted.' };
  }

  if (actor.id === accountId) {
    return { success: false, error: 'Cannot delete the account you are currently logged in with.' };
  }

  const updatedList = accounts.filter((a) => a.id !== accountId);
  saveAllAccounts(updatedList);

  // Sync delete with Firestore
  try {
    const docRef = doc(db, FIRESTORE_ACCOUNTS_COLLECTION, accountId);
    deleteDoc(docRef).catch((err) => {
      console.warn('Firestore delete account error:', err);
    });
  } catch {}

  // Sync delete with server API
  fetch(`/api/accounts/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
  }).catch(() => {});

  return { success: true };
}

export function setDutyStatus(
  userId: string,
  status: DutyStatus
): UserProfile | null {
  const accounts = getAllAccounts();
  const target = accounts.find((a) => a.id === userId);
  if (!target) return null;

  const updated = { ...target, dutyStatus: status };
  const updatedList = accounts.map((a) => (a.id === userId ? updated : a));
  saveAllAccounts(updatedList);

  // Sync duty status to Firestore
  try {
    const docRef = doc(db, FIRESTORE_ACCOUNTS_COLLECTION, userId);
    updateDoc(docRef, { dutyStatus: status }).catch(() => {});
  } catch {}

  // Sync duty status to server
  fetch(`/api/accounts/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dutyStatus: status }),
  }).catch(() => {});

  const cur = getCurrentUser();
  if (cur && cur.id === userId) {
    setCurrentUser(updated);
  }

  return updated;
}

export function resetToDemoAccounts(): UserProfile[] {
  saveAllAccounts(INITIAL_ACCOUNTS);
  setCurrentUser(null);

  seedInitialFirestoreAccounts();

  fetch('/api/accounts/reset', {
    method: 'POST',
  }).catch(() => {});

  return INITIAL_ACCOUNTS;
}

export function subscribeToAuthEvents(
  callback: (event: { type: string; data?: any }) => void
): () => void {
  initAccountsFirestoreRealtimeSync();

  const handleMessage = (e: MessageEvent) => {
    if (e.data && e.data.type) {
      callback(e.data);
    }
  };

  if (authBroadcastChannel) {
    authBroadcastChannel.addEventListener('message', handleMessage);
  }

  return () => {
    if (authBroadcastChannel) {
      authBroadcastChannel.removeEventListener('message', handleMessage);
    }
  };
}
