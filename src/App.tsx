import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { FormWorkflowProvider } from './context/FormWorkflowContext';
import { ToastProvider } from './context/ToastContext';
import { ToastNotificationContainer } from './components/ui/ToastNotification';
import { VoiceAssistant } from './components/VoiceAssistant';

// Public pages
import { LandingPage } from './pages/LandingPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { SecurityPage } from './pages/SecurityPage';
import { ContactPage } from './pages/ContactPage';

// Auth pages
import { SignInPage } from './pages/auth/SignInPage';
import { SignUpPage } from './pages/auth/SignUpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// Dashboard layout and pages
import { DashboardLayout } from './components/layout/DashboardLayout';
import { OverviewPage } from './pages/dashboard/OverviewPage';
import { NewFormWizardPage } from './pages/dashboard/NewFormWizardPage';
import { MyDocumentsPage } from './pages/dashboard/MyDocumentsPage';
import { AIProfilePage } from './pages/dashboard/AIProfilePage';
import { HistoryPage } from './pages/dashboard/HistoryPage';
import { PDFPreviewPage } from './pages/dashboard/PDFPreviewPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <FormWorkflowProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/security" element={<SecurityPage />} />
              <Route path="/contact" element={<ContactPage />} />

              {/* Auth Routes */}
              <Route path="/auth/signin" element={<SignInPage />} />
              <Route path="/auth/signup" element={<SignUpPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

              {/* Protected Dashboard Routes */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<OverviewPage />} />
                <Route path="new" element={<NewFormWizardPage />} />
                <Route path="documents" element={<MyDocumentsPage />} />
                <Route path="profile" element={<AIProfilePage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="pdf-preview" element={<PDFPreviewPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            <ToastNotificationContainer />
            <VoiceAssistant />
          </FormWorkflowProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
