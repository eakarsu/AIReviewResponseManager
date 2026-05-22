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
import ReputationScore from './pages/ReputationScore';
import BulkImport from './pages/BulkImport';
import SemanticSearch from './pages/SemanticSearch';
import ResponseQualityScorer from './pages/ResponseQualityScorer';
import ReputationRiskAlert from './pages/ReputationRiskAlert';
import TranslateResponse from './pages/TranslateResponse';
import TeamAssignmentSuggester from './pages/TeamAssignmentSuggester';
import RetentionTargets from './pages/RetentionTargets';
import CustomViewsPage from './pages/CustomViewsPage';

// === Batch 07 Gaps & Frontend Mounts ===
import CfPersonalizedResponseGeneration from './pages/CfPersonalizedResponseGeneration';
import CfFakeReviewIdentification from './pages/CfFakeReviewIdentification';
import CfReputationTrendForecasting from './pages/CfReputationTrendForecasting';
import CfMultilanguageResponse from './pages/CfMultilanguageResponse';
import CfCompetitorBenchmarkDashboard from './pages/CfCompetitorBenchmarkDashboard';
import CfCustomerRetentionTargeting from './pages/CfCustomerRetentionTargeting';
import GapNoGenerateresponseAidraftedResponses from './pages/GapNoGenerateresponseAidraftedResponses';
import GapNoSentimentanalysisClassifySentimentUrge from './pages/GapNoSentimentanalysisClassifySentimentUrge';
import GapNoFakereviewdetectorMlScoring from './pages/GapNoFakereviewdetectorMlScoring';
import GapNoCompetitorsentimentAi from './pages/GapNoCompetitorsentimentAi';
import GapNoResponsequalityscorer from './pages/GapNoResponsequalityscorer';
import GapNoReputationriskalertForecastingBranddama from './pages/GapNoReputationriskalertForecastingBranddama';
import GapNoReviewAggregationFromGoogleYelpTripa from './pages/GapNoReviewAggregationFromGoogleYelpTripa';
import GapNoPublishingToMultiplePlatforms from './pages/GapNoPublishingToMultiplePlatforms';
import GapLimitedTeamCollaborationAssignmentCommen from './pages/GapLimitedTeamCollaborationAssignmentCommen';
import GapNoAnalyticsDashboardResponseRateTimetor from './pages/GapNoAnalyticsDashboardResponseRateTimetor';
import GapNoNotificationsForNewReviews from './pages/GapNoNotificationsForNewReviews';
import GapNoSmsemailSolicitorChannelIntegration from './pages/GapNoSmsemailSolicitorChannelIntegration';
// === End Batch 07 ===

import './App.css';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

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
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<ProtectedRoute><CodexCustomVizFeature /></ProtectedRoute>} />
        <Route path="/codex/operations" element={<ProtectedRoute><CodexOperationsFeature /></ProtectedRoute>} />

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
              <Route
                path="/reputation"
                element={
                  <ProtectedRoute>
                    <ReputationScore />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bulk-import"
                element={
                  <ProtectedRoute>
                    <BulkImport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/semantic-search"
                element={
                  <ProtectedRoute>
                    <SemanticSearch />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/quality-scorer"
                element={
                  <ProtectedRoute>
                    <ResponseQualityScorer />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reputation-risk"
                element={
                  <ProtectedRoute>
                    <ReputationRiskAlert />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/translate-response"
                element={
                  <ProtectedRoute>
                    <TranslateResponse />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/team-assignment"
                element={
                  <ProtectedRoute>
                    <TeamAssignmentSuggester />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/retention-targets"
                element={
                  <ProtectedRoute>
                    <RetentionTargets />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/custom-views"
                element={
                  <ProtectedRoute>
                    <CustomViewsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
          // === Batch 07 Gaps & Frontend Mounts ===
          <Route path='/cf-personalized-response-generation' element={<CfPersonalizedResponseGeneration />} />
          <Route path='/cf-fake-review-identification' element={<CfFakeReviewIdentification />} />
          <Route path='/cf-reputation-trend-forecasting' element={<CfReputationTrendForecasting />} />
          <Route path='/cf-multilanguage-response' element={<CfMultilanguageResponse />} />
          <Route path='/cf-competitor-benchmark-dashboard' element={<CfCompetitorBenchmarkDashboard />} />
          <Route path='/cf-customer-retention-targeting' element={<CfCustomerRetentionTargeting />} />
          <Route path='/gap-no-generateresponse-aidrafted-responses' element={<GapNoGenerateresponseAidraftedResponses />} />
          <Route path='/gap-no-sentimentanalysis-classify-sentiment-urge' element={<GapNoSentimentanalysisClassifySentimentUrge />} />
          <Route path='/gap-no-fakereviewdetector-ml-scoring' element={<GapNoFakereviewdetectorMlScoring />} />
          <Route path='/gap-no-competitorsentiment-ai' element={<GapNoCompetitorsentimentAi />} />
          <Route path='/gap-no-responsequalityscorer' element={<GapNoResponsequalityscorer />} />
          <Route path='/gap-no-reputationriskalert-forecasting-branddama' element={<GapNoReputationriskalertForecastingBranddama />} />
          <Route path='/gap-no-review-aggregation-from-google-yelp-tripa' element={<GapNoReviewAggregationFromGoogleYelpTripa />} />
          <Route path='/gap-no-publishing-to-multiple-platforms' element={<GapNoPublishingToMultiplePlatforms />} />
          <Route path='/gap-limited-team-collaboration-assignment-commen' element={<GapLimitedTeamCollaborationAssignmentCommen />} />
          <Route path='/gap-no-analytics-dashboard-response-rate-timetor' element={<GapNoAnalyticsDashboardResponseRateTimetor />} />
          <Route path='/gap-no-notifications-for-new-reviews' element={<GapNoNotificationsForNewReviews />} />
          <Route path='/gap-no-smsemail-solicitor-channel-integration' element={<GapNoSmsemailSolicitorChannelIntegration />} />
          // === End Batch 07 ===
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
