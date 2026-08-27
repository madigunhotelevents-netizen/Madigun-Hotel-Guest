/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GuestView } from './components/GuestView';
import { FrontDeskView } from './components/FrontDeskView';
import { QRManagementView } from './components/QRManagementView';
import { AccountsManagementView } from './components/AccountsManagementView';
import { GoogleDriveManager } from './components/GoogleDriveManager';
import { LoginModal } from './components/LoginModal';
import { ProfileModal } from './components/ProfileModal';
import { getStoredRequests, subscribeToRequestEvents } from './services/storageService';
import {
  getCurrentUser,
  setCurrentUser,
  subscribeToAuthEvents,
  logout,
  setDutyStatus,
} from './services/authService';
import { playConciergeBell, playUrgentAlert } from './services/soundService';
import { UserProfile, DutyStatus } from './types/hotel';

export default function App() {
  const [activeTab, setActiveTab] = useState<'guest' | 'frontdesk' | 'qr' | 'accounts' | 'storage'>('guest');
  const [roomNumber, setRoomNumber] = useState<string>('101');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [newRequestsCount, setNewRequestsCount] = useState<number>(0);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);

  // Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Initialize room number and tab from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      const viewParam = params.get('view');

      if (roomParam) {
        setRoomNumber(roomParam);
        setActiveTab('guest');
      } else if (viewParam === 'frontdesk' || viewParam === 'staff') {
        setActiveTab('frontdesk');
      } else if (viewParam === 'storage' || viewParam === 'drive' || viewParam === 'deploy') {
        setActiveTab('storage');
      } else if (viewParam === 'qr') {
        setActiveTab('qr');
      } else if (viewParam === 'accounts' || viewParam === 'employees') {
        setActiveTab('accounts');
      }
    }
  }, []);

  // Update new requests counter & subscribe to alerts
  const updateCounts = () => {
    const requests = getStoredRequests();
    const newCount = requests.filter((r) => r.status === 'NEW').length;
    setNewRequestsCount(newCount);
  };

  useEffect(() => {
    updateCounts();

    const unsubscribe = subscribeToRequestEvents((event) => {
      updateCounts();
      if (event.type === 'NEW_REQUEST_SUBMITTED' && event.request) {
        if (soundEnabled) {
          if (event.request.isEmergency) {
            playUrgentAlert();
          } else {
            playConciergeBell();
          }
        }
      }
    });

    return unsubscribe;
  }, [soundEnabled]);

  // Sync user state and listen to auth events
  useEffect(() => {
    setCurrentUserState(getCurrentUser());

    const unsubscribeAuth = subscribeToAuthEvents(() => {
      setCurrentUserState(getCurrentUser());
    });

    return unsubscribeAuth;
  }, []);

  // Duty status change handler
  const handleSetDutyStatus = (status: DutyStatus) => {
    if (currentUser) {
      const updated = setDutyStatus(currentUser.id, status);
      if (updated) {
        setCurrentUserState(updated);
      }
    }
  };

  // Logout handler
  const handleLogout = () => {
    logout();
    setCurrentUserState(null);
  };

  // Handler when staff clicks "Test Room Screen" from QR generator or Front Desk
  const handleNavigateToGuestForRoom = (targetRoom: string) => {
    setRoomNumber(targetRoom);
    setActiveTab('guest');

    // Update URL param cleanly without reload
    const url = new URL(window.location.href);
    url.searchParams.set('room', targetRoom);
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="min-h-screen bg-[#121110] text-[#F3EFEA] flex flex-col font-sans">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          const url = new URL(window.location.href);
          if (tab === 'guest') {
            url.searchParams.set('room', roomNumber);
            url.searchParams.delete('view');
          } else {
            url.searchParams.set('view', tab);
          }
          window.history.replaceState({}, '', url.toString());
        }}
        newRequestsCount={newRequestsCount}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        currentRoom={roomNumber}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
        onSetDutyStatus={handleSetDutyStatus}
      />

      {/* Main Content Body */}
      <main className="flex-1 w-full pb-12">
        {activeTab === 'guest' && (
          <GuestView
            roomNumber={roomNumber}
            setRoomNumber={setRoomNumber}
            soundEnabled={soundEnabled}
          />
        )}

        {activeTab === 'frontdesk' && (
          <FrontDeskView
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            onNavigateToGuest={handleNavigateToGuestForRoom}
            currentUser={currentUser}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'accounts' && (
          <AccountsManagementView
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        )}

        {activeTab === 'storage' && (
          <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
            <GoogleDriveManager
              currentUser={currentUser}
              onDataRestored={() => {
                updateCounts();
              }}
            />
          </div>
        )}

        {activeTab === 'qr' && (
          <QRManagementView
            onTestRoom={handleNavigateToGuestForRoom}
          />
        )}
      </main>

      {/* Global Modals */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUserState(user);
        }}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        targetAccount={currentUser}
        onProfileUpdated={(updated) => {
          setCurrentUserState(updated);
        }}
      />
    </div>
  );
}
