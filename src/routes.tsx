import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';

import { LaunchParamsProvider } from '@/context/LaunchParamsContext';
import { UserProvider } from '@/context/UserContext';
import { MiniAppLayout } from '@/layouts/MiniAppLayout';
import { BundlesPage } from '@/pages/bundles/BundlesPage';
import { CollectionPage } from '@/pages/collection/CollectionPage';
import { CompanionPage } from '@/pages/companions/CompanionPage';
import { CreateCharacterPage } from '@/pages/create-character/CreateCharacterPage';
import { ExplorePage as LegacyExplorePage } from '@/pages/explore/ExplorePage';
import { ExplorePage } from '@/pages/explore-new/ExplorePage';
import { LegalDocPage } from '@/pages/legal/LegalDocPage';
import { MyGirlsPage } from '@/pages/my-girls/MyGirlsPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
import { ScenarioDetailsPage } from '@/pages/scenarios/ScenarioDetailsPage';
import { ShopPage } from '@/pages/shop/ShopPage';
import { SubscriptionsPage } from '@/pages/subscriptions/SubscriptionsPage';

function ShopRedirect() {
  const location = useLocation();

  return (
    <Navigate
      to={{ pathname: '/shop', search: location.search, hash: location.hash }}
      replace
    />
  );
}

/**
 * Providers that talk to the backend with Telegram init data.
 * Public pages (legal docs) live outside so they don't fire `/me` requests
 * when opened in a regular browser.
 */
function TelegramAppProviders() {
  return (
    <LaunchParamsProvider>
      <UserProvider>
        <Outlet />
      </UserProvider>
    </LaunchParamsProvider>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/privacy-policy/:lang?"
        element={<LegalDocPage docId="privacy-policy" />}
      />
      <Route
        path="/user-agreement/:lang?"
        element={<LegalDocPage docId="user-agreement" />}
      />

      <Route element={<TelegramAppProviders />}>
        <Route element={<MiniAppLayout />}>
          <Route path="/" element={<Navigate to="/explore" replace />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore-old" element={<LegacyExplorePage />} />
          <Route path="/collection" element={<CollectionPage />} />
          <Route path="/my-girls" element={<MyGirlsPage />} />
          <Route path="/create-character" element={<CreateCharacterPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/bundles" element={<BundlesPage />} />
          <Route path="/companions/:id" element={<CompanionPage />} />
          <Route path="/girls/:id" element={<CompanionPage />} />
          <Route path="/scenarios/:id" element={<ScenarioDetailsPage />} />

          <Route path="/girls" element={<Navigate to="/explore" replace />} />
          <Route path="/gifts" element={<ShopRedirect />} />
          <Route path="/store" element={<Navigate to="/shop" replace />} />
          <Route
            path="/bag"
            element={<Navigate to="/subscriptions" replace />}
          />
        </Route>
      </Route>
    </Routes>
  );
}
