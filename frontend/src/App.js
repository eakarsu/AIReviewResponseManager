import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Reviews from './pages/Reviews';
import ReviewDetail from './pages/ReviewDetail';
import Templates from './pages/Templates';
import TemplateDetail from './pages/TemplateDetail';
import Businesses from './pages/Businesses';
import BusinessDetail from './pages/BusinessDetail';
import Drafts from './pages/Drafts';
import DraftDetail from './pages/DraftDetail';
import Settings from './pages/Settings';
import Layout from './components/Layout';
// AI Feature Pages
import FakeReviewDetector from './pages/FakeReviewDetector';
import FakeReviewDetail from './pages/FakeReviewDetail';
import ReviewSummarizer from './pages/ReviewSummarizer';
import SummaryDetail from './pages/SummaryDetail';
import TrendAnalyzer from './pages/TrendAnalyzer';
import TrendDetail from './pages/TrendDetail';
import CounterfeitDetector from './pages/CounterfeitDetector';
import CounterfeitDetail from './pages/CounterfeitDetail';
import CompetitorMonitor from './pages/CompetitorMonitor';
import CompetitorDetail from './pages/CompetitorDetail';
import ResponsePersonalizer from './pages/ResponsePersonalizer';
import PersonalizerDetail from './pages/PersonalizerDetail';
import ReviewSolicitor from './pages/ReviewSolicitor';
import SolicitorDetail from './pages/SolicitorDetail';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviews"
                element={
                  <ProtectedRoute>
                    <Reviews />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviews/:id"
                element={
                  <ProtectedRoute>
                    <ReviewDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/templates"
                element={
                  <ProtectedRoute>
                    <Templates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/templates/:id"
                element={
                  <ProtectedRoute>
                    <TemplateDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/businesses"
                element={
                  <ProtectedRoute>
                    <Businesses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/businesses/:id"
                element={
                  <ProtectedRoute>
                    <BusinessDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/drafts"
                element={
                  <ProtectedRoute>
                    <Drafts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/drafts/:id"
                element={
                  <ProtectedRoute>
                    <DraftDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              {/* AI Feature Routes */}
              <Route
                path="/fake-reviews"
                element={
                  <ProtectedRoute>
                    <FakeReviewDetector />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fake-reviews/:id"
                element={
                  <ProtectedRoute>
                    <FakeReviewDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/review-summaries"
                element={
                  <ProtectedRoute>
                    <ReviewSummarizer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/review-summaries/:id"
                element={
                  <ProtectedRoute>
                    <SummaryDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trends"
                element={
                  <ProtectedRoute>
                    <TrendAnalyzer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trends/:id"
                element={
                  <ProtectedRoute>
                    <TrendDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/counterfeit"
                element={
                  <ProtectedRoute>
                    <CounterfeitDetector />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/counterfeit/:id"
                element={
                  <ProtectedRoute>
                    <CounterfeitDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitors"
                element={
                  <ProtectedRoute>
                    <CompetitorMonitor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/competitors/:id"
                element={
                  <ProtectedRoute>
                    <CompetitorDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/personalizer"
                element={
                  <ProtectedRoute>
                    <ResponsePersonalizer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/personalizer/:id"
                element={
                  <ProtectedRoute>
                    <PersonalizerDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/solicitations"
                element={
                  <ProtectedRoute>
                    <ReviewSolicitor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/solicitations/:id"
                element={
                  <ProtectedRoute>
                    <SolicitorDetail />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
