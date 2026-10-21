import React, { useState, useEffect, useCallback } from 'react';
import PageContainer from '../../components/layout/PageContainer';
import Loader from '../../components/common/Loader';
import Button from '../../components/common/Button';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  settingsService,
  defaultPlatformSettings,
  clearStoredSettings,
  subscribeToSettingsUpdates
} from '../../services/settingsService';

const LANGUAGES = [
  { code: 'en', label: 'English (US)' },
  { code: 'es', label: 'Español (Spanish)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'de', label: 'Deutsch (German)' },
  { code: 'pt', label: 'Português (Portuguese)' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'zh', label: '中文 (Mandarin)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'ar', label: 'العربية (Arabic)' }
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern Time - US & Canada)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time - US & Canada)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time - US & Canada)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time - US & Canada)' },
  { value: 'Europe/London', label: 'Europe/London (Greenwich Mean Time / BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (Central European Time)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (Central European Time)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (Gulf Standard Time)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (India Standard Time)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (Singapore Time)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (Japan Standard Time)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (Australian Eastern Time)' }
];

const TABS = [
  {
    id: 'general',
    label: 'General Platform',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    id: 'notifications',
    label: 'Notifications & Alerts',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    )
  },
  {
    id: 'maintenance',
    label: 'Maintenance & Security',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    )
  },
  {
    id: 'integrations',
    label: 'Integrations & Storage',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
      </svg>
    )
  }
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(defaultPlatformSettings);
  const [initialSettings, setInitialSettings] = useState(defaultPlatformSettings);
  const [isLiveBackend, setIsLiveBackend] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // System & Integration Status
  const [systemStatus, setSystemStatus] = useState(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Maintenance Confirmation Modal
  const [isConfirmingMaintenance, setIsConfirmingMaintenance] = useState(false);

  // Reset to Defaults Modal
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Load Settings
  const loadSettingsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { settings: fetched, isLiveBackend: live } = await settingsService.fetchAllSettings();
      setSettings(fetched);
      setInitialSettings(fetched);
      setIsLiveBackend(live);
    } catch {
      setStatusNotice({
        type: 'error',
        message: 'Unable to reach settings endpoint. Loaded local default configurations.'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check Integration & Storage Status
  const checkIntegrationHealth = useCallback(async () => {
    setIsCheckingStatus(true);
    try {
      const status = await settingsService.getSystemStatus();
      setSystemStatus(status);
    } catch {
      setSystemStatus({ isVerified: false, email: null, storage: null });
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    loadSettingsData();
    checkIntegrationHealth();

    // Subscribe to cross-tab and session updates
    const unsubscribe = subscribeToSettingsUpdates((newOverrides) => {
      setSettings((prev) => ({ ...prev, ...newOverrides }));
    });

    return () => unsubscribe();
  }, [loadSettingsData, checkIntegrationHealth]);

  // Check for unsaved changes
  const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  // Form Field Change Handlers
  const handleTextChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleToggleChange = (key) => {
    // Intercept maintenance mode toggle when turning ON
    if (key === 'system.maintenance_mode' && !settings['system.maintenance_mode']) {
      setIsConfirmingMaintenance(true);
      return;
    }

    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const confirmEnableMaintenance = () => {
    setSettings((prev) => ({ ...prev, 'system.maintenance_mode': true }));
    setIsConfirmingMaintenance(false);
    setStatusNotice({
      type: 'warning',
      message: 'Maintenance Mode has been enabled (Frontend Simulated Mode). Non-admin visitors will see an active maintenance notice.'
    });
  };

  const handleDisableMaintenanceQuickly = () => {
    setSettings((prev) => ({ ...prev, 'system.maintenance_mode': false }));
    setStatusNotice({
      type: 'success',
      message: 'Maintenance Mode has been turned off. Normal platform access restored.'
    });
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!settings['general.platform_name'] || !settings['general.platform_name'].trim()) {
      errors['general.platform_name'] = 'Platform Name is required.';
    }

    const email = settings['general.support_email'];
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors['general.support_email'] = 'Please enter a valid support contact email.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Settings
  const handleSave = async () => {
    if (!validateForm()) {
      setStatusNotice({
        type: 'error',
        message: 'Please review and resolve the highlighted validation errors before saving.'
      });
      return;
    }

    setIsSaving(true);
    setStatusNotice(null);

    try {
      const result = await settingsService.saveAllSettings(settings);
      setInitialSettings(settings);
      setIsLiveBackend(result.isLiveBackend);

      setStatusNotice({
        type: 'success',
        message: result.isLiveBackend
          ? 'Platform settings successfully saved to the backend database.'
          : 'Settings saved locally and synchronized across browser sessions (Backend API offline).'
      });
    } catch {
      setStatusNotice({
        type: 'error',
        message: 'An unexpected error occurred while saving platform settings.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Defaults
  const handleConfirmReset = () => {
    clearStoredSettings();
    setSettings(defaultPlatformSettings);
    setInitialSettings(defaultPlatformSettings);
    setIsConfirmingReset(false);
    setStatusNotice({
      type: 'success',
      message: 'All platform settings have been reset to factory defaults.'
    });
  };

  return (
    <PageContainer>
      {/* Breadcrumb Navigation */}
      <nav className="flex text-xs text-[#514940] mb-3" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <span className="text-[#514940]">Super Admin</span>
          </li>
          <li className="text-[#71675D]">/</li>
          <li className="font-semibold text-[#211E1A]" aria-current="page">
            Platform Settings
          </li>
        </ol>
      </nav>

      {/* Header & Primary Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-[#B6AA9A]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] sm:text-[32px] font-bold text-[#211E1A] leading-tight tracking-tight">
              Platform Settings
            </h1>
            {isLiveBackend ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Live Backend Synced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAE3DA] text-[#514940] border border-[#B6AA9A]">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Local Dev Storage (Simulated)
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[#514940]">
            Configure platform parameters, default language and timezone, administrative notification triggers, maintenance windows, and integration health.
          </p>
        </div>

        {/* Global Save / Reset Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          <Button
            variant="secondary"
            onClick={() => setIsConfirmingReset(true)}
            disabled={isSaving}
            className="text-xs sm:text-sm font-medium"
          >
            Reset Defaults
          </Button>

          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-2 text-xs sm:text-sm shadow-xs"
          >
            {isSaving ? (
              <>
                <Loader size="sm" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{isDirty ? 'Save All Changes' : 'Saved'}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Maintenance Mode Alert Banner (if active) */}
      {settings['system.maintenance_mode'] && (
        <div className="mt-4 p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-rose-950">
                Platform Maintenance Mode is Currently ACTIVE
              </p>
              <p className="text-xs text-rose-800 mt-0.5">
                Notice: &ldquo;{settings['system.maintenance_message'] || 'LearnSpace is undergoing maintenance.'}&rdquo; (Frontend simulated lockout).
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleDisableMaintenanceQuickly}
            className="text-xs border-rose-300 bg-white text-rose-900 hover:bg-rose-100 shrink-0"
          >
            Turn Off Maintenance
          </Button>
        </div>
      )}

      {/* Feedback Notice Banner */}
      {statusNotice && (
        <div
          className={`mt-4 p-4 rounded-xl border flex items-center justify-between gap-3 text-sm transition-all ${
            statusNotice.type === 'error'
              ? 'bg-rose-100/90 text-rose-950 border-rose-300'
              : statusNotice.type === 'warning'
              ? 'bg-amber-100/90 text-amber-950 border-amber-300'
              : 'bg-emerald-100/90 text-emerald-950 border-emerald-300'
          }`}
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <span className="font-semibold">
              {statusNotice.type === 'error' ? 'Notice:' : statusNotice.type === 'warning' ? 'Alert:' : 'Success:'}
            </span>
            <span>{statusNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-xs font-bold hover:underline ml-auto"
            aria-label="Dismiss notice"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section Tabs */}
      <div className="mt-6 border-b border-[#B6AA9A] flex items-center gap-1 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                isActive
                  ? 'border-[#D92D2D] text-[#D92D2D] bg-[#EAE3DA]/50 rounded-t-lg'
                  : 'border-transparent text-[#514940] hover:text-[#211E1A] hover:bg-[#C8BBAA]/30'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader size="lg" />
          <p className="text-sm font-medium text-[#71675D] mt-3">Loading platform configurations...</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* TAB 1: GENERAL PLATFORM SETTINGS */}
          {activeTab === 'general' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {/* Platform Identity Card */}
              <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="border-b border-[#B6AA9A] pb-3">
                  <h2 className="text-[17px] font-bold text-[#211E1A]">Platform Identity</h2>
                  <p className="text-xs text-[#514940] mt-0.5">
                    Brand naming and public presentation parameters.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Platform Name */}
                  <div>
                    <label htmlFor="setting-platform-name" className="block text-xs font-bold text-[#211E1A] mb-1">
                      Platform Name <span className="text-[#D92D2D]">*</span>
                    </label>
                    <input
                      id="setting-platform-name"
                      type="text"
                      value={settings['general.platform_name'] || ''}
                      onChange={(e) => handleTextChange('general.platform_name', e.target.value)}
                      placeholder="e.g. LearnSpace"
                      maxLength={80}
                      className={`w-full px-3 py-2 rounded-lg border text-sm text-[#211E1A] bg-[#EAE3DA] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors ${
                        validationErrors['general.platform_name'] ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#B6AA9A]'
                      }`}
                    />
                    {validationErrors['general.platform_name'] && (
                      <p className="text-xs text-rose-700 mt-1">{validationErrors['general.platform_name']}</p>
                    )}
                    <span className="text-[11px] text-[#71675D]">Appears on browser tabs, navigation, student certificates, and emails.</span>
                  </div>

                  {/* Platform Description / Tagline */}
                  <div>
                    <label htmlFor="setting-platform-desc" className="block text-xs font-bold text-[#211E1A] mb-1">
                      Platform Description / Tagline
                    </label>
                    <textarea
                      id="setting-platform-desc"
                      rows={2}
                      value={settings['general.platform_description'] || ''}
                      onChange={(e) => handleTextChange('general.platform_description', e.target.value)}
                      placeholder="Short platform tagline or mission statement"
                      className="w-full px-3 py-2 rounded-lg border border-[#B6AA9A] text-sm text-[#211E1A] bg-[#EAE3DA] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
                    />
                    <span className="text-[11px] text-[#71675D]">Used in public search snippets and platform hero banners.</span>
                  </div>

                  {/* Support Contact Email */}
                  <div>
                    <label htmlFor="setting-support-email" className="block text-xs font-bold text-[#211E1A] mb-1">
                      Support Contact Email
                    </label>
                    <input
                      id="setting-support-email"
                      type="email"
                      value={settings['general.support_email'] || ''}
                      onChange={(e) => handleTextChange('general.support_email', e.target.value)}
                      placeholder="e.g. support@learnspace.org"
                      className={`w-full px-3 py-2 rounded-lg border text-sm text-[#211E1A] bg-[#EAE3DA] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors ${
                        validationErrors['general.support_email'] ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#B6AA9A]'
                      }`}
                    />
                    {validationErrors['general.support_email'] && (
                      <p className="text-xs text-rose-700 mt-1">{validationErrors['general.support_email']}</p>
                    )}
                    <span className="text-[11px] text-[#71675D]">Primary recipient for student help requests and contact forms.</span>
                  </div>
                </div>
              </div>

              {/* Localization & Registration Policy Card */}
              <div className="space-y-6">
                <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="border-b border-[#B6AA9A] pb-3">
                    <h2 className="text-[17px] font-bold text-[#211E1A]">Localization & Defaults</h2>
                    <p className="text-xs text-[#514940] mt-0.5">
                      Default language and timezone across the platform.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Default Language */}
                    <div>
                      <label htmlFor="setting-default-lang" className="block text-xs font-bold text-[#211E1A] mb-1">
                        Default Language
                      </label>
                      <select
                        id="setting-default-lang"
                        value={settings['general.default_language'] || 'en'}
                        onChange={(e) => handleTextChange('general.default_language', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#B6AA9A] text-sm text-[#211E1A] bg-[#EAE3DA] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
                      >
                        {LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] text-[#71675D]">Fallback locale for non-authenticated visitors.</span>
                    </div>

                    {/* Default Timezone */}
                    <div>
                      <label htmlFor="setting-default-tz" className="block text-xs font-bold text-[#211E1A] mb-1">
                        Default Timezone
                      </label>
                      <select
                        id="setting-default-tz"
                        value={settings['general.default_timezone'] || 'UTC'}
                        onChange={(e) => handleTextChange('general.default_timezone', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#B6AA9A] text-sm text-[#211E1A] bg-[#EAE3DA] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-[11px] text-[#71675D]">Used for system logs and schedule reports.</span>
                    </div>
                  </div>
                </div>

                {/* Registration Policies */}
                <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="border-b border-[#B6AA9A] pb-3">
                    <h2 className="text-[17px] font-bold text-[#211E1A]">User Onboarding Policies</h2>
                    <p className="text-xs text-[#514940] mt-0.5">
                      Configure public account registration rules.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-[#211E1A]">Public Learner Registration</p>
                        <p className="text-xs text-[#514940]">Allow any prospective learner to register without an invite code.</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings['general.allow_public_registration'])}
                        onClick={() => handleToggleChange('general.allow_public_registration')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                          settings['general.allow_public_registration'] ? 'bg-[#D92D2D]' : 'bg-[#71675D]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            settings['general.allow_public_registration'] ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#B6AA9A]/50">
                      <div>
                        <p className="text-sm font-semibold text-[#211E1A]">Instructor Self-Registration</p>
                        <p className="text-xs text-[#514940]">Allow instructors to register accounts directly and submit credentials.</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean(settings['general.allow_instructor_self_signup'])}
                        onClick={() => handleToggleChange('general.allow_instructor_self_signup')}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                          settings['general.allow_instructor_self_signup'] ? 'bg-[#D92D2D]' : 'bg-[#71675D]'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            settings['general.allow_instructor_self_signup'] ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICATIONS & ALERTS */}
          {activeTab === 'notifications' && (
            <div className="max-w-4xl bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs space-y-6 animate-fade-in">
              <div className="border-b border-[#B6AA9A] pb-3">
                <h2 className="text-[17px] font-bold text-[#211E1A]">Administrative Notification Triggers</h2>
                <p className="text-xs text-[#514940] mt-0.5">
                  Select which platform activities trigger automated notifications for Super Admins and managers.
                </p>
              </div>

              <div className="space-y-4">
                {/* Notification 1: Course Approvals */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#C8BBAA] text-[#D92D2D] shrink-0 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#211E1A]">Course Approval Submissions</p>
                      <p className="text-xs text-[#514940] mt-0.5">
                        Receive instant alerts when instructors submit new courses or revised curriculum lectures for review.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(settings['notifications.course_approval_submissions'])}
                    onClick={() => handleToggleChange('notifications.course_approval_submissions')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                      settings['notifications.course_approval_submissions'] ? 'bg-[#D92D2D]' : 'bg-[#71675D]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings['notifications.course_approval_submissions'] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Notification 2: User Registrations */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#C8BBAA] text-[#D92D2D] shrink-0 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#211E1A]">New User Registrations</p>
                      <p className="text-xs text-[#514940] mt-0.5">
                        Notify administrators when new learners, enterprise members, or professor accounts are created.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(settings['notifications.user_registrations'])}
                    onClick={() => handleToggleChange('notifications.user_registrations')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                      settings['notifications.user_registrations'] ? 'bg-[#D92D2D]' : 'bg-[#71675D]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings['notifications.user_registrations'] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Notification 3: Moderation Alerts */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#C8BBAA] text-[#D92D2D] shrink-0 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#211E1A]">Content Moderation & Policy Flags</p>
                      <p className="text-xs text-[#514940] mt-0.5">
                        High-priority alerts when user reviews, comments, or assignments are flagged for community violations.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(settings['notifications.moderation_alerts'])}
                    onClick={() => handleToggleChange('notifications.moderation_alerts')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                      settings['notifications.moderation_alerts'] ? 'bg-[#D92D2D]' : 'bg-[#71675D]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings['notifications.moderation_alerts'] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Notification 4: System Announcements */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#C8BBAA] text-[#D92D2D] shrink-0 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#211E1A]">System & Maintenance Notifications</p>
                      <p className="text-xs text-[#514940] mt-0.5">
                        Receive platform health diagnostics, database backup notices, and security advisories.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(settings['notifications.system_announcements'])}
                    onClick={() => handleToggleChange('notifications.system_announcements')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                      settings['notifications.system_announcements'] ? 'bg-[#D92D2D]' : 'bg-[#71675D]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings['notifications.system_announcements'] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Notification 5: Global Email Dispatch */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#C8BBAA] text-[#D92D2D] shrink-0 mt-0.5">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#211E1A]">Outgoing Email Dispatch Service</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#E2DCD4] text-[#514940] border border-[#B6AA9A]">
                          SMTP
                        </span>
                      </div>
                      <p className="text-xs text-[#514940] mt-0.5">
                        Global switch for sending system verification and password reset emails to users.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(settings['notifications.email_enabled'])}
                    onClick={() => handleToggleChange('notifications.email_enabled')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                      settings['notifications.email_enabled'] ? 'bg-[#D92D2D]' : 'bg-[#71675D]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings['notifications.email_enabled'] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MAINTENANCE & SECURITY */}
          {activeTab === 'maintenance' && (
            <div className="max-w-4xl space-y-6 animate-fade-in">
              {/* Maintenance Mode Card */}
              <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="border-b border-[#B6AA9A] pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-[17px] font-bold text-[#211E1A]">Platform Maintenance Mode</h2>
                    <p className="text-xs text-[#514940] mt-0.5">
                      Restrict student access during system upgrades or scheduled database maintenance.
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      settings['system.maintenance_mode']
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    {settings['system.maintenance_mode'] ? 'Mode: ACTIVE' : 'Mode: NORMAL'}
                  </span>
                </div>

                {/* Explicit Dev/Demo Mode Disclaimer Badge */}
                <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] text-xs text-[#514940] flex items-start gap-2.5">
                  <span className="text-base leading-none">ℹ️</span>
                  <div>
                    <strong className="text-[#211E1A]">Frontend Development & Demo Mode:</strong>
                    <p className="mt-0.5 leading-relaxed">
                      This toggle activates simulated client-side maintenance banners and restricts mock learner navigation in the browser. It does not place the live FastAPI server or PostgreSQL database into an offline state.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[#211E1A]">Enable Maintenance Mode</p>
                    <p className="text-xs text-[#514940]">
                      Displays a platform-wide maintenance banner and prevents new learner enrollments.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(settings['system.maintenance_mode'])}
                    onClick={() => handleToggleChange('system.maintenance_mode')}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D92D2D] ${
                      settings['system.maintenance_mode'] ? 'bg-[#D92D2D]' : 'bg-[#71675D]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        settings['system.maintenance_mode'] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Custom Maintenance Message Textarea */}
                <div className="pt-3 border-t border-[#B6AA9A]/50">
                  <label htmlFor="setting-maintenance-msg" className="block text-xs font-bold text-[#211E1A] mb-1">
                    Public Maintenance Notice Message
                  </label>
                  <textarea
                    id="setting-maintenance-msg"
                    rows={2}
                    value={settings['system.maintenance_message'] || ''}
                    onChange={(e) => handleTextChange('system.maintenance_message', e.target.value)}
                    placeholder="Message displayed to users visiting the site during maintenance"
                    className="w-full px-3 py-2 rounded-lg border border-[#B6AA9A] text-sm text-[#211E1A] bg-[#EAE3DA] focus:outline-none focus:ring-2 focus:ring-[#D92D2D] transition-colors"
                  />
                  <span className="text-[11px] text-[#71675D]">Displayed prominently in the banner and landing page header.</span>
                </div>
              </div>

              {/* Security & Access Policies Summary */}
              <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="border-b border-[#B6AA9A] pb-3">
                  <h2 className="text-[17px] font-bold text-[#211E1A]">Platform Security & Governance Policies</h2>
                  <p className="text-xs text-[#514940] mt-0.5">
                    Standard security baselines enforced across the backend authentication layer.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                    <span className="text-[11px] font-semibold text-[#71675D] uppercase tracking-wider block">Password Policy</span>
                    <span className="text-base font-bold text-[#211E1A] mt-1 block">Min. 8 Characters</span>
                    <span className="text-[11px] text-[#514940] mt-0.5 block">Requires letters and digits</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                    <span className="text-[11px] font-semibold text-[#71675D] uppercase tracking-wider block">Account Lockout</span>
                    <span className="text-base font-bold text-[#211E1A] mt-1 block">5 Failed Logins</span>
                    <span className="text-[11px] text-[#514940] mt-0.5 block">15-minute temporary suspension</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A]">
                    <span className="text-[11px] font-semibold text-[#71675D] uppercase tracking-wider block">Session Duration</span>
                    <span className="text-base font-bold text-[#211E1A] mt-1 block">7 Days (JWT)</span>
                    <span className="text-[11px] text-[#514940] mt-0.5 block">Automated renewal on activity</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: INTEGRATIONS & STORAGE STATUS */}
          {activeTab === 'integrations' && (
            <div className="max-w-4xl space-y-6 animate-fade-in">
              <div className="bg-[#C8BBAA] border border-[#B6AA9A] rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#B6AA9A] pb-3">
                  <div>
                    <h2 className="text-[17px] font-bold text-[#211E1A]">Storage & Backend Integrations</h2>
                    <p className="text-xs text-[#514940] mt-0.5">
                      Verified operational status of external infrastructure and file backends.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={checkIntegrationHealth}
                    disabled={isCheckingStatus}
                    className="text-xs self-start sm:self-auto flex items-center gap-1.5"
                  >
                    {isCheckingStatus ? (
                      <>
                        <Loader size="sm" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Refresh Status</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Honest Security Notice */}
                <div className="p-3.5 rounded-lg bg-[#EAE3DA] border border-[#B6AA9A] flex items-start gap-2.5 text-xs text-[#514940]">
                  <span className="text-base leading-none">🛡️</span>
                  <div>
                    <strong className="text-[#211E1A]">Security & Privacy Protection:</strong>
                    <p className="mt-0.5 leading-relaxed">
                      This diagnostic dashboard only reveals operational connectivity and service backend names. In accordance with platform security guidelines, no secret credentials, API keys, passwords, or raw environment variables are exposed.
                    </p>
                  </div>
                </div>

                {/* Integration Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Service 1: File & Media Storage */}
                  <div className="p-4 rounded-xl bg-[#EAE3DA] border border-[#B6AA9A] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#C8BBAA] flex items-center justify-center text-[#211E1A]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-[#211E1A]">Asset & Video Storage</h3>
                      </div>
                      {systemStatus?.isVerified && systemStatus?.storage ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {systemStatus.storage.backend === 'supabase' ? 'Supabase Storage' : 'Local Disk'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#C8BBAA] text-[#71675D] border border-[#B6AA9A]">
                          Not verified
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1.5 text-[#514940]">
                      <div className="flex justify-between py-1 border-b border-[#B6AA9A]/40">
                        <span>Configured Backend:</span>
                        <strong className="font-mono text-[#211E1A]">
                          {systemStatus?.storage?.backend || 'Local/Development'}
                        </strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#B6AA9A]/40">
                        <span>Public Asset Bucket:</span>
                        <span className="font-mono text-[#211E1A]">
                          {systemStatus?.storage?.public_bucket || 'public (thumbnails & avatars)'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Private Media Bucket:</span>
                        <span className="font-mono text-[#211E1A]">
                          {systemStatus?.storage?.private_bucket || 'private (lecture videos)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service 2: Outgoing Email System */}
                  <div className="p-4 rounded-xl bg-[#EAE3DA] border border-[#B6AA9A] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#C8BBAA] flex items-center justify-center text-[#211E1A]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-[#211E1A]">Email Service</h3>
                      </div>
                      {systemStatus?.isVerified && systemStatus?.email ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          {systemStatus.email.delivers_real_email ? 'SMTP Active' : 'Console (Dev)'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#C8BBAA] text-[#71675D] border border-[#B6AA9A]">
                          Not verified
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-1.5 text-[#514940]">
                      <div className="flex justify-between py-1 border-b border-[#B6AA9A]/40">
                        <span>Driver Backend:</span>
                        <strong className="font-mono text-[#211E1A]">
                          {systemStatus?.email?.backend || 'console logger'}
                        </strong>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#B6AA9A]/40">
                        <span>From Address:</span>
                        <span className="font-mono text-[#211E1A]">
                          {systemStatus?.email?.from || 'support@learnspace.org'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Real Delivery:</span>
                        <span className="text-[#211E1A]">
                          {systemStatus?.email?.delivers_real_email ? 'Yes (Live SMTP)' : 'Simulated in server log'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service 3: FastAPI Backend */}
                  <div className="p-4 rounded-xl bg-[#EAE3DA] border border-[#B6AA9A] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#C8BBAA] flex items-center justify-center text-[#211E1A]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-[#211E1A]">FastAPI Core Gateway</h3>
                      </div>
                      {systemStatus?.isVerified ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Verified (Online)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#C8BBAA] text-[#71675D] border border-[#B6AA9A]">
                          Not verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs space-y-1.5 text-[#514940]">
                      <div className="flex justify-between py-1 border-b border-[#B6AA9A]/40">
                        <span>API Base Prefix:</span>
                        <span className="font-mono text-[#211E1A]">/api/v1</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Connection Status:</span>
                        <span className="text-[#211E1A]">
                          {systemStatus?.isVerified ? 'Synchronized with live backend' : 'Running in frontend mock fallback'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Service 4: PostgreSQL Database */}
                  <div className="p-4 rounded-xl bg-[#EAE3DA] border border-[#B6AA9A] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#C8BBAA] flex items-center justify-center text-[#211E1A]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-[#211E1A]">Relational Database</h3>
                      </div>
                      {systemStatus?.isVerified ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Verified (Online)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#C8BBAA] text-[#71675D] border border-[#B6AA9A]">
                          Not verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs space-y-1.5 text-[#514940]">
                      <div className="flex justify-between py-1 border-b border-[#B6AA9A]/40">
                        <span>Engine:</span>
                        <span className="font-mono text-[#211E1A]">PostgreSQL / SQLite</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Row Level Security (RLS):</span>
                        <span className="text-[#211E1A]">Enforced on public schema</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal: Enable Maintenance Mode */}
      <ConfirmDialog
        isOpen={isConfirmingMaintenance}
        title="Activate Platform Maintenance Mode?"
        message="Enabling Maintenance Mode will display an active maintenance banner to all learners and restrict access in this session. This action will be saved to your browser session. Are you sure you wish to proceed?"
        onConfirm={confirmEnableMaintenance}
        onCancel={() => setIsConfirmingMaintenance(false)}
      />

      {/* Confirmation Modal: Reset to Defaults */}
      <ConfirmDialog
        isOpen={isConfirmingReset}
        title="Reset Platform Settings to Defaults?"
        message="This will clear all custom local configurations and restore initial factory defaults across General, Notification, and Maintenance settings. Are you sure you wish to reset?"
        onConfirm={handleConfirmReset}
        onCancel={() => setIsConfirmingReset(false)}
      />
    </PageContainer>
  );
}
