
import React, { useEffect, Suspense, lazy, useState, useCallback } from 'react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { PlatformErrorBoundary } from './components/PlatformErrorBoundary';
import { initPlatformErrorReporter } from './utils/platformErrorReporter';
import { usePublicSystemStatus } from './hooks/usePublicSystemStatus';
import { ConnectivityCapsule } from './components/ui/ConnectivityCapsule';
import { LoadingScreen } from './components/LoadingScreen';
import { RoleSelectionScreen } from './components/RoleSelectionScreen';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { siteContacts, hydrateSiteConfig } from './config/site';
import { AuthLayout } from './components/auth/AuthLayout';

const SupportModal = lazy(() =>
  import('./components/modals/SupportModal').then((m) => ({ default: m.SupportModal })),
);
const WholesaleScreen = lazy(() =>
  import('./components/WholesaleScreen').then((m) => ({ default: m.WholesaleScreen })),
);
const HowWeWorkScreen = lazy(() =>
  import('./components/HowWeWorkScreen').then((m) => ({ default: m.HowWeWorkScreen })),
);
const HowWeWorkTutorial = lazy(() =>
  import('./components/HowWeWorkTutorial').then((m) => ({ default: m.HowWeWorkTutorial })),
);
const TrustStats = lazy(() =>
  import('./components/sections/TrustStats').then((m) => ({ default: m.TrustStats })),
);
const AboutCompany = lazy(() =>
  import('./components/sections/AboutCompany').then((m) => ({ default: m.AboutCompany })),
);
const Guarantees = lazy(() =>
  import('./components/sections/Guarantees').then((m) => ({ default: m.Guarantees })),
);
const HowItWorks = lazy(() =>
  import('./components/sections/HowItWorks').then((m) => ({ default: m.HowItWorks })),
);
const MerchantCallout = lazy(() =>
  import('./components/sections/MerchantCallout').then((m) => ({ default: m.MerchantCallout })),
);
const LegalDocs = lazy(() =>
  import('./components/sections/LegalDocs').then((m) => ({ default: m.LegalDocs })),
);
const VerifyLinkPage = lazy(() =>
  import('./components/verify/VerifyLinkPage').then((m) => ({ default: m.VerifyLinkPage })),
);

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'https://api.e-tashleh.net';

const BOOT_SKIP_KEY = 'etashleh_booted';

function shouldSkipBootLoader(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(BOOT_SKIP_KEY) === '1';
}

const DashboardShell = lazy(() => import('./routes/DashboardShell'));
const EarnIncomeLanding = lazy(() =>
  import('./components/EarnIncomeLanding').then((m) => ({ default: m.EarnIncomeLanding })),
);
const BusinessLicensePage = lazy(() =>
  import('./components/legal/BusinessLicensePage').then((m) => ({ default: m.BusinessLicensePage })),
);
const RegistryPdfViewer = lazy(() =>
  import('./components/legal/RegistryPdfViewer').then((m) => ({ default: m.RegistryPdfViewer })),
);

// Navigation
import { useNavigationHistory, parseUrlToState } from './utils/useNavigationHistory';
import {
  persistPendingRedirect,
  clearPersistedPendingRedirect,
  loginSearchWithNext,
  parseDlQueryParam,
  stripDlFromSearch,
  loadDocumentScanPending,
  clearDocumentScanPending,
  type PendingRedirect,
  type DocumentScanKind,
} from './utils/widersDeepLink';
import { DocumentScanRedirect } from './components/DocumentScanRedirect';
import {
  buildPendingRedirect,
  resolveDashboardEntry,
  restoreLoginPendingFromSearch,
  type DashboardEntryResult,
} from './utils/dashboardEntryResolver';

// Auth Setup
import { getCurrentUser, mapBackendRoleToFrontend } from './utils/auth';
import { authApi } from './services/api/auth';

// Auth Components
const LoginPage = lazy(() => import('./components/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const VendorRegister = lazy(() => import('./components/auth/VendorRegister').then(module => ({ default: module.VendorRegister })));
const CustomerRegister = lazy(() => import('./components/auth/CustomerRegister').then(module => ({ default: module.CustomerRegister })));
const AdminLogin = lazy(() => import('./components/auth/AdminLogin').then(module => ({ default: module.AdminLogin })));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword').then(module => ({ default: module.ResetPassword })));
const TermsView = lazy(() => import('./components/auth/TermsView').then(module => ({ default: module.TermsView })));
const WalletLoyaltyTermsView = lazy(() => import('./components/legal/WalletLoyaltyTermsView').then(module => ({ default: module.WalletLoyaltyTermsView })));
const AccountRecoveryWizard = lazy(() => import('./components/auth/AccountRecoveryWizard').then(module => ({ default: module.AccountRecoveryWizard })));

const routeFallback = (
  <div className="fixed inset-0 bg-[#0F0E0C] flex items-center justify-center z-50">
    <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

type ViewState =
  | 'landing'
  | 'login' // Keep for generic fallback if needed
  | 'customer-login' // NEW
  | 'merchant-login' // NEW
  | 'vendor-register'
  | 'customer-register'
  | 'admin-login'
  | 'forgot-password'
  | 'reset-password'
  | 'account-recovery'
  | 'terms'
  | 'wallet-loyalty-terms'
  | 'dashboard'
  | 'role-selection'
  | 'wholesale'
  | 'how-we-work'
  | 'how-we-work-tutorial'
  | 'earn-income'
  | 'verify-link'
  | 'business-license'
  | 'business-license-verify'
  | 'invoice-scan'
  | 'waybill-scan';
type UserRole = 'customer' | 'merchant' | 'admin' | null;

function AppContent() {
  const { language, ensureDashboardTranslations } = useLanguage();
  const [loading, setLoading] = useState(() => !shouldSkipBootLoader());
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [legalInitialSection, setLegalInitialSection] = useState<'terms' | 'privacy'>('terms');
  const [landingInitialSection, setLandingInitialSection] = useState<string | null>(null);
  const [recoveryRole, setRecoveryRole] = useState<'customer' | 'merchant'>('customer');
  const { publicSystemStatus } = usePublicSystemStatus(30_000, !loading);

  useEffect(() => {
    void hydrateSiteConfig();
  }, []);

  // Handle Scrolling to Landing Section
  useEffect(() => {
    if (currentView === 'landing' && landingInitialSection) {
      setTimeout(() => {
        const element = document.getElementById(landingInitialSection);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
        setLandingInitialSection(null); // Reset after scrolling attempt
      }, 500); // Slight delay to ensure DOM is ready
    }
  }, [currentView, landingInitialSection]);

  const [previousView, setPreviousView] = useState<ViewState>('login');
  const [loginInitialTab, setLoginInitialTab] = useState<'customer' | 'merchant'>('customer');
  const [loginRoleMismatch, setLoginRoleMismatch] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);

  // Dashboard State
  const [dashboardPath, setDashboardPath] = useState('home');
  const [viewId, setViewId] = useState<any>(null); // Generic ID
  const [verifyToken, setVerifyToken] = useState<string | null>(null);

  const buildUrlFromParts = (path?: string, id?: any, search?: string) => {
    let url = `/dashboard/${path || 'home'}`;
    if (id) url += `/${id}`;
    if (search) url += search.startsWith('?') ? search : `?${search}`;
    return url;
  };

  // --- NAVIGATION HISTORY API ---
  const { pushView, replaceView } = useNavigationHistory((state) => {
    if (state.view) setCurrentView(state.view as ViewState);
    if (state.dashboardPath) setDashboardPath(state.dashboardPath);
    if (state.viewId !== undefined) setViewId(state.viewId);
    if (state.verifyToken !== undefined) setVerifyToken(state.verifyToken ?? null);
  });

  // Restore state from URL on initial load and setup pending redirect
  const [pendingRedirect, setPendingRedirectState] = useState<PendingRedirect | null>(null);
  const [deepLinkBootstrapping, setDeepLinkBootstrapping] = useState(false);

  const setPendingRedirect = useCallback((pending: PendingRedirect | null) => {
    setPendingRedirectState(pending);
    persistPendingRedirect(pending);
  }, []);

  const applyDashboardEntry = useCallback(
    (entry: DashboardEntryResult) => {
      if (entry.kind === 'dashboard') {
        setLoginRoleMismatch(false);
        setCurrentView('dashboard');
        setDashboardPath(entry.path);
        setViewId(entry.id ?? null);
        replaceView('dashboard', entry.path, entry.id, entry.search);
        return;
      }
      if (entry.kind === 'login') {
        setPendingRedirect(entry.pending);
        setLoginRoleMismatch(entry.roleMismatch);
        setLoginInitialTab(entry.pending.requiredRole === 'merchant' ? 'merchant' : 'customer');
        setCurrentView(entry.loginView);
        replaceView(entry.loginView, undefined, undefined, entry.nextSearch);
        return;
      }
      if (entry.kind === 'stripe-return') {
        setPendingRedirect(entry.pending);
        setCurrentView('role-selection');
        replaceView('role-selection');
        return;
      }
      if (entry.pending) {
        setPendingRedirect(entry.pending);
        const nextSearch = loginSearchWithNext(entry.pending);
        setCurrentView('role-selection');
        replaceView('role-selection', undefined, undefined, nextSearch);
      } else {
        setCurrentView('role-selection');
        replaceView('role-selection');
      }
    },
    [replaceView, setPendingRedirect],
  );

  const syncUrlOnBoot = useCallback(async () => {
    let user = getCurrentUser();
    if (user) {
      setUserRole(mapBackendRoleToFrontend(user.role) as UserRole);
    }

    const initialState = parseUrlToState();
    if (initialState.view === 'verify-link' && initialState.verifyToken) {
      setCurrentView('verify-link');
      setVerifyToken(initialState.verifyToken);
      return;
    }

    if (initialState.view === 'invoice-scan' || initialState.view === 'waybill-scan') {
      setCurrentView(initialState.view as ViewState);
      setViewId(initialState.viewId ?? null);
      return;
    }

    if (initialState.view === 'dashboard' && !user) {
      const dl = parseDlQueryParam(initialState.search);
      if (dl) {
        setDeepLinkBootstrapping(true);
        try {
          const response = await authApi.consumeDeepLink(dl);
          localStorage.setItem('access_token', response.access_token);
          if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
          }
          user = getCurrentUser();
          if (user) {
            setUserRole(mapBackendRoleToFrontend(user.role) as UserRole);
          }
        } catch {
          /* fall through to login + ?next= */
        } finally {
          setDeepLinkBootstrapping(false);
        }
      }
    }

    if (initialState.view === 'dashboard') {
      const isStripeReturn = window.location.search.includes('stripe_status=');
      const cleanSearch = stripDlFromSearch(initialState.search);
      const entry = resolveDashboardEntry(
        { ...initialState, search: cleanSearch },
        isStripeReturn,
      );
      if (entry) {
        applyDashboardEntry(entry);
        return;
      }
    }

    setCurrentView(initialState.view as ViewState);
    if (
      initialState.view === 'customer-login' ||
      initialState.view === 'merchant-login' ||
      initialState.view === 'login' ||
      initialState.view === 'role-selection'
    ) {
      const saved = restoreLoginPendingFromSearch(initialState.search);
      if (saved) {
        setPendingRedirect(saved);
        if (saved.requiredRole === 'merchant') setLoginInitialTab('merchant');
        else if (saved.requiredRole === 'customer') setLoginInitialTab('customer');
      }
    }
  }, [applyDashboardEntry, setPendingRedirect]);

  // --- IMMEDIATE ROLE & URL SYNC ON MOUNT ---
  useEffect(() => {
    void syncUrlOnBoot();
  }, [syncUrlOnBoot]);

  useEffect(() => {
    if (currentView === 'dashboard') {
      void ensureDashboardTranslations();
    }
  }, [currentView, ensureDashboardTranslations]);

  // --- LICENSE WATCHDOG (merchant only — deferred import) ---
  useEffect(() => {
    if (userRole !== 'merchant') return;

    let interval: ReturnType<typeof setInterval> | undefined;

    void import('./stores/useVendorStore').then(({ useVendorStore }) => {
      const { checkLicenseStatus } = useVendorStore.getState();
      checkLicenseStatus();
      interval = setInterval(() => {
        useVendorStore.getState().checkLicenseStatus();
      }, 60000);
    });

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [userRole]);

  // Handle Custom Events for Admin Navigation bubbling up
  useEffect(() => {
    const handleAdminNav = (e: any) => {
      const { path, id, tab, highlight } = e.detail || {};
      setDashboardPath(path);
      setViewId(id || null);
      const params = new URLSearchParams();
      if (tab) params.set('tab', String(tab));
      if (highlight) params.set('highlight', String(highlight));
      const qs = params.toString();
      pushView('dashboard', path, id, qs ? `?${qs}` : undefined);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('admin-nav', handleAdminNav);
    return () => window.removeEventListener('admin-nav', handleAdminNav);
  }, [pushView]);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    pushView(view);
  };

  const handleAccountNotFoundRegister = (prefill: import('./utils/registerPrefill').RegisterPrefill) => {
    const targetView = prefill.role === 'merchant' ? 'vendor-register' : 'customer-register';
    setCurrentView(targetView);
    pushView(targetView);
  };

  const handleHistoryBack = (fallbackView: ViewState) => {
    const canGoBack =
      typeof window !== 'undefined' &&
      window.history.length > 1 &&
      window.history.state?.view;

    if (canGoBack) {
      window.history.back();
      return;
    }

    setCurrentView(fallbackView);
    pushView(fallbackView);
  };

  const handleLoadingComplete = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(BOOT_SKIP_KEY, '1');
    }
    setLoading(false);
    void syncUrlOnBoot();
  };

  const handleBackToHome = () => {
    setCurrentView('role-selection');
    pushView('role-selection');
  };

  const handleSecureLogout = () => {
    import('./utils/clearAuthStorage').then(({ clearAuthStorage }) => clearAuthStorage());
    setUserRole(null);
    handleBackToHome();
  };
  const handleBackToLogin = () => {
    // Intelligent back navigation
    if (previousView === 'customer-login' || currentView === 'customer-register') {
      setCurrentView('customer-login');
      pushView('customer-login');
      return;
    }
    if (previousView === 'merchant-login' || currentView === 'vendor-register') {
      setCurrentView('merchant-login');
      pushView('merchant-login');
      return;
    }
    setCurrentView('role-selection');
    pushView('role-selection');
  };

  const handleNavigateToTerms = () => {
    setPreviousView(currentView);
    setLegalInitialSection('terms');
    setCurrentView('terms');
    pushView('terms');
  };

  const handleNavigateToLegal = (section: 'terms' | 'privacy' | 'wallet-loyalty') => {
    setPreviousView(currentView);
    if (section === 'wallet-loyalty') {
      setCurrentView('wallet-loyalty-terms');
      pushView('wallet-loyalty-terms');
      return;
    }
    setLegalInitialSection(section);
    setCurrentView('terms');
    pushView('terms');
  };

  const handleNavigateToLandingSection = (section: string) => {
    setLandingInitialSection(section);
    setCurrentView('landing');
    pushView('landing');
  };

  const handleNavigateToLicense = () => {
    setPreviousView(currentView);
    setCurrentView('business-license');
    pushView('business-license');
  };

  const handleNavigateToLicenseVerify = () => {
    setPreviousView('business-license');
    setCurrentView('business-license-verify');
    pushView('business-license-verify');
  };

  const handleBackFromTerms = () => {
    setCurrentView(previousView);
    pushView(previousView);
  };

  const handleLoginSuccess = async (role: UserRole) => {
    const [{ useVendorStore }, { useProfileStore }] = await Promise.all([
      import('./stores/useVendorStore'),
      import('./stores/useProfileStore'),
    ]);
    useVendorStore.getState().reset();
    useProfileStore.getState().clearProfile();
    setUserRole(role);

    const resolvedPending =
      pendingRedirect ||
      restoreLoginPendingFromSearch();

    // Redirect Flow: Check if there's a pending URL the user wanted to visit
    if (resolvedPending) {
      if (
        resolvedPending.requiredRole &&
        resolvedPending.requiredRole !== role
      ) {
        setPendingRedirect(resolvedPending);
        setLoginRoleMismatch(true);
        setLoginInitialTab(resolvedPending.requiredRole);
        const loginView =
          resolvedPending.requiredRole === 'merchant' ? 'merchant-login' : 'customer-login';
        setCurrentView(loginView);
        pushView(loginView, undefined, undefined, loginSearchWithNext(resolvedPending));
        return;
      }
      setLoginRoleMismatch(false);
      setDashboardPath(resolvedPending.path);
      setViewId(resolvedPending.id);
      setCurrentView('dashboard');
      pushView(
        'dashboard',
        resolvedPending.path,
        resolvedPending.id,
        resolvedPending.search,
      );
      setPendingRedirect(null);
      clearPersistedPendingRedirect();
      return;
    }

    const docScan = loadDocumentScanPending();
    if (docScan) {
      setCurrentView(docScan.kind === 'invoice' ? 'invoice-scan' : 'waybill-scan');
      setViewId(docScan.id);
      replaceView(docScan.kind === 'invoice' ? 'invoice-scan' : 'waybill-scan', undefined, docScan.id);
      return;
    }

    {
      const backendRole = getCurrentUser()?.role;
      const defaultPath =
        backendRole === 'VERIFICATION_OFFICER' ? 'verification-tasks' : 'home';
      setDashboardPath(defaultPath);
      setCurrentView('dashboard');
      pushView('dashboard', defaultPath);
    }
  };

  const handleDashboardNavigate = (path: string, id?: any, search?: string) => {
    setDashboardPath(path);
    setViewId(id || null);
    pushView('dashboard', path, id, search);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (path === 'store-profile') {
      queueMicrotask(() => {
        window.dispatchEvent(new CustomEvent('admin-store-profile-deep-link'));
      });
    }
  };

  const handleDashboardBack = () => {
    window.history.back();
  };

  const handleDocumentScanNeedLogin = useCallback((_kind: DocumentScanKind, _id: string) => {
    setCurrentView('role-selection');
    replaceView('role-selection');
  }, [replaceView]);

  const handleDocumentScanResolved = useCallback(
    (payload: { orderId: string; tab: 'invoices' | 'waybills'; roleHint?: 'customer' | 'merchant' }) => {
      clearDocumentScanPending();
      const user = getCurrentUser();
      const mappedRole = user ? (mapBackendRoleToFrontend(user.role) as UserRole) : null;
      if (mappedRole) {
        setUserRole(mappedRole);
      }
      const path =
        payload.roleHint === 'merchant' || mappedRole === 'merchant'
          ? 'explore-offer'
          : 'order-details';
      const search = `?tab=${payload.tab}`;
      setDashboardPath(path);
      setViewId(payload.orderId);
      setCurrentView('dashboard');
      replaceView('dashboard', path, payload.orderId, search);
    },
    [replaceView],
  );

  const getTitle = () => {
    switch (currentView) {
      case 'login': return 'Login';
      case 'admin-login': return 'Admin';
      case 'customer-register': return 'Register';
      case 'vendor-register': return 'Register';
      case 'forgot-password': return 'Recovery';
      case 'reset-password': return 'Reset';
      case 'account-recovery': return 'Account Recovery';
      case 'terms': return 'Terms & Conditions';
      case 'wallet-loyalty-terms': return language === 'ar' ? 'شروط الأرباح والولاء' : 'Wallet & Loyalty Terms';
      default: return 'Auth';
    }
  };

  const AuthLoader = () => (
    <div className="flex items-center justify-center h-64 w-full">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // --- MAINTENANCE COUNTDOWN COMPONENT ---
  const MaintenanceCountdown = ({ endTime }: { endTime: string }) => {
    const [timeLeft, setTimeLeft] = useState<{ h: number, m: number, s: number } | null>(null);

    useEffect(() => {
      const calculate = () => {
        const diff = new Date(endTime).getTime() - new Date().getTime();
        if (diff <= 0) return null;
        return {
          h: Math.floor(diff / (1000 * 60 * 60)),
          m: Math.floor((diff / (1000 * 60)) % 60),
          s: Math.floor((diff / 1000) % 60)
        };
      };

      setTimeLeft(calculate());
      const timer = setInterval(() => setTimeLeft(calculate()), 1000);
      return () => clearInterval(timer);
    }, [endTime]);

    if (!timeLeft) return null;

    return (
      <div className="grid grid-cols-3 gap-3 md:gap-4 w-full max-w-xs mx-auto">
        {[
          { label: language === 'ar' ? 'ساعة' : 'Hrs', value: timeLeft.h },
          { label: language === 'ar' ? 'دقيقة' : 'Min', value: timeLeft.m },
          { label: language === 'ar' ? 'ثانية' : 'Sec', value: timeLeft.s }
        ].map((item, i) => (
          <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-3 flex flex-col items-center">
            <span className="text-2xl md:text-3xl font-black text-gold-400 font-mono italic leading-none">{String(item.value).padStart(2, '0')}</span>
            <span className="text-[10px] text-white/30 uppercase font-bold tracking-tighter mt-1">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  // --- LUXURY MAINTENANCE LOCKSCREEN (Hard-Block 2026) ---
  if (publicSystemStatus?.maintenanceMode && userRole !== 'admin' && currentView !== 'admin-login') {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0F0E0C] flex items-center justify-center p-4 md:p-6 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.3), transparent 70%)' }} />

        <div className="relative z-10 view-fade-in w-full max-w-xl max-h-[95vh] bg-[#12110F]/80 border border-white/5 p-6 md:p-10 rounded-[3rem] shadow-2xl backdrop-blur-xl space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar">
          {/* Header Icon */}
          <div className="w-20 h-20 bg-red-500/10 rounded-[1.8rem] mx-auto flex items-center justify-center border border-red-500/20 shadow-xl shadow-red-500/10 relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
          </div>

          <div className="text-center space-y-3">
            <h1 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight uppercase">
              {language === 'ar' ? (publicSystemStatus?.maintenanceMsgAr || 'النظام في وضع الصيانة') : (publicSystemStatus?.maintenanceMsgEn || 'System Under Maintenance')}
            </h1>
            <p className="text-white/40 text-sm md:text-base leading-relaxed max-w-md mx-auto font-medium">
              {language === 'ar' ? 'نعمل حالياً على تطوير البنية التحتية لتوفير تجربة أداء استثنائية. سنعود قريباً.' : 'We are upgrading our core infrastructure for an exceptional experience. Back soon.'}
            </p>
          </div>

          {/* Support Grid - Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 bg-gold-500/10 rounded-xl flex items-center justify-center text-gold-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-[8px] text-white/30 uppercase font-black tracking-widest truncate">{language === 'ar' ? 'الدعم الهاتفي' : 'Phone'}</p>
                <p className="text-white text-sm font-bold truncate">0525700525</p>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
              </div>
              <div className="text-left overflow-hidden">
                <p className="text-[8px] text-white/30 uppercase font-black tracking-widest truncate">{language === 'ar' ? 'البريد الإلكتروني' : 'Email'}</p>
                <p className="text-white text-sm font-bold truncate">{siteContacts.contact}</p>
              </div>
            </div>
          </div>

          {/* Countdown & Return Time */}
          {publicSystemStatus?.endTime && (
            <div className="space-y-4 pt-4 border-t border-white/5 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{language === 'ar' ? 'الوقت المتبقي للعودة' : 'System Returns In'}</span>
              </div>

              <MaintenanceCountdown endTime={publicSystemStatus.endTime} />

              <div className="flex flex-col items-center gap-1 pt-2">
                <span className="text-[10px] text-white/20 font-bold uppercase tracking-widest">{language === 'ar' ? 'التاريخ والوقت المتوقع' : 'Estimated Return'}</span>
                <p className="text-sm font-bold text-white/60">
                  {new Date(publicSystemStatus.endTime).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'long' })}
                  <span className="mx-2 opacity-30">|</span>
                  {new Date(publicSystemStatus.endTime).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button onClick={() => window.location.reload()} className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border border-white/5 active:scale-95 text-white/50 hover:text-white">
              {language === 'ar' ? 'تحديث الحالة' : 'Refresh System'}
            </button>
          </div>
        </div>

        {/* Hidden Admin Access */}
        <div className="absolute bottom-6 right-6 opacity-20 hover:opacity-100 transition-opacity">
          <button onClick={() => handleNavigate('admin-login')} className="p-3 text-white/20 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1814] text-white font-sans selection:bg-gold-500 selection:text-white relative">

      {currentView !== 'dashboard' && (
        <>
          <div
            className="fixed inset-0 z-0 pointer-events-none transform-gpu"
            style={{
              backgroundImage: `
                    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
                `,
              backgroundSize: '60px 60px',
              maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)'
            }}
          />
          <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-b from-luxury-gradient/20 via-[#1A1814]/80 to-[#0F0E0C]" />
        </>
      )}

      <div className="relative z-10">
        {loading && (
          <LoadingScreen onComplete={handleLoadingComplete} />
        )}
        {deepLinkBootstrapping && (
          <div className="fixed inset-0 z-[100] bg-[#0F0E0C]/90 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-10 h-10 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gold-300/80 text-sm font-medium">
              {language === 'ar' ? 'جاري التحقق من الرابط…' : 'Verifying your link…'}
            </p>
          </div>
        )}

        {isSupportOpen && (
          <Suspense fallback={null}>
            <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
          </Suspense>
        )}

        {!loading && (
          <>
            {currentView === 'verify-link' && verifyToken ? (
              <div className="view-fade-in">
                <Suspense fallback={routeFallback}>
                  <VerifyLinkPage
                    token={verifyToken}
                    onNavigateToTask={(taskId) => {
                      const user = getCurrentUser();
                      if (user) {
                        setUserRole(mapBackendRoleToFrontend(user.role) as UserRole);
                      }
                      setCurrentView('dashboard');
                      setDashboardPath('verification-task-details');
                      setViewId(taskId);
                      pushView('dashboard', 'verification-task-details', taskId);
                    }}
                    onNavigateLogin={() => handleNavigate('admin-login')}
                  />
                </Suspense>
              </div>
            ) : currentView === 'invoice-scan' || currentView === 'waybill-scan' ? (
              <div className="view-fade-in min-h-screen bg-[#0B0A09]">
                <DocumentScanRedirect
                  kind={currentView === 'invoice-scan' ? 'invoice' : 'waybill'}
                  documentId={String(viewId || '')}
                  onNeedLogin={handleDocumentScanNeedLogin}
                  onResolved={handleDocumentScanResolved}
                />
              </div>
            ) : currentView === 'dashboard' ? (
              <div className="view-fade-in h-full">
                <Suspense fallback={routeFallback}>
                  <DashboardShell
                    userRole={userRole}
                    language={language}
                    dashboardPath={dashboardPath}
                    viewId={viewId}
                    onLogout={handleSecureLogout}
                    onNavigate={handleDashboardNavigate}
                    onBack={handleDashboardBack}
                    maintenanceMode={publicSystemStatus?.maintenanceMode === true}
                  />
                </Suspense>
              </div>
            ) : currentView === 'role-selection' ? (
              <RoleSelectionScreen
                onCustomerClick={() => {
                  handleNavigate('how-we-work');
                }}
                onMerchantClick={() => {
                  handleNavigate('merchant-login');
                }}
                onWholesaleClick={() => handleNavigate('wholesale')}
                onHowWeWorkClick={() => handleNavigate('landing')}
                onOpenSupport={() => setIsSupportOpen(true)}
                onAdminClick={() => handleNavigate('admin-login')}
                onNavigateToLegal={handleNavigateToLegal}
                onNavigateToLandingSection={handleNavigateToLandingSection}
                onEarnIncomeClick={() => handleNavigate('earn-income')}
                onNavigateToLicense={handleNavigateToLicense}
              />
            ) : currentView === 'earn-income' ? (
              <Suspense fallback={routeFallback}>
                <EarnIncomeLanding
                  onBack={() => handleNavigate('role-selection')}
                  onStart={() => handleNavigate('role-selection')}
                />
              </Suspense>
            ) : currentView === 'wholesale' ? (
              <Suspense fallback={routeFallback}>
                <WholesaleScreen onBack={() => handleNavigate('role-selection')} />
              </Suspense>
            ) : currentView === 'business-license' ? (
              <Suspense fallback={routeFallback}>
                <BusinessLicensePage
                  onBack={() => handleHistoryBack('role-selection')}
                  onVerifyRegistry={handleNavigateToLicenseVerify}
                />
              </Suspense>
            ) : currentView === 'business-license-verify' ? (
              <Suspense fallback={routeFallback}>
                <RegistryPdfViewer onBack={() => handleHistoryBack('business-license')} />
              </Suspense>
            ) : currentView === 'how-we-work' ? (
              <Suspense fallback={routeFallback}>
                <HowWeWorkScreen
                  onComplete={() => {
                    handleNavigate('customer-login');
                  }}
                  onTutorial={() => handleNavigate('how-we-work-tutorial')}
                  onBack={() => handleNavigate('role-selection')}
                  onTermsClick={() => handleNavigateToLegal('terms')}
                  onOpenSupport={() => setIsSupportOpen(true)}
                  onAdminClick={() => handleNavigate('admin-login')}
                  onNavigateToLegal={handleNavigateToLegal}
                  onNavigateToLandingSection={handleNavigateToLandingSection}
                  onNavigateToLicense={handleNavigateToLicense}
                />
              </Suspense>
            ) : currentView === 'how-we-work-tutorial' ? (
              <Suspense fallback={routeFallback}>
                <HowWeWorkTutorial
                  onComplete={() => handleNavigate('customer-login')}
                  onBack={() => handleNavigate('how-we-work')}
                  onOpenSupport={() => setIsSupportOpen(true)}
                  onAdminClick={() => handleNavigate('admin-login')}
                  onNavigateToLegal={handleNavigateToLegal}
                  onNavigateToLandingSection={handleNavigateToLandingSection}
                  onNavigateToLicense={handleNavigateToLicense}
                />
              </Suspense>
            ) : currentView === 'landing' ? (

              /* 2. LANDING VIEW */
              <main className="relative view-fade-in">
                <Navbar
                  onLoginClick={() => handleNavigate('role-selection')}
                  onHomeClick={() => handleNavigate('role-selection')}
                />
                <Hero
                  onLogin={() => handleNavigate('login')}
                  onRequestNow={() => handleNavigate('role-selection')}
                />
                <Suspense fallback={null}>
                  <TrustStats />
                  <AboutCompany />
                  <Guarantees />
                  <HowItWorks />
                  <MerchantCallout onRegister={() => handleNavigate('vendor-register')} />
                  <LegalDocs />
                </Suspense>
                <Footer
                  onOpenSupport={() => setIsSupportOpen(true)}
                  onNavigateToLicense={handleNavigateToLicense}
                />
              </main>
            ) : (

              <div className="view-fade-in">
                <AuthLayout
                  onBack={currentView === 'terms' || currentView === 'wallet-loyalty-terms' ? handleBackFromTerms : (currentView === 'customer-register' || currentView === 'forgot-password' || currentView === 'reset-password' || currentView === 'account-recovery' ? handleBackToLogin : handleBackToHome)}
                  title={getTitle()}
                  wide={currentView === 'vendor-register' || currentView === 'terms' || currentView === 'wallet-loyalty-terms'}
                  narrow={
                    currentView === 'login' ||
                    currentView === 'customer-login' ||
                    currentView === 'merchant-login'
                  }
                >
                  <Suspense fallback={<AuthLoader />}>
                    {currentView === 'login' && (
                      <LoginPage
                        initialTab={loginInitialTab}
                        pendingRedirect={pendingRedirect}
                        roleMismatch={loginRoleMismatch}
                        onRegisterClick={() => handleNavigate('vendor-register')}
                        onCustomerRegisterClick={() => handleNavigate('customer-register')}
                        onAccountNotFoundRegister={handleAccountNotFoundRegister}
                        onLoginSuccess={handleLoginSuccess}
                        onForgotPasswordClick={() => handleNavigate('forgot-password')}
                        onRecoveryClick={(r) => { setRecoveryRole(r); handleNavigate('account-recovery'); }}
                      />
                    )}

                    {currentView === 'customer-login' && (
                      <LoginPage
                        forcedRole="customer"
                        pendingRedirect={pendingRedirect}
                        roleMismatch={loginRoleMismatch}
                        onRegisterClick={() => { /* Should not happen in forced mode usually */ }}
                        onCustomerRegisterClick={() => handleNavigate('customer-register')}
                        onAccountNotFoundRegister={handleAccountNotFoundRegister}
                        onLoginSuccess={handleLoginSuccess}
                        onForgotPasswordClick={() => handleNavigate('forgot-password')}
                        onRecoveryClick={(r) => { setRecoveryRole(r); handleNavigate('account-recovery'); }}
                      />
                    )}

                    {currentView === 'merchant-login' && (
                      <LoginPage
                        forcedRole="merchant"
                        pendingRedirect={pendingRedirect}
                        roleMismatch={loginRoleMismatch}
                        onRegisterClick={() => handleNavigate('vendor-register')}
                        onCustomerRegisterClick={() => { /* Should not happen */ }}
                        onAccountNotFoundRegister={handleAccountNotFoundRegister}
                        onLoginSuccess={handleLoginSuccess}
                        onForgotPasswordClick={() => handleNavigate('forgot-password')}
                        onRecoveryClick={(r) => { setRecoveryRole(r); handleNavigate('account-recovery'); }}
                      />
                    )}

                    {currentView === 'vendor-register' && (
                      <VendorRegister
                        onComplete={() => handleNavigate('merchant-login')}
                        onBack={() => handleNavigate('merchant-login')} // NEW
                      />
                    )}

                    {currentView === 'customer-register' && (
                      <CustomerRegister
                        onLoginClick={handleBackToLogin}
                        onRegisterSuccess={() => handleLoginSuccess('customer')}
                        onTermsClick={() => handleNavigateToLegal('terms')}
                      />
                    )}

                    {currentView === 'admin-login' && (
                      <AdminLogin onLoginSuccess={() => handleLoginSuccess('admin')} />
                    )}

                    {currentView === 'forgot-password' && (
                      <ForgotPassword
                        onBackToLogin={handleBackToLogin}
                        onSuccess={() => handleNavigate('reset-password')}
                      />
                    )}

                    {currentView === 'reset-password' && (
                      <ResetPassword onLoginClick={handleBackToLogin} />
                    )}

                    {currentView === 'account-recovery' && (
                      <AccountRecoveryWizard onBackToLogin={handleBackToLogin} role={recoveryRole} />
                    )}

                    {currentView === 'terms' && (
                      <TermsView initialSection={legalInitialSection} />
                    )}

                    {currentView === 'wallet-loyalty-terms' && (
                      <WalletLoyaltyTermsView />
                    )}
                  </Suspense>
                </AuthLayout>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  useEffect(() => {
    initPlatformErrorReporter();
  }, []);

  return (
    <LanguageProvider>
      <PlatformErrorBoundary>
        <ConnectivityCapsule />
        <AppContent />
      </PlatformErrorBoundary>
    </LanguageProvider>
  );
}

export default App;
