import { UserProfile, DutyStatus } from '../types/hotel';

const ACCOUNTS_STORAGE_KEY = 'madigun_hotel_accounts_v1';
const CURRENT_USER_KEY = 'madigun_hotel_current_user_v1';
const AUTH_CHANNEL_NAME = 'madigun_hotel_auth_channel';

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

export function getAllAccounts(): UserProfile[] {
  if (typeof window === 'undefined') return INITIAL_ACCOUNTS;
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(INITIAL_ACCOUNTS));
      return INITIAL_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure primary developer account is always present
      const hasDev = parsed.some((u) => u.isPrimaryDeveloper || u.role === 'developer');
      if (!hasDev) {
        const merged = [INITIAL_ACCOUNTS[0], ...parsed];
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return parsed;
    }
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(INITIAL_ACCOUNTS));
    return INITIAL_ACCOUNTS;
  } catch (err) {
    console.error('Error reading accounts from localStorage:', err);
    return INITIAL_ACCOUNTS;
  }
}

export function saveAllAccounts(accounts: UserProfile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    notifyAuthChange('ACCOUNTS_UPDATED');
  } catch (err) {
    console.error('Error saving accounts to localStorage:', err);
  }
}

export function getCurrentUser(): UserProfile | null {
  if (typeof window === 'undefined') return INITIAL_ACCOUNTS[0];
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) {
      // Default to Primary Developer account for instant convenience, but allows logging out / switching
      const defaultUser = INITIAL_ACCOUNTS[0];
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading current user from localStorage:', err);
    return null;
  }
}

export function setCurrentUser(user: UserProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
    notifyAuthChange('AUTH_STATE_CHANGED', { user });
  } catch (err) {
    console.error('Error saving current user to localStorage:', err);
  }
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

  const cur = getCurrentUser();
  if (cur && cur.id === userId) {
    setCurrentUser(updated);
  }

  return updated;
}

export function resetToDemoAccounts(): UserProfile[] {
  saveAllAccounts(INITIAL_ACCOUNTS);
  setCurrentUser(INITIAL_ACCOUNTS[0]);
  return INITIAL_ACCOUNTS;
}

export function subscribeToAuthEvents(
  callback: (event: { type: string; data?: any }) => void
): () => void {
  const handleMessage = (e: MessageEvent) => {
    if (e.data && e.data.type) {
      callback(e.data);
    }
  };

  const handleStorage = (e: StorageEvent) => {
    if (e.key === ACCOUNTS_STORAGE_KEY || e.key === CURRENT_USER_KEY) {
      callback({ type: 'AUTH_STORAGE_SYNC' });
    }
  };

  if (authBroadcastChannel) {
    authBroadcastChannel.addEventListener('message', handleMessage);
  }
  window.addEventListener('storage', handleStorage);

  return () => {
    if (authBroadcastChannel) {
      authBroadcastChannel.removeEventListener('message', handleMessage);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
