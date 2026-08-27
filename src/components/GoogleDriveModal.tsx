import React from 'react';
import { GoogleDriveManager } from './GoogleDriveManager';
import { UserProfile } from '../types/hotel';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onDataRestored?: () => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onDataRestored,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <GoogleDriveManager
          currentUser={currentUser}
          onDataRestored={onDataRestored}
          isModal={true}
          onClose={onClose}
        />
      </div>
    </div>
  );
};
