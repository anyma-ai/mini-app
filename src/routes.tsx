import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { MiniAppLayout } from '@/layouts/MiniAppLayout';
import { CompanionPage } from '@/pages/companions/CompanionPage';
import { ExplorePage } from '@/pages/explore/ExplorePage';
import { MagicPage } from '@/pages/magic/MagicPage';
import { ProfilePage } from '@/pages/profile/ProfilePage';
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
        <Route path="/magic" element={<MagicPage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/companions/:id" element={<CompanionPage />} />
        <Route path="/girls/:id" element={<CompanionPage />} />

        <Route path="/girls" element={<Navigate to="/explore" replace />} />
        <Route path="/gifts" element={<ShopRedirect />} />
        <Route path="/store" element={<Navigate to="/shop" replace />} />
        <Route path="/bag" element={<Navigate to="/subscriptions" replace />} />
      </Route>
    </Routes>
  );
}
