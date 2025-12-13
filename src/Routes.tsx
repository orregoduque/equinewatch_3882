import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import Login from './pages/login';

const DailySummary = lazy(() => import('./pages/daily-summary'));
const HorseTimeline = lazy(() => import('./pages/horse-timeline'));
const HorseList = lazy(() => import('./pages/horse-list'));
const WorldMap = lazy(() => import('./pages/world-map'));
const Profile = lazy(() => import('./pages/profile'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
    <div className="w-8 h-8 border-2 border-[#c9a962] border-t-transparent rounded-full animate-spin" />
  </div>
);

const Routes: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <RouterRoutes>
            <Route path="/" element={<Login />} />
            <Route path="/daily-summary" element={<DailySummary />} />
            <Route path="/login" element={<Login />} />
            <Route path="/horse-timeline" element={<HorseTimeline />} />
            <Route path="/horse-list" element={<HorseList />} />
            <Route path="/world-map" element={<WorldMap />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;