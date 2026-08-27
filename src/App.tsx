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

  // Helper to extract room number and view mode from URL params, paths, and hashes
  const parseUrlState = () => {
    if (typeof window === 'undefined') return { room: '101', view: 'guest' };

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

    // If a room parameter is detected in the URL, it is a guest scanning a QR code!
    if (detectedRoom) {
      localStorage.setItem('madigun_active_guest_room', detectedRoom);
      return { room: detectedRoom, view: 'guest' as const };
    }

    // Staff explicit views
    if (viewParam === 'frontdesk' || viewParam === 'staff') {
      return { room: localStorage.getItem('madigun_active_guest_room') || '101', view: 'frontdesk' as const };
    }
    if (viewParam === 'storage' || viewParam === 'drive' || viewParam === 'deploy') {
      return { room: localStorage.getItem('madigun_active_guest_room') || '101', view: 'storage' as const };
    }
    if (viewParam === 'qr') {
      return { room: localStorage.getItem('madigun_active_guest_room') || '101', view: 'qr' as const };
    }
    if (viewParam === 'accounts' || viewParam === 'employees') {
      return { room: localStorage.getItem('madigun_active_guest_room') || '101', view: 'accounts' as const };
    }

    // Default: Automatic Guest User Interface (No login required)
    const savedGuestRoom = localStorage.getItem('madigun_active_guest_room') || '101';
    return { room: savedGuestRoom, view: 'guest' as const };
  };

  // Initialize room number and tab from URL & automatically remove Netlify badge/widgets
  useEffect(() => {
    const { room, view } = parseUrlState();
    setRoomNumber(room);
    setActiveTab(view);

    // Listen to popstate / history changes
    const handlePopState = () => {
      const parsed = parseUrlState();
      setRoomNumber(parsed.room);
      setActiveTab(parsed.view);
    };

    window.addEventListener('popstate', handlePopState);

    // Automatically remove/hide any Netlify badge, preview bar, or feedback drawer
    const hideNetlifyElements = () => {
      const selectors = [
        '#netlify-identity-widget',
        '[data-netlify-deploy-id]',
        '[class*="netlify"]',
        '[id*="netlify"]',
        'iframe[src*="netlify"]',
        'a[href*="netlify.com"]',
        'a[href*="netlify.app"]',
      ];
      selectors.forEach((sel) => {
        try {
          document.querySelectorAll(sel).forEach((el) => {
            (el as HTMLElement).style.setProperty('display', 'none', 'important');
            (el as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
            (el as HTMLElement).style.setProperty('opacity', '0', 'important');
            (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
          });
        } catch {}
      });
    };

    hideNetlifyElements();
    const netlifyInterval = setInterval(hideNetlifyElements, 1000);

    const observer = new MutationObserver(() => {
      hideNetlifyElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      clearInterval(netlifyInterval);
      observer.disconnect();
    };
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
