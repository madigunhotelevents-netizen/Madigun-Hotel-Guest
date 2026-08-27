/**
 * Google Drive Cloud Storage Integration for Madigun Hotel & Events
 * Supports real OAuth token authentication, file creation/upload, folder management,
 * automated database backups, synchronization, and downloading.
 */

import { HotelRequest } from '../types/hotel';
import { UserProfile } from '../types/hotel';
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
  lastBackupTime?: number;
  lastSyncResult?: string;
  folderId?: string;
  autoSyncEnabled?: boolean;
}

const DRIVE_TOKEN_KEY = 'madigun_gdrive_access_token';
const DRIVE_TOKEN_EXPIRY_KEY = 'madigun_gdrive_token_expiry';
const DRIVE_STATUS_KEY = 'madigun_gdrive_status';
const DRIVE_FOLDER_NAME = 'Madigun Hotel Server Storage';

// Check if token exists and is not expired
export function getDriveAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(DRIVE_TOKEN_KEY);
  const expiry = localStorage.getItem(DRIVE_TOKEN_EXPIRY_KEY);
  if (!token) return null;
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    localStorage.removeItem(DRIVE_TOKEN_KEY);
    localStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
    return null;
  }
  return token;
}

export function saveDriveAccessToken(token: string, expiresInSeconds: number = 3600): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DRIVE_TOKEN_KEY, token);
  localStorage.setItem(DRIVE_TOKEN_EXPIRY_KEY, (Date.now() + (expiresInSeconds - 60) * 1000).toString());
}

export function clearDriveAuth(): void {
  if (typeof window === 'undefined') return;
  const token = getDriveAccessToken();
  if (token && (window as any).google?.accounts?.oauth2) {
    try {
      (window as any).google.accounts.oauth2.revoke(token, () => {});
    } catch {
      // Ignore error during revoke
    }
  }
  localStorage.removeItem(DRIVE_TOKEN_KEY);
  localStorage.removeItem(DRIVE_TOKEN_EXPIRY_KEY);
  const status = getDriveStatus();
  saveDriveStatus({ ...status, connected: false, userEmail: undefined });
}

export function getDriveStatus(): DriveSyncStatus {
  if (typeof window === 'undefined') {
    return { connected: false, autoSyncEnabled: false };
  }
  try {
    const raw = localStorage.getItem(DRIVE_STATUS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const hasToken = Boolean(getDriveAccessToken());
      return { ...parsed, connected: hasToken };
    }
  } catch {
    // fallback
  }
  return {
    connected: Boolean(getDriveAccessToken()),
    autoSyncEnabled: false,
  };
}

export function saveDriveStatus(status: Partial<DriveSyncStatus>): DriveSyncStatus {
  const current = getDriveStatus();
  const updated = { ...current, ...status };
  if (typeof window !== 'undefined') {
    localStorage.setItem(DRIVE_STATUS_KEY, JSON.stringify(updated));
  }
  return updated;
}

/**
 * Request Google Drive OAuth Token via Google Identity Services (GSI)
 */
export async function requestDriveAuthorization(userEmailPrompt?: string): Promise<{ success: boolean; token?: string; error?: string }> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      return resolve({ success: false, error: 'Window not available' });
    }

    const gsi = (window as any).google?.accounts?.oauth2;
    if (!gsi) {
      return resolve({
        success: false,
        error: 'Google Identity Services library is loading. Please check internet connection or retry in a moment.',
      });
    }

    try {
      // Standard AI Studio client id or prompt token client
      const tokenClient = gsi.initTokenClient({
        client_id: '565286406815-development.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file',
        hint: userEmailPrompt || 'madigunhotelevents@gmail.com',
        callback: async (response: any) => {
          if (response.error) {
            resolve({ success: false, error: response.error_description || response.error });
            return;
          }

          if (response.access_token) {
            saveDriveAccessToken(response.access_token, response.expires_in || 3600);
            
            // Try getting user profile info
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              if (userInfoRes.ok) {
                const info = await userInfoRes.json();
                saveDriveStatus({ connected: true, userEmail: info.email });
              } else {
                saveDriveStatus({ connected: true, userEmail: userEmailPrompt || 'madigunhotelevents@gmail.com' });
              }
            } catch {
              saveDriveStatus({ connected: true, userEmail: userEmailPrompt || 'madigunhotelevents@gmail.com' });
            }

            resolve({ success: true, token: response.access_token });
          } else {
            resolve({ success: false, error: 'No access token received from Google.' });
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: '' });
    } catch (err: any) {
      resolve({ success: false, error: err?.message || 'Failed to initialize Google OAuth client.' });
    }
  });
}

/**
 * Get or Create the dedicated Hotel Server Storage folder in Google Drive
 */
export async function getOrCreateHotelFolder(token: string): Promise<string> {
  const status = getDriveStatus();
  if (status.folderId) {
    // Verify it exists
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
    } catch {
      // Folder might be deleted, re-create
    }
  }

  // Search for existing folder
  const query = `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
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
      description: 'Central server cloud storage for Madigun Hotel & Events database backups and service logs',
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
    return { success: false, error: 'Not authenticated with Google Drive. Please connect account.' };
  }

  try {
    const folderId = await getOrCreateHotelFolder(token);

    // Prepare complete database payload
    const backupData = {
      hotelName: 'Madigun Hotel & Events',
      exportedAt: new Date().toISOString(),
      timestamp: Date.now(),
      systemVersion: '2.4.0',
      storageSchema: 'madigun_hotel_v2',
      statistics: {
        totalRequests: getStoredRequests().length,
        totalAccounts: getAllAccounts().length,
      },
      requests: getStoredRequests(),
      accounts: getAllAccounts(),
    };

    const fileName = `Madigun_Hotel_Database_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    const fileContent = JSON.stringify(backupData, null, 2);

    // Check if an existing file with this name already exists in the folder
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
      // Update existing file content
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
      // Multipart upload for metadata + media
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: fileName,
        mimeType: 'application/json',
        parents: [folderId],
        description: `Automated server backup of Madigun Hotel requests, staff directory, and dispatch records`,
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
      throw new Error(errJson.error?.message || 'Failed to upload file to Google Drive');
    }

    const uploadedFile: GoogleDriveFile = await uploadRes.json();
    saveDriveStatus({
      lastBackupTime: Date.now(),
      lastSyncResult: `Backed up ${backupData.requests.length} requests & ${backupData.accounts.length} staff to "${fileName}"`,
    });

    return { success: true, file: uploadedFile };
  } catch (err: any) {
    console.error('Google Drive backup error:', err);
    saveDriveStatus({ lastSyncResult: `Error: ${err?.message || 'Backup failed'}` });
    return { success: false, error: err?.message || 'Google Drive backup failed' };
  }
}

/**
 * List all backup files inside the Hotel Server Storage folder
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
 * Download and Restore Hotel Database from a selected Google Drive backup file
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
      throw new Error('Failed to download backup file content from Google Drive');
    }

    const payload = await res.json();
    if (!payload || !payload.requests || !Array.isArray(payload.requests)) {
      throw new Error('Invalid backup file format: missing requests array.');
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
