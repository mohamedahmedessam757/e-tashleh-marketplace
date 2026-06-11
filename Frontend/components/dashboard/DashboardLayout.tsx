
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Package, PlusCircle, MessageSquare, User, Bell, LogOut, Menu, Scale, Info, ChevronDown, Search, Wallet, Grid, Users, ShieldAlert, BarChart3, Settings, ShoppingBag, ListChecks, Truck, FileText, BadgeDollarSign, Store, Star, Award, Database, Headset, ShieldCheck, Lock, CreditCard, RotateCcw, ArrowRight, ArrowLeft, Receipt, PackageSearch } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useVendorStore } from '../../stores/useVendorStore';
import { useAdminStore } from '../../stores/useAdminStore';
import { useOrderStore } from '../../stores/useOrderStore';
import { useBillingStore } from '../../stores/useBillingStore';
import { useMerchantWalletStore } from '../../stores/useMerchantWalletStore';
import { useResolutionStore } from '../../stores/useResolutionStore';
import { useCustomerWalletStore, subscribeToWalletUpdates } from '../../stores/useCustomerWalletStore';
import { useAdminPermissionsStore } from '../../stores/useAdminPermissionsStore';
import { NotificationDrawer } from './notifications/NotificationDrawer';
import { NavigationDrawer } from './NavigationDrawer';
import { VerdictPopUp } from './resolution/VerdictPopUp';
import { RestrictionAlertBanner } from './shared/RestrictionAlertBanner';
import { getCurrentUserId } from '../../utils/auth';
import { clearAuthStorage } from '../../utils/clearAuthStorage';

interface DashboardLayoutProps {
  children?: React.ReactNode;
  onLogout: () => void;
  currentPath?: string;
  onNavigate: (path: string, id?: number) => void;
  onBack?: () => void;
  role: 'customer' | 'merchant' | 'admin';
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  onLogout,
  currentPath = 'home',
  onNavigate,
  onBack,
  role
}) => {
  const { t, language } = useLanguage();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { unreadCount, fetchNotifications, subscribeToNotifications, unsubscribeFromNotifications } = useNotificationStore(); // Added fetchNotifications
  const { 
    checkLicenseStatus, 
    vendorStatus, 
    fetchVendorProfile, 
    profile: vendorProfile,
    withdrawalsFrozen: vWithdrawalsFrozen,
    visibilityRestricted: vVisibilityRestricted,
    offerLimit: vOfferLimit 
  } = useVendorStore();
  const { currentAdmin, systemStatus, publicSystemStatus } = useAdminStore();
  const { startRealtime, stopRealtime } = useOrderStore();
  const { fetchInvoices, fetchCards } = useBillingStore();
  const { fetchWallet } = useMerchantWalletStore();
  const { user, fetchProfile, subscribeToProfile } = useProfileStore();
  const { subscribeToCases, unsubscribeFromCases } = useResolutionStore();
  const { canView, myPermissions } = useAdminPermissionsStore();
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const walletSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const permissionsUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let profileUnsub: (() => void) | undefined;
    const userId = getCurrentUserId();
    if (userId && role) {
      // 1. Core Profile & Notification Init
      fetchProfile();
      profileUnsub = subscribeToProfile();
      
      if (role === 'merchant') {
        useVendorStore.getState().subscribeToVendorProfile();
      }
      
      // SAFETY: SILENCE ALL BACKGROUND FETCHES IF MAINTENANCE IS ACTIVE
      const isMaintenance = useAdminStore.getState().publicSystemStatus?.maintenanceMode;
      if (isMaintenance && role !== 'admin') {
         console.log("🛡️ Dashboard Silencer: Maintenance active, skipping resource pre-fetch.");
         return;
      }

      fetchNotifications(userId, role);
      subscribeToNotifications(userId, role);

      // 3. Real-time Resolution & Wallet Sync (Phase 4)
      subscribeToCases(role);
      if (role === 'customer') {
        walletSubRef.current = subscribeToWalletUpdates();
      }

      // 4. Admin Permissions Real-time Sync (2026 RBAC)
      if (role === 'admin' || currentAdmin?.role === 'SUPER_ADMIN' || currentAdmin?.role === 'SUPPORT') {
          useAdminPermissionsStore.getState().fetchMyPermissions();
          permissionsUnsubRef.current = useAdminPermissionsStore.getState().subscribeToPermissions(userId);
      }

      // 2. Global Pre-fetching (Zero-Loading Architecture)
      // We pull background data based on role so navigating to /wallet or /billing is 0ms
      Promise.all([
        role === 'customer' ? fetchInvoices() : Promise.resolve(),
        role === 'customer' ? fetchCards() : Promise.resolve(),
        role === 'merchant' ? fetchWallet() : Promise.resolve(),
        role === 'merchant' ? fetchVendorProfile() : Promise.resolve(), // NEW: Global status fetch
      ]).catch(err => console.warn('Background global pre-fetch warning:', err));
    }
    return () => {
      unsubscribeFromNotifications();
      unsubscribeFromCases();
      if (profileUnsub) profileUnsub();
      if (permissionsUnsubRef.current) {
        permissionsUnsubRef.current();
        permissionsUnsubRef.current = null;
      }
      stopRealtime();
      if (role === 'merchant') {
        useVendorStore.getState().unsubscribeFromVendorProfile();
      }
      if (walletSubRef.current) {
        walletSubRef.current.unsubscribe();
        walletSubRef.current = null;
      }
    };
  }, [role, publicSystemStatus?.maintenanceMode]);

  const isAr = language === 'ar';

  // SECURITY: AUTO-LOGOUT LOGIC
  const handleSystemLogout = () => {
    clearAuthStorage();
    
    // 2. Reset Global Stores
    useVendorStore.getState().reset();
    useOrderStore.getState().clearOrders();
    useProfileStore.getState().clearProfile();
    useNotificationStore.getState().clearNotifications?.(); // Optional chaining if not implemented
    
    // 3. Proceed with standard logout
    onLogout();
  };

  useEffect(() => {
    const resetTimer = () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => {
        console.log("Auto-logout triggered due to inactivity.");
        handleSystemLogout(); // Log user out after 15 minutes of inactivity
      }, 15 * 60 * 1000);
    };

    // Events to track activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));

    // Initial start
    resetTimer();

    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [onLogout]);

  // SYSTEM WATCHER (Merchant Specific)
  useEffect(() => {
    if (role === 'merchant') {
      // Check license on mount and periodically
      checkLicenseStatus();

      // Interval check (every minute)
      const interval = setInterval(() => {
        checkLicenseStatus();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [role]);

  // CUSTOMER & MERCHANT & ADMIN DATA WATCHER
  useEffect(() => {
    // Reset the store if role changed to prevent data leakage between roles
    const orderStore = useOrderStore.getState();
    orderStore.resetForRole(role);

    // Start Realtime WebSockets for zero-latency sync (replaces legacy polling)
    startRealtime(getCurrentUserId() || undefined, role);

    return () => {
      stopRealtime();
    };
  }, [role, startRealtime, stopRealtime]);

  // Define Menu Items per Role
  const customerNavItems = [
    { id: 'home', icon: Home, label: t.dashboard.menu.home },
    { id: 'shipments', icon: Truck, label: t.dashboard.menu.shipments },
    { id: 'orders', icon: Package, label: t.dashboard.menu.orders },
    { id: 'shipping-cart', icon: ShoppingBag, label: t.dashboard.menu.shippingCart },
    { id: 'create-order', icon: PlusCircle, label: t.dashboard.menu.create, isAction: true },
    { id: 'resolution', icon: RotateCcw, label: t.dashboard.menu.resolution },
    { id: 'profile', icon: User, label: t.dashboard.menu.profile },
    { id: 'violations', icon: ShieldAlert, label: t.dashboard.menu.violations },
    { id: 'billing', icon: CreditCard, label: t.dashboard.menu.billing },
    { id: 'wallet', icon: Wallet, label: language === 'ar' ? 'المحفظة' : 'Wallet' },
    { id: 'rewards', icon: Award, label: language === 'ar' ? 'مركز الإحالات' : 'Referral Center' },
    { id: 'chats', icon: MessageSquare, label: t.dashboard.menu.chats },
    { id: 'support', icon: Headset, label: t.dashboard.menu.support },
    { id: 'preferences', icon: Settings, label: t.dashboard.profile.tabs.settings },
    { id: 'loyalty', icon: MessageSquare, label: language === 'ar' ? 'التقييمات' : 'Reviews' },
  ];



  // Updated Merchant Items
  const merchantNavItems = [
    { id: 'home', icon: Grid, label: t.dashboard.merchant.menu.home },

    { id: 'marketplace', icon: ShoppingBag, label: t.dashboard.merchant.menu.marketplace, isAction: true },
    { id: 'shipments', icon: Truck, label: t.dashboard.merchant.menu.shipments },
    { id: 'active-orders', icon: Package, label: t.dashboard.merchant.menu.activeOrders },
    { id: 'my-offers', icon: ListChecks, label: t.dashboard.merchant.menu.myOffers },
    { id: 'reviews', icon: Star, label: language === 'ar' ? 'التقييمات' : 'Reviews' },
    { id: 'resolution', icon: RotateCcw, label: t.dashboard.menu.resolution },
    { id: 'shipping-cart', icon: ShoppingBag, label: t.dashboard.menu.shippingCart },
    { id: 'billing', icon: Receipt, label: t.dashboard.menu.billing },
    { id: 'wallet', icon: Wallet, label: t.dashboard.merchant.menu.wallet },
    { id: 'violations', icon: ShieldAlert, label: t.dashboard.merchant.menu.violations },
    { id: 'chats', icon: MessageSquare, label: t.dashboard.merchant.menu.chats },
    { id: 'support', icon: Headset, label: t.dashboard.merchant.support.title },
    { id: 'notifications', icon: Bell, label: t.dashboard.merchant.menu.prefsAndNotifications },
    { id: 'performance', icon: Award, label: t.dashboard.merchant.menu.performance },
    { id: 'profile', icon: Store, label: t.dashboard.merchant.menu.profile },
    { id: 'settings', icon: Settings, label: t.dashboard.merchant.menu.settings },
  ];

  // ADMIN MENU BUILDER
  const adminRole = currentAdmin?.role || 'ADMIN';

  const adminNavItems = [
    { id: 'home', icon: BarChart3, label: t.admin.dashboard, allowed: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },

    // Management
    { id: 'users', icon: Store, label: t.admin.users, allowed: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] }, // Stores
    { id: 'customers', icon: Users, label: t.admin.customers, allowed: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
    { id: 'violations', icon: ShieldAlert, label: t.admin.violations, allowed: ['SUPER_ADMIN', 'ADMIN'] },

    // Logistics & Operations
    { id: 'orders-control', icon: PackageSearch, label: t.admin.orders, allowed: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
    { id: 'shipping-carts', icon: ShoppingBag, label: (t.admin as any).shippingCarts || (language === 'ar' ? 'سلال التجميع' : 'Assembly Carts'), allowed: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
    { id: 'verification-tasks', icon: ShieldCheck, label: (t.admin as any).verificationTasks || (language === 'ar' ? 'مهام المطابقة الميدانية' : 'Verification Tasks'), allowed: ['SUPER_ADMIN', 'ADMIN', 'VERIFICATION_OFFICER'] },
    { id: 'shipping', icon: Truck, label: t.admin.shipping, allowed: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
    { id: 'reviews', icon: Star, label: t.admin.reviews, allowed: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'resolution', icon: Scale, label: t.admin.disputes, allowed: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] }, // Support View Only

    // Billing & Audit
    { id: 'billing', icon: BadgeDollarSign, label: t.admin.billing.title, allowed: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'audit-logs', icon: Database, label: t.admin.auditLogs, allowed: ['SUPER_ADMIN', 'ADMIN'] },
    { id: 'security-audit', icon: ShieldCheck, label: t.admin.security.title, allowed: ['SUPER_ADMIN'] },

    // New: Support
    { id: 'support', icon: Headset, label: t.admin.support.title, allowed: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
    { id: 'chats', icon: MessageSquare, label: language === 'ar' ? 'المحادثات' : 'Messages', allowed: ['SUPER_ADMIN', 'ADMIN', 'SUPPORT'] },
    { id: 'chat-monitoring', icon: ShieldAlert, label: language === 'ar' ? 'مراقبة المحادثات' : 'Chat Monitoring', allowed: ['SUPER_ADMIN', 'ADMIN'] },

    // Settings: Super Admin Only
    { id: 'settings', icon: Settings, label: t.admin.settings, allowed: ['SUPER_ADMIN'] },
    { id: 'access-control', icon: ShieldCheck, label: language === 'ar' ? 'إدارة الوصول' : 'Access Control', allowed: ['SUPER_ADMIN'] },
  ];

  const getNavItems = () => {
    switch (role) {
      case 'merchant': return merchantNavItems;
      case 'admin': 
          // 2026 RBAC: Filter items based on granular permissions if not Super Admin
          return adminNavItems.filter(item => {
            if (adminRole === 'SUPER_ADMIN') return true;
            
            // New granular check: Strictly follow permissions if available
            // If the permission record doesn't exist, we fallback to role check for backward compatibility
            // but for 2026 we prefer explicit permission guards.
            const isPermissionAllowed = canView(item.id);
            
            // If the store has permissions, we use THEM as the source of truth.
            // If the store is empty (user just logged in or no record), we use role.
            if (myPermissions) {
              return isPermissionAllowed;
            }
            
            return item.allowed ? item.allowed.includes(adminRole) : true;
          });
      default: return customerNavItems;
    }
  };

  const navItems = getNavItems();

  const getRoleBadge = () => {
    // 2026 Governance: Check both account-level and entity-level (vendor) restrictions
    const hasAccountRestrictions = user?.withdrawalsFrozen || (user?.orderLimit !== undefined && user.orderLimit !== -1);
    
    // Fixed: Check root store properties for merchant, not the profile object
    const hasVendorRestrictions = role === 'merchant' && (vWithdrawalsFrozen || vVisibilityRestricted || (vOfferLimit !== -1));
    
    const hasAnyRestriction = hasAccountRestrictions || hasVendorRestrictions;

    switch (role) {
      case 'merchant':
        if (vendorStatus === 'LICENSE_EXPIRED') return <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/20 animate-pulse">EXPIRED</span>;
        if (hasAnyRestriction) return <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/20 animate-pulse">RESTRICTED</span>;
        return <span className="bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded text-[10px] font-bold border border-gold-500/20">MERCHANT</span>;
      case 'admin':
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border 
                ${adminRole === 'SUPER_ADMIN' ? 'bg-red-500/20 text-red-400 border-red-500/20' :
              adminRole === 'ADMIN' ? 'bg-blue-500/20 text-blue-400 border-blue-500/20' :
                'bg-green-500/20 text-green-400 border-green-500/20'}`} // Support Color
          >
            {adminRole}
          </span>
        );
      default: 
        if (hasAnyRestriction) return <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-[10px] font-bold border border-red-500/20 animate-pulse uppercase tracking-tighter">RESTRICTED</span>;
        return <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded text-[10px] font-bold">CUSTOMER</span>;
    }
  };



  return (
    <div className="min-h-screen bg-[#0F0E0C] text-white font-sans selection:bg-gold-500 selection:text-white flex flex-col">

      <NavigationDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={onNavigate}
        currentPath={currentPath}
        navItems={navItems}
        onLogout={handleSystemLogout}
        role={role}
        adminRole={adminRole}
      />

      <NotificationDrawer
        isOpen={isNotifOpen}
        onClose={() => setIsNotifOpen(false)}
        onNavigate={onNavigate}
        role={role}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen w-full transition-all duration-300">

        {/* Top Header */}
        <header className="sticky top-0 z-40 px-4 md:px-6 py-4 bg-[#0F0E0C]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between">

          {/* Hamburger Menu & Brand */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <Menu size={24} />
            </button>

            {currentPath !== 'home' && onBack && (
              <div className="flex items-center gap-1 md:gap-2">
                <button
                  onClick={onBack}
                  title={isAr ? 'الرجوع للصفحة السابقة' : 'Back'}
                  className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  {isAr ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
                </button>
                <button
                  onClick={() => onNavigate('home')}
                  title={isAr ? 'الرئيسية' : 'Home'}
                  className="p-2 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <Home size={20} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gold-500/10 rounded-xl flex items-center justify-center border border-gold-500/20 hidden md:flex">
                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain brightness-0 invert" />
              </div>
              <span className="font-bold text-xl tracking-wide hidden md:block">E-TASHLEH</span>
            </div>
          </div>

          {/* User Capsule Area */}
          <div className="flex justify-end items-center gap-4">

            <div className="flex items-center gap-1 bg-[#151310] border border-white/10 rounded-full p-1 pl-1 pr-1 shadow-lg">

              {/* Notification Button */}
              <button
                onClick={() => setIsNotifOpen(true)}
                className="relative p-2.5 rounded-full hover:bg-white/10 transition-colors text-white/60 hover:text-white group"
              >
                <Bell size={20} className={unreadCount > 0 ? "text-gold-400 group-hover:text-gold-300 transition-colors" : ""} />

                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[10px] font-bold text-white bg-red-500 border-2 border-[#151310] rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-in zoom-in duration-300">
                    {unreadCount > 99 ? '+99' : unreadCount}
                  </span>
                )}
              </button>

              <div className="w-px h-6 bg-white/10 mx-1"></div>

              {/* Profile Button */}
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-3 pl-1 pr-3 py-1 rounded-full hover:bg-white/5 transition-all group"
              >
                <div className="text-right hidden sm:block">
                  <div className="flex justify-end mb-0.5">
                    {getRoleBadge()}
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-gold-200 transition-colors">
                    {role === 'admin' ? currentAdmin?.name : (user?.name || 'User Account')}
                  </div>
                </div>

                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gold-600 to-gold-400 p-[1px]">
                    <div className="w-full h-full rounded-full bg-[#1A1814] flex items-center justify-center overflow-hidden">
                      {role === 'merchant' && vendorProfile?.logo ? (
                        <img src={vendorProfile.logo} alt="Store Logo" className="w-full h-full object-contain p-1.5" />
                      ) : user?.avatar ? (
                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} className="text-gold-400" />
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#151310] rounded-full"></div>
                </div>
              </button>
            </div>

          </div>
        </header>

        <RestrictionAlertBanner onNavigate={onNavigate} />

        {/* Page Content */}
        <div className="flex-1 p-4 md:p-8 mt-2 md:mt-4 pb-24 md:pb-8">
          {/* Global Maintenance Awareness (2026 UX) */}
          {role === 'admin' && (
            <AnimatePresence>
              {systemStatus.maintenanceMode && (
                <motion.div 
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginBottom: 24 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-red-500/10 border border-red-500/20 rounded-[2rem] p-5 flex items-center justify-between shadow-2xl shadow-red-500/5">
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-500 animate-pulse">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-red-400 uppercase tracking-tighter">
                          {isAr ? 'النظام في وضع الصيانة' : 'System Maintenance Mode'}
                        </h4>
                        <p className="text-[9px] text-white/40 font-bold uppercase tracking-tight mt-0.5">
                          {isAr ? 'وصول المستخدمين والتجار مقيد حالياً.' : 'User and Vendor access is currently restricted.'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-400/20">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                      <span className="text-[8px] font-black text-red-300 uppercase tracking-widest">{isAr ? 'نشط' : 'Active'}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          <motion.div
            key={currentPath}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>

      </main>
      <VerdictPopUp onNavigate={onNavigate} />
    </div>
  );
};

const StoreIcon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" /></svg>
);
