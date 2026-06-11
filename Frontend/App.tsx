
import React, { useState, Suspense, lazy, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { LoadingScreen } from './components/LoadingScreen';
import { RoleSelectionScreen } from './components/RoleSelectionScreen';
import { WholesaleScreen } from './components/WholesaleScreen';
import { HowWeWorkScreen } from './components/HowWeWorkScreen';
import { HowWeWorkTutorial } from './components/HowWeWorkTutorial';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';
import { SITE_CONTACT_EMAIL } from './config/site';

import { LegalDocs } from './components/sections/LegalDocs';
import { SupportModal } from './components/modals/SupportModal';

// Sections
import { TrustStats } from './components/sections/TrustStats';
import { AboutCompany } from './components/sections/AboutCompany';
import { Guarantees } from './components/sections/Guarantees';
import { HowItWorks } from './components/sections/HowItWorks';
import { MerchantCallout } from './components/sections/MerchantCallout';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Dashboard
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { DashboardHome } from './components/dashboard/DashboardHome';
import { MerchantHome } from './components/dashboard/merchant/MerchantHome';
import { MerchantMarketplace } from './components/dashboard/merchant/MerchantMarketplace';
import { MarketplaceOfferDetails } from './components/dashboard/merchant/MarketplaceOfferDetails'; // NEW
import { MerchantOffers } from './components/dashboard/merchant/MerchantOffers';
import { MerchantOrders } from './components/dashboard/merchant/MerchantOrders';
import { MerchantWallet } from './components/dashboard/merchant/MerchantWallet';
import { MerchantProfile } from './components/dashboard/merchant/MerchantProfile';
import { MerchantSettings } from './components/dashboard/merchant/MerchantSettings';
import { MerchantNotifications } from './components/dashboard/merchant/MerchantNotifications';
import { MerchantStatusGuard } from './components/dashboard/merchant/MerchantStatusGuard';
import { MerchantDisputeDetails } from './components/dashboard/merchant/MerchantDisputeDetails';
import { MerchantShippingCartPage } from './components/dashboard/merchant/MerchantShippingCartPage';
import { MerchantSupportPage } from './components/dashboard/merchant/support/MerchantSupportPage';
import { MerchantResolutionPage } from './components/dashboard/merchant/MerchantResolutionPage';
import { MerchantReviews } from './components/dashboard/merchant/MerchantReviews';
import { MerchantPerformance } from './components/dashboard/merchant/MerchantPerformance';


// Admin Imports
import { AdminHome } from './components/dashboard/admin/AdminHome';
import { SecurityAudit } from './components/dashboard/admin/SecurityAudit'; // NEW
import { AdminChatOversight } from './components/dashboard/admin/chat/AdminChatOversight'; // NEW
import { AdminChatMonitoring } from './components/dashboard/admin/chat/AdminChatMonitoring'; // NEW

import { MyOrders } from './components/dashboard/MyOrders';
import { OrderDetails } from './components/dashboard/OrderDetails';
import { CreateOrderWizard } from './components/dashboard/create-order/CreateOrderWizard';
import { ChatLayout } from './components/dashboard/chat/ChatLayout';
import { CheckoutWizard } from './components/dashboard/checkout/CheckoutWizard';
import { ProfileView } from './components/dashboard/profile/ProfileView';
import { ResolutionCenter } from './components/dashboard/resolution/ResolutionCenter';
import { InfoCenter } from './components/dashboard/info/InfoCenter';
import { WalletView } from './components/dashboard/wallet/WalletView';

// New Customer Dashboard Pages
import { ShipmentsPage } from './components/dashboard/shipments/ShipmentsPage';
import { ViolationsPage } from './components/dashboard/ViolationsPage';
import { ShippingCartPage } from './components/dashboard/shipping-cart/ShippingCartPage';
import { BillingPage } from './components/dashboard/wallet/BillingPage';
import { ReturnsExchangePage } from './components/dashboard/resolution/ReturnsExchangePage';
import { SupportPage } from './components/dashboard/support/SupportPage';
import { PreferencesPage } from './components/dashboard/preferences/PreferencesPage';
import { LoyaltyPage } from './components/dashboard/loyalty/LoyaltyPage';
import { RewardsPage } from './components/dashboard/rewards/RewardsPage';
import { ShipmentDetailsPage } from './components/dashboard/shipments/ShipmentDetailsPage';
import { CustomerResolutionCenter } from './components/dashboard/customer/CustomerResolutionCenter';
import { CustomerDisputeDetails } from './components/dashboard/customer/CustomerDisputeDetails';

// Store
import { useVendorStore } from './stores/useVendorStore';
import { useProfileStore } from './stores/useProfileStore';
import { useAdminStore } from './stores/useAdminStore';
import { useSystemAutomation } from './stores/useSystemAutomation'; // NEW

// Navigation
import { useNavigationHistory, parseUrlToState } from './utils/useNavigationHistory';
import {
  inferRequiredRoleFromDashboardPath,
  splitDashboardPath,
  type PendingRedirect,
} from './utils/widersDeepLink';

function buildPendingRedirect(
  dashboardPath: string,
  viewId: any,
  search?: string,
): PendingRedirect {
  const { path, embeddedSearch } = splitDashboardPath(dashboardPath);
  const resolvedSearch =
    search || embeddedSearch || (typeof window !== 'undefined' ? window.location.search : undefined);
  return {
    path,
    id: viewId,
    search: resolvedSearch || undefined,
    requiredRole: inferRequiredRoleFromDashboardPath(path),
  };
}

// Auth Setup
import { getCurrentUser, mapBackendRoleToFrontend } from './utils/auth';

// Auth Components
import { AuthLayout } from './components/auth/AuthLayout';
const LoginPage = lazy(() => import('./components/auth/LoginPage').then(module => ({ default: module.LoginPage })));
const VendorRegister = lazy(() => import('./components/auth/VendorRegister').then(module => ({ default: module.VendorRegister })));
const CustomerRegister = lazy(() => import('./components/auth/CustomerRegister').then(module => ({ default: module.CustomerRegister })));
const AdminLogin = lazy(() => import('./components/auth/AdminLogin').then(module => ({ default: module.AdminLogin })));
const ForgotPassword = lazy(() => import('./components/auth/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword').then(module => ({ default: module.ResetPassword })));
const TermsView = lazy(() => import('./components/auth/TermsView').then(module => ({ default: module.TermsView })));
const AccountRecoveryWizard = lazy(() => import('./components/auth/AccountRecoveryWizard').then(module => ({ default: module.AccountRecoveryWizard })));
import { EarnIncomeLanding } from './components/EarnIncomeLanding';
import { VerifyLinkPage } from './components/verify/VerifyLinkPage';
import { BusinessLicensePage } from './components/legal/BusinessLicensePage';
import { RegistryPdfViewer } from './components/legal/RegistryPdfViewer';

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
  | 'dashboard'
  | 'role-selection'
  | 'wholesale'
  | 'how-we-work'
  | 'how-we-work-tutorial'
  | 'earn-income'
  | 'verify-link'
  | 'business-license'
  | 'business-license-verify';
type UserRole = 'customer' | 'merchant' | 'admin' | null;

function AppContent() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [maintenanceChecked, setMaintenanceChecked] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [legalInitialSection, setLegalInitialSection] = useState<'terms' | 'privacy'>('terms');
  const [landingInitialSection, setLandingInitialSection] = useState<string | null>(null);
  const [recoveryRole, setRecoveryRole] = useState<'customer' | 'merchant'>('customer');
  const { publicSystemStatus, fetchPublicStatus } = useAdminStore();

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
  const [pendingRedirect, setPendingRedirect] = useState<PendingRedirect | null>(null);

  // --- IMMEDIATE ROLE & URL SYNC ON MOUNT ---
  // This prevents the "Flash of Black Screen" by ensuring role is set before loading finishes
  useEffect(() => {
    // 1. Sync Role From Storage
    const user = getCurrentUser();
    if (user) {
      const normalizedRole = mapBackendRoleToFrontend(user?.role);
      setUserRole(normalizedRole as UserRole);
    }

    // 2. Sync URL State Immediately (Prevents delay in route calculation)
    const initialState = parseUrlToState();
    if (initialState.view === 'verify-link' && initialState.verifyToken) {
      setCurrentView('verify-link');
      setVerifyToken(initialState.verifyToken);
      return;
    }
    if (initialState.view === 'dashboard') {
      const isStripeReturn = window.location.search.includes('stripe_status=');
      const pending = buildPendingRedirect(
        initialState.dashboardPath || 'home',
        initialState.viewId,
        initialState.search,
      );
      if (user) {
        const normalizedRole = mapBackendRoleToFrontend(user.role);
        if (pending.requiredRole && pending.requiredRole !== normalizedRole) {
          import('./utils/clearAuthStorage').then(({ clearAuthStorage }) => clearAuthStorage());
          setUserRole(null);
          setPendingRedirect(pending);
          setLoginRoleMismatch(true);
          setLoginInitialTab(pending.requiredRole);
          setCurrentView(
            pending.requiredRole === 'merchant' ? 'merchant-login' : 'customer-login',
          );
          replaceView(
            pending.requiredRole === 'merchant' ? 'merchant-login' : 'customer-login',
          );
        } else {
          setCurrentView('dashboard');
          setDashboardPath(initialState.dashboardPath || 'home');
          setViewId(initialState.viewId);
          replaceView(
            'dashboard',
            initialState.dashboardPath || 'home',
            initialState.viewId,
            initialState.search,
          );
        }
      } else if (isStripeReturn) {
        setPendingRedirect(
          buildPendingRedirect(
            initialState.dashboardPath || 'home',
            initialState.viewId,
            window.location.search,
          ),
        );
        setCurrentView('role-selection');
        replaceView('role-selection');
      } else {
        const pending = buildPendingRedirect(
          initialState.dashboardPath || 'home',
          initialState.viewId,
          initialState.search,
        );
        setPendingRedirect(pending);
        if (pending.requiredRole === 'merchant') {
          setLoginInitialTab('merchant');
          setCurrentView('merchant-login');
          replaceView('merchant-login');
        } else if (pending.requiredRole === 'customer') {
          setLoginInitialTab('customer');
          setCurrentView('customer-login');
          replaceView('customer-login');
        } else {
          setCurrentView('role-selection');
          replaceView('role-selection');
        }
      }
    } else {
      setCurrentView(initialState.view as ViewState);
    }
  }, []);

  // --- MAINTENANCE MODE WATCHER (Priority Zero — runs before anything renders) ---
  useEffect(() => {
    // Immediately fetch maintenance status and only then allow rendering
    const checkAndPoll = async () => {
      await fetchPublicStatus();
      setMaintenanceChecked(true);
    };
    checkAndPoll();
    // Poll every 30 seconds to catch live toggles
    const interval = setInterval(fetchPublicStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // --- AUTOMATION ENGINE ---
  const { startAutomation, stopAutomation } = useSystemAutomation();

  useEffect(() => {
    // Silencer: Stop automation if platform is in maintenance
    if (publicSystemStatus?.maintenanceMode) {
      stopAutomation();
      return;
    }

    startAutomation();
    return () => stopAutomation();
  }, [publicSystemStatus?.maintenanceMode]);

  // --- LICENSE WATCHDOG ---
  const { checkLicenseStatus, vendorStatus } = useVendorStore();

  useEffect(() => {
    // Check immediately if user is merchant
    if (userRole === 'merchant') {
      checkLicenseStatus();
    }

    // Periodic Check (Redundant if Automation Engine works, but good as fallback)
    const interval = setInterval(() => {
      if (userRole === 'merchant') {
        checkLicenseStatus();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [userRole, checkLicenseStatus]);

  // Handle Custom Events for Admin Navigation bubbling up
  useEffect(() => {
    const handleAdminNav = (e: any) => {
      const { path, id } = e.detail;
      setDashboardPath(path);
      setViewId(id || null); // 2026 Navigation Fix: Clear ID if not explicitly provided in the event
      pushView('dashboard', path, id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('admin-nav', handleAdminNav);
    return () => window.removeEventListener('admin-nav', handleAdminNav);
  }, [pushView]);

  const handleNavigate = (view: ViewState) => {
    setCurrentView(view);
    pushView(view);
  };

  const handleLoadingComplete = () => {
    setLoading(false);

    // Safety: ensure final state is synced
    const initialState = parseUrlToState();
    const user = getCurrentUser();
    const isStripeReturn = window.location.search.includes('stripe_status=');

    if (initialState.view === 'dashboard' && user) {
      const normalizedRole = mapBackendRoleToFrontend(user?.role);
      const pending = buildPendingRedirect(
        initialState.dashboardPath || 'home',
        initialState.viewId,
        initialState.search,
      );
      if (pending.requiredRole && pending.requiredRole !== normalizedRole) {
        import('./utils/clearAuthStorage').then(({ clearAuthStorage }) => clearAuthStorage());
        setUserRole(null);
        setPendingRedirect(pending);
        setLoginRoleMismatch(true);
        setLoginInitialTab(pending.requiredRole);
        setCurrentView(
          pending.requiredRole === 'merchant' ? 'merchant-login' : 'customer-login',
        );
        replaceView(
          pending.requiredRole === 'merchant' ? 'merchant-login' : 'customer-login',
        );
      } else {
        setUserRole(normalizedRole as UserRole);
        setDashboardPath(initialState.dashboardPath || 'home');
        setViewId(initialState.viewId);
        setCurrentView('dashboard');
        replaceView(
          'dashboard',
          initialState.dashboardPath || 'home',
          initialState.viewId,
          initialState.search,
        );
      }
    } else if (initialState.view === 'dashboard' && isStripeReturn) {
      setPendingRedirect(
        buildPendingRedirect(
          initialState.dashboardPath || 'home',
          initialState.viewId,
          window.location.search,
        ),
      );
      setCurrentView('role-selection');
      replaceView('role-selection');
    } else if (initialState.view === 'dashboard' && !user) {
      const pending = buildPendingRedirect(
        initialState.dashboardPath || 'home',
        initialState.viewId,
        initialState.search,
      );
      setPendingRedirect(pending);
      if (pending.requiredRole === 'merchant') {
        setLoginInitialTab('merchant');
        setCurrentView('merchant-login');
        replaceView('merchant-login');
      } else if (pending.requiredRole === 'customer') {
        setLoginInitialTab('customer');
        setCurrentView('customer-login');
        replaceView('customer-login');
      } else {
        setCurrentView('role-selection');
        replaceView('role-selection');
      }
    } else {
      setCurrentView(initialState.view as ViewState);
    }
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

  const handleNavigateToLegal = (section: 'terms' | 'privacy') => {
    setPreviousView(currentView);
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

  const handleLoginSuccess = (role: UserRole) => {
    // SECURITY: Clear stale state from previous sessions/roles before entering dashboard
    useVendorStore.getState().reset();
    useProfileStore.getState().clearProfile();
    // useOrderStore.getState().clearOrders(); // If implemented, or use resetForRole below in layout

    setUserRole(role);

    // Redirect Flow: Check if there's a pending URL the user wanted to visit
    if (pendingRedirect) {
      if (
        pendingRedirect.requiredRole &&
        pendingRedirect.requiredRole !== role
      ) {
        setLoginRoleMismatch(true);
        setLoginInitialTab(pendingRedirect.requiredRole);
        setCurrentView(
          pendingRedirect.requiredRole === 'merchant' ? 'merchant-login' : 'customer-login',
        );
        pushView(
          pendingRedirect.requiredRole === 'merchant' ? 'merchant-login' : 'customer-login',
        );
        return;
      }
      setLoginRoleMismatch(false);
      setDashboardPath(pendingRedirect.path);
      setViewId(pendingRedirect.id);
      setCurrentView('dashboard');
      pushView(
        'dashboard',
        pendingRedirect.path,
        pendingRedirect.id,
        pendingRedirect.search,
      );
      setPendingRedirect(null);
    } else {
      const backendRole = getCurrentUser()?.role;
      const defaultPath =
        backendRole === 'VERIFICATION_OFFICER' ? 'verification-tasks' : 'home';
      setDashboardPath(defaultPath);
      setCurrentView('dashboard');
      pushView('dashboard', defaultPath);
    }
  };

  const handleDashboardNavigate = (path: string, id?: any) => {
    setDashboardPath(path);
    setViewId(id || null); // 2026 Navigation Fix: Clear ID if not explicitly provided (e.g. sidebar clicks)
    pushView('dashboard', path, id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDashboardBack = () => {
    window.history.back();
  };

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

  // --- GATE: Block ALL rendering until maintenance status is resolved ---
  // This prevents the dashboard from flashing before maintenance check completes
  if (!maintenanceChecked) {
    return (
      <div className="fixed inset-0 bg-[#0F0E0C] z-[9999] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/30 text-xs uppercase tracking-widest font-bold">Checking System Status...</p>
        </div>
      </div>
    );
  }

  // --- LUXURY MAINTENANCE LOCKSCREEN (Hard-Block 2026) ---
  if (publicSystemStatus?.maintenanceMode && userRole !== 'admin' && currentView !== 'admin-login') {
    return (
      <div className="fixed inset-0 z-[9999] bg-[#0F0E0C] flex items-center justify-center p-4 md:p-6 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.3), transparent 70%)' }} />

        <motion.div
          initial={{ scale: 0.98, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-xl max-h-[95vh] bg-[#12110F]/80 border border-white/5 p-6 md:p-10 rounded-[3rem] shadow-2xl backdrop-blur-xl space-y-6 md:space-y-8 overflow-y-auto custom-scrollbar"
        >
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
                <p className="text-white text-sm font-bold truncate">{SITE_CONTACT_EMAIL}</p>
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
        </motion.div>

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
        <AnimatePresence mode="wait">
          {loading && (
            <LoadingScreen key="loader" onComplete={handleLoadingComplete} />
          )}
        </AnimatePresence>

        <SupportModal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />

        {!loading && (
          <AnimatePresence mode="wait">

            {currentView === 'verify-link' && verifyToken ? (
              <motion.div key="verify-link" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
              </motion.div>
            ) : currentView === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                {/* Session Loading Guard */}
                {!userRole && (
                  <div className="fixed inset-0 bg-[#0F0E0C] flex flex-col items-center justify-center z-50">
                    <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gold-400/60 font-medium animate-pulse">
                      {language === 'ar' ? 'جاري استعادة الجلسة...' : 'Restoring session...'}
                    </p>
                  </div>
                )}

                {/* A. Customer Routes */}
                {userRole === 'customer' && (
                  <DashboardLayout
                    role="customer"
                    onLogout={handleSecureLogout}
                    currentPath={dashboardPath}
                    onNavigate={handleDashboardNavigate}
                    onBack={handleDashboardBack}
                  >
                    {dashboardPath === 'home' && <DashboardHome onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'orders' && <MyOrders onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'order-details' && <OrderDetails orderId={viewId} onBack={() => handleDashboardNavigate('orders')} onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'create-order' && <CreateOrderWizard onComplete={() => handleDashboardNavigate('orders')} onCancel={() => handleDashboardNavigate('orders')} />}
                    {dashboardPath === 'checkout' && <CheckoutWizard onComplete={() => handleDashboardNavigate('orders')} onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'chats' && <ChatLayout viewId={viewId} onNavigateToCheckout={(orderId) => handleDashboardNavigate('checkout', orderId)} />}
                    {dashboardPath === 'profile' && <ProfileView />}
                    {dashboardPath === 'wallet' && <WalletView onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'billing' && <BillingPage />}
                    {dashboardPath === 'shipments' && <ShipmentsPage onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'shipment-details' && <ShipmentDetailsPage shipmentId={viewId} onBack={() => handleDashboardNavigate('shipments')} role="customer" />}
                    {dashboardPath === 'shipping-cart' && <ShippingCartPage onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'resolution' && <CustomerResolutionCenter onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'dispute-details' && <CustomerDisputeDetails caseId={viewId} onBack={() => handleDashboardNavigate('resolution')} onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'support' && <SupportPage onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'preferences' && <PreferencesPage onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'loyalty' && <LoyaltyPage />}
                    {dashboardPath === 'rewards' && <RewardsPage />}
                    {dashboardPath === 'violations' && <ViolationsPage role="customer" />}
                    {dashboardPath === 'info-center' && <InfoCenter />}
                  </DashboardLayout>
                )}

                {/* B. Merchant Routes - LOCKDOWN AT LAYOUT LEVEL */}
                {userRole === 'merchant' && (
                  <MerchantStatusGuard>
                    <DashboardLayout
                      role="merchant"
                      onLogout={handleSecureLogout}
                      currentPath={dashboardPath}
                      onNavigate={handleDashboardNavigate}
                      onBack={handleDashboardBack}
                    >
                      {dashboardPath === 'home' && <MerchantHome onNavigate={handleDashboardNavigate} />}

                      {dashboardPath === 'marketplace' && <MerchantMarketplace onNavigate={handleDashboardNavigate} />}
                      {(dashboardPath === 'explore-offer' || (dashboardPath === 'orders' && viewId)) && <MarketplaceOfferDetails orderId={viewId} onBack={handleDashboardBack} />}
                      {(dashboardPath === 'active-orders' || (dashboardPath === 'orders' && !viewId)) && <MerchantOrders onNavigate={handleDashboardNavigate} />}
                      {dashboardPath === 'my-offers' && <MerchantOffers onNavigate={handleDashboardNavigate} />}
                      {dashboardPath === 'reviews' && <MerchantReviews />}
                      {dashboardPath === 'profile' && <MerchantProfile />}
                      {dashboardPath === 'wallet' && <MerchantWallet onNavigate={handleDashboardNavigate} />}
                      {dashboardPath === 'shipments' && <ShipmentsPage onNavigate={handleDashboardNavigate} />}
                      {dashboardPath === 'shipment-details' && <ShipmentDetailsPage shipmentId={viewId} onBack={() => handleDashboardNavigate('shipments')} role="merchant" />}
                      {dashboardPath === 'settings' && <MerchantSettings />}
                      {dashboardPath === 'support' && <MerchantSupportPage onNavigate={handleDashboardNavigate} />}
                      {dashboardPath === 'notifications' && <MerchantNotifications onNavigate={handleDashboardNavigate} />}
                      {dashboardPath === 'chats' && <ChatLayout viewId={viewId} onNavigateToCheckout={() => { }} />}
                      {dashboardPath === 'shipping-cart' && <MerchantShippingCartPage />}
                      {dashboardPath === 'billing' && <BillingPage />}
                      {dashboardPath === 'resolution' && <MerchantResolutionPage onNavigate={handleDashboardNavigate} />}
                      {dashboardPath === 'dispute-details' && <MerchantDisputeDetails caseId={viewId} onBack={() => handleDashboardNavigate('resolution')} />}
                      {dashboardPath === 'violations' && <ViolationsPage role="merchant" />}
                      {dashboardPath === 'performance' && <MerchantPerformance />}
                      {dashboardPath === 'info-center' && <InfoCenter />}
                    </DashboardLayout>
                  </MerchantStatusGuard>
                )}

                {/* C. Admin Routes */}
                {userRole === 'admin' && (
                  <DashboardLayout
                    role="admin"
                    onLogout={handleSecureLogout}
                    currentPath={dashboardPath}
                    onNavigate={handleDashboardNavigate}
                    onBack={handleDashboardBack}
                  >
                    {dashboardPath === 'home' && <AdminHome />}
                    {dashboardPath === 'users' && <AdminHome subPath="users" />}
                    {dashboardPath === 'store-profile' && <AdminHome subPath="store-profile" viewId={viewId} />}
                    {dashboardPath === 'customers' && <AdminHome subPath="customers" />}
                    {dashboardPath === 'customer-profile' && <AdminHome subPath="customer-profile" viewId={viewId} />}
                    {dashboardPath === 'reviews' && <AdminHome subPath="reviews" />}
                    {dashboardPath === 'orders-control' && <AdminHome subPath="orders-control" />}
                    {dashboardPath === 'admin-order-details' && <AdminHome subPath="admin-order-details" viewId={viewId} />}
                    {dashboardPath === 'billing' && <AdminHome subPath="billing" />}
                    {dashboardPath === 'financials' && <AdminHome subPath="financials" />}
                    {dashboardPath === 'invoice-details' && <AdminHome subPath="invoice-details" viewId={viewId} />}
                    {dashboardPath === 'shipping' && <AdminHome subPath="shipping" viewId={viewId} />}
                    {dashboardPath === 'shipping-carts' && <AdminHome subPath="shipping-carts" />}
                    {dashboardPath === 'audit-logs' && <AdminHome subPath="audit-logs" />}
                    {dashboardPath === 'settings' && <AdminHome subPath="settings" />}
                    {dashboardPath === 'support' && <AdminHome subPath="support" />}
                    {dashboardPath === 'resolution' && <AdminHome subPath="resolution" />}
                    {dashboardPath === 'admin-dispute-details' && <AdminHome subPath="admin-dispute-details" viewId={viewId} />}
                    {dashboardPath === 'security-audit' && <AdminHome subPath="security-audit" />}
                    {dashboardPath === 'violations' && <AdminHome subPath="violations" />}
                    {dashboardPath === 'chats' && <AdminChatOversight />}
                    {dashboardPath === 'chat-monitoring' && <AdminChatMonitoring />}
                    {dashboardPath === 'access-control' && <AdminHome subPath="access-control" />}
                    {dashboardPath === 'verification-tasks' && <AdminHome subPath="verification-tasks" onNavigate={handleDashboardNavigate} />}
                    {dashboardPath === 'verification-task-details' && (
                      <AdminHome subPath="verification-task-details" viewId={viewId} onNavigate={handleDashboardNavigate} />
                    )}
                    {dashboardPath === 'profile' && <ProfileView />}
                  </DashboardLayout>
                )}
              </motion.div>
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
              <EarnIncomeLanding
                onBack={() => handleNavigate('role-selection')}
                onStart={() => handleNavigate('role-selection')}
              />
            ) : currentView === 'wholesale' ? (
              <WholesaleScreen onBack={() => handleNavigate('role-selection')} />
            ) : currentView === 'business-license' ? (
              <BusinessLicensePage
                onBack={() => {
                  setCurrentView(previousView);
                  pushView(previousView);
                }}
                onVerifyRegistry={handleNavigateToLicenseVerify}
              />
            ) : currentView === 'business-license-verify' ? (
              <RegistryPdfViewer onBack={() => {
                setCurrentView('business-license');
                pushView('business-license');
              }} />
            ) : currentView === 'how-we-work' ? (
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
            ) : currentView === 'how-we-work-tutorial' ? (
              <HowWeWorkTutorial
                onComplete={() => handleNavigate('customer-login')}
                onBack={() => handleNavigate('how-we-work')}
                onOpenSupport={() => setIsSupportOpen(true)}
                onAdminClick={() => handleNavigate('admin-login')}
                onNavigateToLegal={handleNavigateToLegal}
                onNavigateToLandingSection={handleNavigateToLandingSection}
                onNavigateToLicense={handleNavigateToLicense}
              />
            ) : currentView === 'landing' ? (

              /* 2. LANDING VIEW */
              <motion.main
                key="landing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="relative will-change-opacity"
              >
                <Navbar
                  onLoginClick={() => handleNavigate('role-selection')}
                  onHomeClick={() => handleNavigate('role-selection')}
                />
                <Hero
                  onLogin={() => handleNavigate('login')}
                  onRequestNow={() => handleNavigate('role-selection')}
                />
                <TrustStats />
                <AboutCompany />
                <Guarantees />
                <HowItWorks />
                <MerchantCallout onRegister={() => handleNavigate('vendor-register')} />
                <LegalDocs />
                <Footer
                  onOpenSupport={() => setIsSupportOpen(true)}
                  onAdminClick={() => handleNavigate('admin-login')}
                  onNavigateToLicense={handleNavigateToLicense}
                />
              </motion.main>
            ) : (

              /* 3. AUTH VIEW */
              <motion.div
                key="auth"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="will-change-transform"
              >
                <AuthLayout
                  onBack={currentView === 'terms' ? handleBackFromTerms : (currentView === 'customer-register' || currentView === 'forgot-password' || currentView === 'reset-password' || currentView === 'account-recovery' ? handleBackToLogin : handleBackToHome)}
                  title={getTitle()}
                  wide={currentView === 'vendor-register' || currentView === 'terms'}
                >
                  <Suspense fallback={<AuthLoader />}>
                    {currentView === 'login' && (
                      <LoginPage
                        initialTab={loginInitialTab}
                        pendingRedirect={pendingRedirect}
                        roleMismatch={loginRoleMismatch}
                        onRegisterClick={() => handleNavigate('vendor-register')}
                        onCustomerRegisterClick={() => handleNavigate('customer-register')}
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
                  </Suspense>
                </AuthLayout>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
