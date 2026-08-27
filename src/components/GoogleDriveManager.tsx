import React, { useState, useEffect } from 'react';
import {
  Cloud,
  HardDrive,
  Upload,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FolderSync,
  ExternalLink,
  Trash2,
  FileJson,
  Calendar,
  Sparkles,
  Database,
  Layers,
  LogOut,
  X,
  ShieldCheck,
} from 'lucide-react';
import {
  getDriveStatus,
  saveDriveStatus,
  getDriveAccessToken,
  requestDriveAuthorization,
  clearDriveAuth,
  uploadHotelDatabaseBackup,
  listDriveBackupFiles,
  restoreDatabaseFromDriveFile,
  deleteDriveFile,
  GoogleDriveFile,
  DriveSyncStatus,
} from '../services/googleDriveService';
import { UserProfile } from '../types/hotel';
import { getStoredRequests } from '../services/storageService';
import { getAllAccounts } from '../services/authService';

interface GoogleDriveManagerProps {
  currentUser?: UserProfile | null;
  onDataRestored?: () => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({
  currentUser,
  onDataRestored,
  isModal = false,
  onClose,
}) => {
  const [status, setStatus] = useState<DriveSyncStatus>(getDriveStatus());
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showFeedback = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => {
      setFeedback(null);
    }, 4500);
  };

  const refreshFilesList = async () => {
    if (!getDriveAccessToken()) {
      setDriveFiles([]);
      return;
    }
    setIsLoadingFiles(true);
    const files = await listDriveBackupFiles();
    setDriveFiles(files);
    setIsLoadingFiles(false);
    setStatus(getDriveStatus());
  };

  useEffect(() => {
    setStatus(getDriveStatus());
    if (getDriveAccessToken()) {
      refreshFilesList();
    }
  }, []);

  const handleConnectDrive = async () => {
    showFeedback('info', 'Opening Google Sign-In...');
    const res = await requestDriveAuthorization('madigunhotelevents@gmail.com');
    if (res.success) {
      setStatus(getDriveStatus());
      showFeedback('success', 'Google Drive connected successfully!');
      await refreshFilesList();
    } else {
      showFeedback('error', res.error || 'Failed to authenticate with Google Drive.');
    }
  };

  const handleDisconnect = async () => {
    await clearDriveAuth();
    setStatus(getDriveStatus());
    setDriveFiles([]);
    showFeedback('info', 'Disconnected Google Drive account.');
  };

  const handleManualBackup = async () => {
    if (!getDriveAccessToken()) {
      await handleConnectDrive();
      if (!getDriveAccessToken()) return;
    }

    setIsBackingUp(true);
    const res = await uploadHotelDatabaseBackup();
    setIsBackingUp(false);

    if (res.success) {
      showFeedback('success', `Database backed up to Google Drive (${res.file?.name})!`);
      refreshFilesList();
    } else {
      showFeedback('error', res.error || 'Failed to backup database to Google Drive.');
    }
  };

  const handleRestore = async (file: GoogleDriveFile) => {
    const confirmed = window.confirm(
      `Are you sure you want to restore the hotel database from backup "${file.name}"? Current hotel requests and staff directory will be synchronized with this cloud snapshot.`
    );
    if (!confirmed) return;

    setIsRestoringId(file.id);
    const res = await restoreDatabaseFromDriveFile(file.id);
    setIsRestoringId(null);

    if (res.success) {
      showFeedback('success', `Database restored: ${res.requestsRestored} requests & ${res.accountsRestored} staff synchronized!`);
      onDataRestored?.();
    } else {
      showFeedback('error', res.error || 'Failed to restore database from Google Drive.');
    }
  };

  const handleDeleteFile = async (file: GoogleDriveFile) => {
    const confirmed = window.confirm(`Delete backup file "${file.name}" from Google Drive?`);
    if (!confirmed) return;

    setIsDeletingId(file.id);
    const ok = await deleteDriveFile(file.id);
    setIsDeletingId(null);

    if (ok) {
      showFeedback('info', `Deleted "${file.name}" from Google Drive.`);
      refreshFilesList();
    } else {
      showFeedback('error', 'Failed to delete file from Google Drive.');
    }
  };

  const toggleAutoSync = () => {
    const next = !status.autoSyncEnabled;
    const updated = saveDriveStatus({ autoSyncEnabled: next });
    setStatus(updated);
    showFeedback('info', next ? 'Automated Google Drive periodic server sync enabled.' : 'Automated sync disabled.');
  };

  return (
    <div className="bg-[#171614] border border-[#2C2A26] rounded-2xl p-5 sm:p-7 space-y-6 shadow-2xl text-[#F3EFEA]">
      {/* Top Banner Header */}
      <div className="flex items-start justify-between gap-4 border-b border-[#2C2A26] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/40 flex items-center justify-center text-[#C5A880]">
              <Cloud className="w-4 h-4" />
            </div>
            <span className="text-xs uppercase tracking-widest text-[#C5A880] font-semibold">
              Google Drive Cloud Integration
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif-luxury text-[#F3EFEA]">
            Google Drive Cloud Storage &amp; Backup
          </h2>
          <p className="text-xs text-[#9E978C]">
            Backup, synchronize, and restore live hotel requests, guest orders, and staff records directly with Google Drive.
          </p>
        </div>

        {isModal && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-[#22201D] hover:bg-[#2F2C27] text-[#9E978C] hover:text-[#F3EFEA] border border-[#38342D] transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-xs flex items-center gap-2.5 shadow-lg animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-[#14291B] border border-[#22C55E]/50 text-[#86EFAC]'
              : feedback.type === 'error'
              ? 'bg-[#2A1517] border border-[#E63946]/50 text-[#FFCCD5]'
              : 'bg-[#1A2234] border border-[#3B82F6]/50 text-[#93C5FD]'
          }`}
        >
          {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />}
          {feedback.type === 'error' && <AlertCircle className="w-4 h-4 text-[#E63946] shrink-0" />}
          {feedback.type === 'info' && <Sparkles className="w-4 h-4 text-[#3B82F6] shrink-0" />}
          <span className="font-medium">{feedback.text}</span>
        </div>
      )}

      {/* Connection Status Card */}
      <div
        className={`rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
          status.connected
            ? 'bg-[#14241B] border-[#22C55E]/40'
            : 'bg-[#1D1B17] border-[#38342D]'
        }`}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              status.connected
                ? 'bg-[#22C55E]/20 text-[#86EFAC] border border-[#22C55E]/40'
                : 'bg-[#2C2924] text-[#A8A196] border border-[#3E3A33]'
            }`}
          >
            {status.connected ? <FolderSync className="w-5 h-5" /> : <HardDrive className="w-5 h-5" />}
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-serif-luxury text-[#F3EFEA]">
                {status.connected ? 'Google Drive Cloud Storage: Active' : 'Google Drive: Not Connected'}
              </h3>
              <span
                className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                  status.connected ? 'bg-[#22C55E] text-[#121110]' : 'bg-[#3A3630] text-[#B8B2A7]'
                }`}
              >
                {status.connected ? 'Connected' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-[#B8B2A7]">
              {status.connected
                ? `Authorized account: ${status.userEmail || 'madigunhotelevents@gmail.com'} • Storage Folder: "Madigun Hotel Server Storage"`
                : 'Sign in with Google to enable automatic database snapshots, requests backup, and cloud restore.'}
            </p>
            {status.lastSyncResult && (
              <p className="text-[11px] text-[#C5A880] pt-0.5">
                Last Cloud Event: {status.lastSyncResult}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status.connected ? (
            <>
              <button
                type="button"
                onClick={handleManualBackup}
                disabled={isBackingUp}
                className="px-3.5 py-2 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isBackingUp ? 'Backing Up...' : 'Backup to Drive'}</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-2 rounded-lg bg-[#221F1B] hover:bg-[#2F2A24] border border-[#3E3A33] text-[#A8A196] hover:text-[#E63946] text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                title="Disconnect Google Drive"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleConnectDrive}
              className="gsi-material-button px-4 py-2 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Cloud className="w-4 h-4" />
              <span>Connect Google Drive</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Metrics & Local Database Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#121110] border border-[#262420] rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877C] flex items-center gap-1">
            <Database className="w-3 h-3 text-[#C5A880]" />
            <span>Local Requests</span>
          </span>
          <span className="text-xl font-bold font-mono text-[#F3EFEA]">
            {getStoredRequests().length}
          </span>
        </div>

        <div className="bg-[#121110] border border-[#262420] rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877C] flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#C5A880]" />
            <span>Staff Accounts</span>
          </span>
          <span className="text-xl font-bold font-mono text-[#F3EFEA]">
            {getAllAccounts().length}
          </span>
        </div>

        <div className="bg-[#121110] border border-[#262420] rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877C] flex items-center gap-1">
            <FileJson className="w-3 h-3 text-[#C5A880]" />
            <span>Drive Snapshots</span>
          </span>
          <span className="text-xl font-bold font-mono text-[#86EFAC]">
            {driveFiles.length}
          </span>
        </div>

        <div className="bg-[#121110] border border-[#262420] rounded-xl p-3.5 space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8E877C]">
            Auto Cloud Sync
          </span>
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={toggleAutoSync}
              className={`text-xs px-2.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                status.autoSyncEnabled
                  ? 'bg-[#22C55E]/20 text-[#86EFAC] border border-[#22C55E]/40'
                  : 'bg-[#22201D] text-[#8E877C] border border-[#33302A]'
              }`}
            >
              {status.autoSyncEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>
        </div>
      </div>

      {/* Drive Files List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-[#C5A880]" />
            <h3 className="text-sm font-bold text-[#F3EFEA] font-serif-luxury">
              Google Drive Cloud Backups
            </h3>
          </div>
          <button
            type="button"
            onClick={refreshFilesList}
            disabled={isLoadingFiles || !status.connected}
            className="text-xs px-2.5 py-1 rounded bg-[#1C1B18] hover:bg-[#252320] border border-[#33302A] text-[#B8B2A7] hover:text-[#F3EFEA] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
            <span>Refresh List</span>
          </button>
        </div>

        {!status.connected ? (
          <div className="bg-[#121110] border border-[#262420] rounded-xl p-8 text-center space-y-3">
            <Cloud className="w-8 h-8 text-[#7A756D] mx-auto opacity-70" />
            <p className="text-xs text-[#A8A196] max-w-md mx-auto">
              Connect your Google Drive account above to store hotel backups, export reports, and synchronize records across front desk stations.
            </p>
            <button
              type="button"
              onClick={handleConnectDrive}
              className="px-3.5 py-1.5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Connect Google Drive</span>
            </button>
          </div>
        ) : driveFiles.length === 0 ? (
          <div className="bg-[#121110] border border-[#262420] rounded-xl p-8 text-center space-y-3">
            <FileJson className="w-8 h-8 text-[#7A756D] mx-auto opacity-70" />
            <p className="text-xs text-[#A8A196]">
              No backup files found in "Madigun Hotel Server Storage" folder in Google Drive yet.
            </p>
            <button
              type="button"
              onClick={handleManualBackup}
              disabled={isBackingUp}
              className="px-3.5 py-1.5 rounded-lg bg-[#C5A880] hover:bg-[#B39366] text-[#121110] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Create First Backup to Google Drive</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#262420] border border-[#262420] rounded-xl overflow-hidden bg-[#121110]">
            {driveFiles.map((file) => (
              <div
                key={file.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#181715] transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A880]/15 border border-[#C5A880]/30 flex items-center justify-center text-[#C5A880] shrink-0 mt-0.5">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-semibold text-[#F3EFEA] truncate">
                        {file.name}
                      </h4>
                      {file.size && (
                        <span className="text-[10px] text-[#8E877C] font-mono">
                          ({(parseInt(file.size, 10) / 1024).toFixed(1)} KB)
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8E877C] flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#C5A880]" />
                        {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : 'Recent'}
                      </span>
                      <span>•</span>
                      <span className="text-[#86EFAC]">Google Drive</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  {file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded bg-[#1C1B18] hover:bg-[#252320] border border-[#33302A] text-[#B8B2A7] hover:text-[#F3EFEA] text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Open in Google Drive"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Open in Drive</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRestore(file)}
                    disabled={isRestoringId === file.id}
                    className="px-3 py-1.5 rounded bg-[#C5A880] hover:bg-[#B39366] text-[#121110] text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Restore database to this point"
                  >
                    <Download className="w-3 h-3" />
                    <span>{isRestoringId === file.id ? 'Restoring...' : 'Restore'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteFile(file)}
                    disabled={isDeletingId === file.id}
                    className="p-1.5 rounded bg-[#221F1B] hover:bg-[#2F2123] border border-[#38302A] text-[#9E978C] hover:text-[#E63946] text-xs transition-colors cursor-pointer"
                    title="Delete backup from Drive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
