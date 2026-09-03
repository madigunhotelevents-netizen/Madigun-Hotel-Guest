/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, AppTab } from './components/Header';
import { GuestView } from './components/GuestView';
import { FrontDeskView } from './components/FrontDeskView';
import { RoomOccupancyView } from './components/RoomOccupancyView';
import { RecordsMonitoringView } from './components/RecordsMonitoringView';
import { CheckInCheckOutView } from './components/CheckInCheckOutView';
import { QRManagementView } from './components/QRManagementView';
import { AccountsManagementView } from './components/AccountsManagementView';
import { StaffLoginPage } from './components/StaffLoginPage';
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
  const [activeTab, setActiveTab] = useState<AppTab>('guest');
  const [roomNumber, setRoomNumber] = useState<string>('101');
  const [isGuestSession, setIsGuestSession] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [newRequestsCount, setNewRequestsCount] = useState<number>(0);
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(() => getCurrentUser());

  // Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Helper to extract room number and view mode from URL params, paths, and hashes
  const parseUrlState = (): { room: string | null; view: AppTab; hasQrParam: boolean } => {
    if (typeof window === 'undefined') return { room: null, view: 'guest', hasQrParam: false };

    const searchParams = new URLSearchParams(window.location.search);
    let detectedRoom = searchParams.get('room') || searchParams.get('r') || searchParams.get('rm');
    const viewParam = searchParams.get('view');

    // Check pathname patterns (e.g. /room/101, /rooms/204, /guest/305)
    const pathname = window.location.pathname;
    const pathMatch = pathname.match(/\/(?:room|rooms|guest|r)\/([^\/?#]+)/i);
    if (!detectedRoom && pathMatch && pathMatch[1]) {
      try {
        detectedRoom = decodeURIComponent(pathMatch[1]);
      } catch {
        detectedRoom = pathMatch[1];
      }
    }

    // Check hash patterns (e.g. #/room/101 or #room=101)
    const hash = window.location.hash;
    if (!detectedRoom && hash) {
      const hashMatch = hash.match(/(?:room|r)=([^&#]+)/i) || hash.match(/#\/(?:room|guest)\/([^/?#]+)/i);
      if (hashMatch && hashMatch[1]) {
        try {
          detectedRoom = decodeURIComponent(hashMatch[1]);
        } catch {
          detectedRoom = hashMatch[1];
        }
      }
    }

    // If a room parameter is detected in the URL, it is a guest scanning a QR code or accessing a room link!
    if (detectedRoom) {
      return { room: detectedRoom, view: 'guest', hasQrParam: true };
    }

    // Staff explicit views
    if (viewParam === 'frontdesk' || viewParam === 'staff') {
      return { room: null, view: 'frontdesk', hasQrParam: false };
    }
    if (viewParam === 'occupancy' || viewParam === 'rooms') {
      return { room: null, view: 'occupancy', hasQrParam: false };
    }
    if (viewParam === 'records' || viewParam === 'history') {
      return { room: null, view: 'records', hasQrParam: false };
    }
    if (viewParam === 'monitoring' || viewParam === 'stays' || viewParam === 'logs') {
      return { room: null, view: 'monitoring', hasQrParam: false };
    }
    if (viewParam === 'qr') {
      return { room: null, view: 'qr', hasQrParam: false };
    }
    if (viewParam === 'accounts' || viewParam === 'employees') {
      return { room: null, view: 'accounts', hasQrParam: false };
    }

    return { room: null, view: 'frontdesk', hasQrParam: false };
  };

  // Initialize room number and tab from URL
  useEffect(() => {
    const { room, view, hasQrParam } = parseUrlState();
    if (room) {
      setRoomNumber(room);
    }
    setIsGuestSession(hasQrParam);
    setActiveTab(hasQrParam ? 'guest' : view);

    const handlePopState = () => {
      const parsed = parseUrlState();
      if (parsed.room) {
        setRoomNumber(parsed.room);
      }
      setIsGuestSession(parsed.hasQrParam);
      setActiveTab(parsed.hasQrParam ? 'guest' : parsed.view);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
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
    const user = getCurrentUser();
    setCurrentUserState(user);

    const unsubscribeAuth = subscribeToAuthEvents(() => {
      const updatedUser = getCurrentUser();
      setCurrentUserState(updatedUser);
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
    setIsGuestSession(false);
    setActiveTab('frontdesk');

    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    url.searchParams.delete('r');
    url.searchParams.delete('rm');
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url.pathname);
  };

  // Handler when staff clicks "Test Room Screen" from QR generator, Occupancy view, or Front Desk
  const handleNavigateToGuestForRoom = (targetRoom: string) => {
    setRoomNumber(targetRoom);
    setActiveTab('guest');

    const url = new URL(window.location.href);
    url.searchParams.set('room', targetRoom);
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());
  };

  // Handler when unauthenticated guest enters room number on login screen
  const handleGuestRoomAccess = (targetRoom: string) => {
    setRoomNumber(targetRoom);
    setIsGuestSession(true);
    setActiveTab('guest');

    const url = new URL(window.location.href);
    url.searchParams.set('room', targetRoom);
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());
  };

  // If NO account is logged in, and NOT a guest QR scan / room session:
  // Render the Staff & Admin Login Page directly!
  if (!currentUser && !isGuestSession) {
    return (
      <StaffLoginPage
        onLoginSuccess={(user) => {
          setCurrentUserState(user);
          setActiveTab('frontdesk');
        }}
      />
    );
  }

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
            url.searchParams.delete('room');
          }
          window.history.replaceState({}, '', url.toString());
        }}
        newRequestsCount={newRequestsCount}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        currentRoom={roomNumber}
        currentUser={currentUser}
        onOpenLogin={() => {
          if (!currentUser) {
            setIsGuestSession(false);
            const url = new URL(window.location.href);
            url.searchParams.delete('room');
            window.history.replaceState({}, '', url.pathname);
          } else {
            setIsLoginModalOpen(true);
          }
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
        onSetDutyStatus={handleSetDutyStatus}
      />

      {/* Main Content Body */}
      <main className="flex-1 w-full pb-12">
        {/* If Guest Session (or staff testing guest view) */}
        {activeTab === 'guest' && (
          <GuestView
            roomNumber={roomNumber}
            setRoomNumber={setRoomNumber}
            soundEnabled={soundEnabled}
          />
        )}

        {/* Staff Views (Protected: Only for authenticated Staff/Admin) */}
        {currentUser && activeTab === 'frontdesk' && (
          <FrontDeskView
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            onNavigateToGuest={handleNavigateToGuestForRoom}
            currentUser={currentUser}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentUser && activeTab === 'occupancy' && (
          <RoomOccupancyView
            currentUser={currentUser}
            onSelectRoomForGuestView={handleNavigateToGuestForRoom}
          />
        )}

        {currentUser && activeTab === 'records' && (
          <RecordsMonitoringView
            currentUser={currentUser}
            onNavigateToGuest={handleNavigateToGuestForRoom}
          />
        )}

        {currentUser && activeTab === 'monitoring' && (
          <CheckInCheckOutView
            currentUser={currentUser}
            onSelectRoomForGuestView={handleNavigateToGuestForRoom}
          />
        )}

        {currentUser && activeTab === 'accounts' && (
          <AccountsManagementView
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
          />
        )}

        {currentUser && activeTab === 'qr' && (
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
          setActiveTab('frontdesk');
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
