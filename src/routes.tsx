import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { MiniAppLayout } from '@/layouts/MiniAppLayout';
import { BundlesPage } from '@/pages/bundles/BundlesPage';
import { CollectionPage } from '@/pages/collection/CollectionPage';
import { CompanionPage } from '@/pages/companions/CompanionPage';
import { CreateCharacterPage } from '@/pages/create-character/CreateCharacterPage';
import { ExplorePage as LegacyExplorePage } from '@/pages/explore/ExplorePage';
import { ExplorePage } from '@/pages/explore-new/ExplorePage';
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

export function AppRoutes() {
  return (
    <Routes>
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
        <Route path="/bag" element={<Navigate to="/subscriptions" replace />} />
      </Route>
    </Routes>
  );
}
