/**
 * Google Drive Cloud Integration for Madigun Hotel & Events
 * Uses Firebase Auth (GoogleAuthProvider with Drive scopes) and Google Drive v3 REST API.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { HotelRequest } from '../types/hotel';
import { getStoredRequests, saveStoredRequests } from './storageService';
import { getAllAccounts, saveAllAccounts } from './authService';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export interface DriveSyncStatus {
  connected: boolean;
  userEmail?: string;
  displayName?: string;
  photoURL?: string;
  lastBackupTime?: number;
  lastSyncResult?: string;
  folderId?: string;
  autoSyncEnabled?: boolean;
}

const DRIVE_STATUS_KEY = 'madigun_gdrive_status_v2';
const DRIVE_FOLDER_NAME = 'Madigun Hotel Server Storage';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Provider with Drive Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
});

// In-memory token cache (DO NOT store accessToken in localStorage)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let isSigningIn = false;

// Listen to auth state
onAuthStateChanged(auth, (user) => {
  cachedUser = user;
  if (!user) {
    cachedAccessToken = null;
    const status = getDriveStatus();
    saveDriveStatus({ ...status, connected: false, userEmail: undefined });
  }
});

export function getDriveStatus(): DriveSyncStatus {
  if (typeof window === 'undefined') {
    return { connected: false, autoSyncEnabled: true };
  }
  try {
    const raw = localStorage.getItem(DRIVE_STATUS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isConnected = Boolean(cachedAccessToken || (auth.currentUser && parsed.connected));
      return { ...parsed, connected: isConnected };
    }
  } catch {}
  return {
    connected: Boolean(cachedAccessToken),
    autoSyncEnabled: true,
  };
}

export function saveDriveStatus(status: Partial<DriveSyncStatus>): DriveSyncStatus {
  const current = getDriveStatus();
  const updated = { ...current, ...status };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(DRIVE_STATUS_KEY, JSON.stringify(updated));
    } catch {}
  }
  return updated;
}

export function getDriveAccessToken(): string | null {
  return cachedAccessToken;
}

export async function requestDriveAuthorization(userEmailPrompt?: string): Promise<{
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}> {
  if (isSigningIn) {
    return { success: false, error: 'Sign-in already in progress' };
  }

  isSigningIn = true;
  try {
    if (userEmailPrompt) {
      provider.setCustomParameters({ login_hint: userEmailPrompt });
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential?.accessToken) {
      throw new Error('No access token returned from Google authentication');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;

    const email = result.user.email || userEmailPrompt || 'madigunhotelevents@gmail.com';
    const status = saveDriveStatus({
      connected: true,
      userEmail: email,
      displayName: result.user.displayName || 'Madigun Hotel Staff',
      photoURL: result.user.photoURL || undefined,
    });

    console.log('[Google Drive] Authenticated successfully for:', email);
    return { success: true, token: cachedAccessToken, user: result.user };
  } catch (err: any) {
    console.warn('[Google Drive] Sign-in error:', err);

    // Fallback: Check if GSI is available in window
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const gsiToken = await new Promise<string>((resolve, reject) => {
          const client = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: firebaseConfig.oAuthClientId || '565286406815-cpeegsl5ir892ilpec3pbc6mbn1j4242.apps.googleusercontent.com',
            scope: 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file',
            hint: userEmailPrompt || 'madigunhotelevents@gmail.com',
            callback: (resp: any) => {
              if (resp.access_token) resolve(resp.access_token);
              else reject(new Error(resp.error_description || resp.error || 'OAuth failed'));
            },
          });
          client.requestAccessToken();
        });

        cachedAccessToken = gsiToken;
        saveDriveStatus({
          connected: true,
          userEmail: userEmailPrompt || 'madigunhotelevents@gmail.com',
        });
        return { success: true, token: gsiToken };
      } catch (gsiErr: any) {
        return { success: false, error: gsiErr?.message || err?.message || 'Google authentication failed' };
      }
    }

    return {
      success: false,
      error: err?.message || 'Google Drive authentication was cancelled or failed.',
    };
  } finally {
    isSigningIn = false;
  }
}

export async function clearDriveAuth(): Promise<void> {
  cachedAccessToken = null;
  cachedUser = null;
  try {
    await signOut(auth);
  } catch {}
  saveDriveStatus({ connected: false, userEmail: undefined });
}

/**
 * Get or Create the dedicated Hotel Server Storage folder in Google Drive
 */
export async function getOrCreateHotelFolder(token: string): Promise<string> {
  const status = getDriveStatus();
  if (status.folderId) {
    try {
      const checkRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${status.folderId}?fields=id,trashed`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (checkRes.ok) {
        const data = await checkRes.json();
        if (!data.trashed) return status.folderId;
      }
    } catch {}
  }

  // Search for existing folder
  const query = `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const folderId = searchData.files[0].id;
        saveDriveStatus({ folderId });
        return folderId;
      }
    }
  } catch {}

  // Create new folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Dedicated cloud storage for Madigun Hotel & Events database backups and service logs',
    }),
  });

  if (!createRes.ok) {
    throw new Error('Failed to create server storage folder in Google Drive');
  }

  const folderData = await createRes.json();
  saveDriveStatus({ folderId: folderData.id });
  return folderData.id;
}

/**
 * Upload or Update Database Backup JSON to Google Drive
 */
export async function uploadHotelDatabaseBackup(): Promise<{
  success: boolean;
  file?: GoogleDriveFile;
  error?: string;
}> {
  const token = getDriveAccessToken();
  if (!token) {
    return { success: false, error: 'Google Drive authentication required. Please connect your Google account.' };
  }

  try {
    const folderId = await getOrCreateHotelFolder(token);

    const requests = getStoredRequests();
    const accounts = getAllAccounts();

    const backupData = {
      hotelName: 'Madigun Hotel & Events',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      systemVersion: '2.5.0',
      statistics: {
        totalRequests: requests.length,
        totalAccounts: accounts.length,
      },
      requests,
      accounts,
    };

    const fileName = `Madigun_Hotel_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    const fileContent = JSON.stringify(backupData, null, 2);

    // Search if file already exists in folder
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        `name = '${fileName}' and '${folderId}' in parents and trashed = false`
      )}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    let existingFileId: string | null = null;
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        existingFileId = searchData.files[0].id;
      }
    }

    let uploadRes: Response;
    if (existingFileId) {
      uploadRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        }
      );
    } else {
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [folderId],
        description: 'Automated server backup of Madigun Hotel requests, staff directory, and dispatch records',
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        fileContent +
        closeDelim;

      uploadRes = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body: multipartRequestBody,
        }
      );
    }

    if (!uploadRes.ok) {
      const errJson = await uploadRes.json().catch(() => ({}));
      throw new Error(errJson.error?.message || 'Failed to upload backup to Google Drive');
    }

    const uploadedFile: GoogleDriveFile = await uploadRes.json();
    saveDriveStatus({
      lastBackupTime: Date.now(),
      lastSyncResult: `Backed up ${requests.length} requests to "${fileName}"`,
    });

    return { success: true, file: uploadedFile };
  } catch (err: any) {
    console.error('Google Drive backup error:', err);
    saveDriveStatus({ lastSyncResult: `Error: ${err?.message || 'Backup failed'}` });
    return { success: false, error: err?.message || 'Google Drive backup failed' };
  }
}

/**
 * List backup files in the Hotel Server Storage folder
 */
export async function listDriveBackupFiles(): Promise<GoogleDriveFile[]> {
  const token = getDriveAccessToken();
  if (!token) return [];

  try {
    const folderId = await getOrCreateHotelFolder(token);
    const query = `'${folderId}' in parents and trashed = false`;
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
        query
      )}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,iconLink)&orderBy=modifiedTime desc`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Failed to list drive files:', err);
    return [];
  }
}

/**
 * Restore hotel database from Google Drive backup file
 */
export async function restoreDatabaseFromDriveFile(fileId: string): Promise<{
  success: boolean;
  requestsRestored?: number;
  accountsRestored?: number;
  error?: string;
}> {
  const token = getDriveAccessToken();
  if (!token) {
    return { success: false, error: 'Google Drive authentication required.' };
  }

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error('Failed to download backup file from Google Drive');
    }

    const payload = await res.json();
    if (!payload || !payload.requests || !Array.isArray(payload.requests)) {
      throw new Error('Invalid backup file format: missing requests.');
    }

    // Restore requests
    saveStoredRequests(payload.requests);

    // Restore accounts if available
    if (payload.accounts && Array.isArray(payload.accounts) && payload.accounts.length > 0) {
      saveAllAccounts(payload.accounts);
    }

    saveDriveStatus({
      lastSyncResult: `Restored ${payload.requests.length} requests and ${payload.accounts?.length || 0} accounts from Google Drive`,
    });

    return {
      success: true,
      requestsRestored: payload.requests.length,
      accountsRestored: payload.accounts?.length || 0,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to restore database from Google Drive' };
  }
}

/**
 * Delete a file in Google Drive
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  const token = getDriveAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
