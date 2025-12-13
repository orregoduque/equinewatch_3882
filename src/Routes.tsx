import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import NotFound from "pages/NotFound";
import DailySummary from './pages/daily-summary';
import Login from './pages/login';
import HorseTimeline from './pages/horse-timeline';
import HorseList from './pages/horse-list';
import WorldMap from './pages/world-map';
import Profile from './pages/profile';

const Routes: React.FC = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Define your routes here */}
        <Route path="/" element={<Login />} />
        <Route path="/daily-summary" element={<DailySummary />} />
        <Route path="/login" element={<Login />} />
        <Route path="/horse-timeline" element={<HorseTimeline />} />
        <Route path="/horse-list" element={<HorseList />} />
        <Route path="/world-map" element={<WorldMap />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;