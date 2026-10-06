import React from 'react';
import { StoreProvider, useStore } from './services/storeContext';
import { BiteTopBar, BiteBottomBar } from './components/BiteUiComponents';
import { SignInScreen } from './components/SignInScreen';
import { OnboardingGate } from './components/OnboardingGate';

import { FeedPage } from './pages/FeedPage';
import { ExplorePage } from './pages/ExplorePage';
import { PeoplePage } from './pages/PeoplePage';
import { DiaryPage } from './pages/DiaryPage';
import { ProfilePage } from './pages/ProfilePage';
import { DetailPage } from './pages/DetailPage';
import { OtherProfilePage } from './pages/OtherProfilePage';
import { EditProfilePage } from './pages/EditProfilePage';
import { PreferencesPage } from './pages/PreferencesPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

const BiteBoxdAppContent: React.FC = () => {
  const { currentRoute, routeHistory, navigateTo, navigateBack, place } = useStore();

  const isRoot = currentRoute.startsWith('tab:');
  const activeTab = routeHistory.slice().reverse().find(r => r.startsWith('tab:'))?.substring(4) || '0';
  const tabIndex = parseInt(activeTab, 10);

  const getPageTitle = (): string => {
    if (currentRoute === 'admin:dashboard') return 'Admin Dashboard';
    if (currentRoute === 'settings:edit') return 'Edit profile';
    if (currentRoute === 'settings:preferences') return 'Preferences';
    if (currentRoute.startsWith('place:')) {
      const p = place(currentRoute.substring(6));
      return p ? p.name : 'Restaurant';
    }
    if (currentRoute.startsWith('profile:')) return 'Profile';

    switch (tabIndex) {
      case 0: return 'Feed';
      case 1: return 'Explore';
      case 2: return 'People';
      case 3: return 'Diary';
      case 4: return 'Tasteboxd';
      default: return 'Tasteboxd';
    }
  };

  const renderContent = () => {
    if (currentRoute === 'admin:dashboard') return <AdminDashboardPage />;
    if (currentRoute === 'settings:edit') return <EditProfilePage />;
    if (currentRoute === 'settings:preferences') return <PreferencesPage />;
    if (currentRoute.startsWith('place:')) {
      return <DetailPage placeId={currentRoute.substring(6)} />;
    }
    if (currentRoute.startsWith('profile:')) {
      return <OtherProfilePage userId={currentRoute.substring(8)} />;
    }

    switch (tabIndex) {
      case 0: return <FeedPage />;
      case 1: return <ExplorePage />;
      case 2: return <PeoplePage />;
      case 3: return <DiaryPage />;
      case 4: return <ProfilePage />;
      default: return <FeedPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#235D5B] text-[#233B3B] font-sans flex justify-center selection:bg-[#926017] selection:text-white">
      <div className="w-full max-w-2xl bg-[#FAF8F1] min-h-screen shadow-2xl relative flex flex-col">
        {/* Top App Bar */}
        <BiteTopBar 
          title={getPageTitle()}
          isRoot={isRoot}
          brandTitle={isRoot && tabIndex === 4}
          onBack={!isRoot ? navigateBack : undefined}
          onAction={isRoot ? () => navigateTo('tab:1') : undefined}
        />

        {/* Dynamic Screen Content */}
        <main className="flex-1">
          {renderContent()}
        </main>

        {/* Fixed Bottom Navigation Bar */}
        {isRoot && (
          <BiteBottomBar 
            selectedTab={tabIndex} 
            onSelect={(idx) => navigateTo(`tab:${idx}`)} 
          />
        )}
      </div>
    </div>
  );
};

const AuthGateWrapper: React.FC = () => {
  const { currentUser, authLoading } = useStore();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#235D5B] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-white/20 border-t-[#926017] rounded-full animate-spin mb-4" />
        <p className="font-serif font-bold text-lg">Connecting to Tasteboxd…</p>
      </div>
    );
  }

  if (!currentUser) {
    return <SignInScreen />;
  }

  return (
    <OnboardingGate>
      <BiteBoxdAppContent />
    </OnboardingGate>
  );
};

export const App: React.FC = () => {
  return (
    <StoreProvider>
      <AuthGateWrapper />
    </StoreProvider>
  );
};

export default App;
