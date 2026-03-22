import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";

const Landing = lazy(() => import('./pages/landing'));
const Login = lazy(() => import('./pages/login'));
const Contact = lazy(() => import('./pages/contact'));
const DailySummary = lazy(() => import('./pages/daily-summary'));
const HorseTimeline = lazy(() => import('./pages/horse-timeline'));
const HorseList = lazy(() => import('./pages/horse-list'));
const WorldMap = lazy(() => import('./pages/world-map'));
const Profile = lazy(() => import('./pages/profile'));
const Devices = lazy(() => import('./pages/devices'));
const Bills = lazy(() => import('./pages/bills'));
const AdminDashboard = lazy(() => import('./pages/admin'));
const AdminStables = lazy(() => import('./pages/admin/stables'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F6F2' }}>
    <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#40352C', borderTopColor: 'transparent' }} />
  </div>
);

const Routes: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <Suspense fallback={<PageLoader />}>
          <RouterRoutes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/daily-summary" element={<DailySummary />} />
            <Route path="/horse-timeline" element={<HorseTimeline />} />
            <Route path="/horse-list" element={<HorseList />} />
            <Route path="/world-map" element={<WorldMap />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/stables" element={<AdminStables />} />
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;