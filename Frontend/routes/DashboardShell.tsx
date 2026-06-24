import React, { useEffect, lazy, Suspense } from 'react';
import '../dashboard.css';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { DashboardHome } from '../components/dashboard/DashboardHome';
import { MerchantHome } from '../components/dashboard/merchant/MerchantHome';
import { MerchantMarketplace } from '../components/dashboard/merchant/MerchantMarketplace';
import { MarketplaceOfferDetails } from '../components/dashboard/merchant/MarketplaceOfferDetails';
import { MerchantOffers } from '../components/dashboard/merchant/MerchantOffers';
import { MerchantOrders } from '../components/dashboard/merchant/MerchantOrders';
import { MerchantWallet } from '../components/dashboard/merchant/MerchantWallet';
import { MerchantProfile } from '../components/dashboard/merchant/MerchantProfile';
import { MerchantSettings } from '../components/dashboard/merchant/MerchantSettings';
import { MerchantNotifications } from '../components/dashboard/merchant/MerchantNotifications';
import { MerchantStatusGuard } from '../components/dashboard/merchant/MerchantStatusGuard';
import { MerchantDisputeDetails } from '../components/dashboard/merchant/MerchantDisputeDetails';
import { MerchantShippingCartPage } from '../components/dashboard/merchant/MerchantShippingCartPage';
import { MerchantSupportPage } from '../components/dashboard/merchant/support/MerchantSupportPage';
import { MerchantResolutionPage } from '../components/dashboard/merchant/MerchantResolutionPage';
import { MerchantReviews } from '../components/dashboard/merchant/MerchantReviews';
import { MerchantPerformance } from '../components/dashboard/merchant/MerchantPerformance';
import { AdminHome } from '../components/dashboard/admin/AdminHome';
const AdminChatOversight = lazy(() =>
  import('../components/dashboard/admin/chat/AdminChatOversight').then((m) => ({
    default: m.AdminChatOversight,
  })),
);
const AdminChatMonitoring = lazy(() =>
  import('../components/dashboard/admin/chat/AdminChatMonitoring').then((m) => ({
    default: m.AdminChatMonitoring,
  })),
);
import { MyOrders } from '../components/dashboard/MyOrders';
import { OrderDetails } from '../components/dashboard/OrderDetails';
import { CreateOrderWizard } from '../components/dashboard/create-order/CreateOrderWizard';
import { ChatLayout } from '../components/dashboard/chat/ChatLayout';
import { CheckoutWizard } from '../components/dashboard/checkout/CheckoutWizard';
import { ProfileView } from '../components/dashboard/profile/ProfileView';
import { CustomerResolutionCenter } from '../components/dashboard/customer/CustomerResolutionCenter';
import { CustomerDisputeDetails } from '../components/dashboard/customer/CustomerDisputeDetails';
import { WalletView } from '../components/dashboard/wallet/WalletView';
import { ShipmentsPage } from '../components/dashboard/shipments/ShipmentsPage';
import { ViolationsPage } from '../components/dashboard/ViolationsPage';
import { ShippingCartPage } from '../components/dashboard/shipping-cart/ShippingCartPage';
import { BillingPage } from '../components/dashboard/wallet/BillingPage';
import { SupportPage } from '../components/dashboard/support/SupportPage';
import { PreferencesPage } from '../components/dashboard/preferences/PreferencesPage';
import { LoyaltyPage } from '../components/dashboard/loyalty/LoyaltyPage';
import { RewardsPage } from '../components/dashboard/rewards/RewardsPage';
import { ShipmentDetailsPage } from '../components/dashboard/shipments/ShipmentDetailsPage';
import { InfoCenter } from '../components/dashboard/info/InfoCenter';
import { useSystemAutomation } from '../stores/useSystemAutomation';

function DashboardAutomationRunner({ maintenanceMode }: { maintenanceMode: boolean }) {
  const { startAutomation, stopAutomation } = useSystemAutomation();
  useEffect(() => {
    if (maintenanceMode) {
      stopAutomation();
      return;
    }
    startAutomation();
    return () => stopAutomation();
  }, [maintenanceMode, startAutomation, stopAutomation]);
  return null;
}

export type DashboardUserRole = 'customer' | 'merchant' | 'admin';

export interface DashboardShellProps {
  userRole: DashboardUserRole | null;
  language: string;
  dashboardPath: string;
  viewId: any;
  onLogout: () => void;
  onNavigate: (path: string, id?: any) => void;
  onBack: () => void;
  maintenanceMode?: boolean;
}

const DashboardShell: React.FC<DashboardShellProps> = ({
  userRole,
  language,
  dashboardPath,
  viewId,
  onLogout,
  onNavigate,
  onBack,
  maintenanceMode = false,
}) => {
  if (!userRole) {
    return (
      <div className="fixed inset-0 bg-[#0F0E0C] flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-gold-500/20 border-t-gold-500 rounded-full animate-spin mb-4" />
        <p className="text-gold-400/60 font-medium animate-pulse">
          {language === 'ar' ? 'جاري استعادة الجلسة...' : 'Restoring session...'}
        </p>
      </div>
    );
  }

  if (userRole === 'customer') {
    return (
      <>
        <DashboardAutomationRunner maintenanceMode={maintenanceMode} />
        <DashboardLayout
        role="customer"
        onLogout={onLogout}
        currentPath={dashboardPath}
        onNavigate={onNavigate}
        onBack={onBack}
      >
        {dashboardPath === 'home' && <DashboardHome onNavigate={onNavigate} />}
        {dashboardPath === 'orders' && <MyOrders onNavigate={onNavigate} />}
        {dashboardPath === 'order-details' && (
          <OrderDetails
            orderId={viewId}
            onBack={() => onNavigate('orders')}
            onNavigate={onNavigate}
          />
        )}
        {dashboardPath === 'create-order' && (
          <CreateOrderWizard
            onComplete={() => onNavigate('orders')}
          />
        )}
        {dashboardPath === 'checkout' && (
          <CheckoutWizard onComplete={() => onNavigate('orders')} onNavigate={onNavigate} />
        )}
        {dashboardPath === 'chats' && (
          <ChatLayout
            viewId={viewId}
            onNavigateToCheckout={() => onNavigate('checkout')}
          />
        )}
        {dashboardPath === 'profile' && <ProfileView />}
        {dashboardPath === 'wallet' && <WalletView onNavigate={onNavigate} />}
        {dashboardPath === 'billing' && <BillingPage />}
        {dashboardPath === 'shipments' && <ShipmentsPage onNavigate={onNavigate} />}
        {dashboardPath === 'shipment-details' && (
          <ShipmentDetailsPage
            shipmentId={viewId}
            onBack={() => onNavigate('shipments')}
            role="customer"
          />
        )}
        {dashboardPath === 'shipping-cart' && <ShippingCartPage />}
        {dashboardPath === 'resolution' && <CustomerResolutionCenter onNavigate={onNavigate} />}
        {dashboardPath === 'dispute-details' && (
          <CustomerDisputeDetails
            caseId={viewId}
            onBack={() => onNavigate('resolution')}
            onNavigate={onNavigate}
          />
        )}
        {dashboardPath === 'support' && <SupportPage onNavigate={onNavigate} />}
        {dashboardPath === 'preferences' && <PreferencesPage onNavigate={onNavigate} />}
        {dashboardPath === 'loyalty' && <LoyaltyPage />}
        {dashboardPath === 'rewards' && <RewardsPage />}
        {dashboardPath === 'violations' && <ViolationsPage role="customer" />}
        {dashboardPath === 'info-center' && <InfoCenter />}
      </DashboardLayout>
      </>
    );
  }

  if (userRole === 'merchant') {
    return (
      <>
        <DashboardAutomationRunner maintenanceMode={maintenanceMode} />
        <MerchantStatusGuard>
        <DashboardLayout
          role="merchant"
          onLogout={onLogout}
          currentPath={dashboardPath}
          onNavigate={onNavigate}
          onBack={onBack}
        >
          {dashboardPath === 'home' && <MerchantHome onNavigate={onNavigate} />}
          {dashboardPath === 'marketplace' && <MerchantMarketplace onNavigate={onNavigate} />}
          {(dashboardPath === 'explore-offer' || (dashboardPath === 'orders' && viewId)) && (
            <MarketplaceOfferDetails orderId={viewId} onBack={onBack} />
          )}
          {(dashboardPath === 'active-orders' || (dashboardPath === 'orders' && !viewId)) && (
            <MerchantOrders onNavigate={onNavigate} />
          )}
          {dashboardPath === 'my-offers' && <MerchantOffers onNavigate={onNavigate} />}
          {dashboardPath === 'reviews' && <MerchantReviews />}
          {dashboardPath === 'profile' && <MerchantProfile />}
          {dashboardPath === 'wallet' && <MerchantWallet onNavigate={onNavigate} />}
          {dashboardPath === 'shipments' && <ShipmentsPage onNavigate={onNavigate} />}
          {dashboardPath === 'shipment-details' && (
            <ShipmentDetailsPage
              shipmentId={viewId}
              onBack={() => onNavigate('shipments')}
              role="merchant"
            />
          )}
          {dashboardPath === 'settings' && <MerchantSettings />}
          {dashboardPath === 'support' && <MerchantSupportPage onNavigate={onNavigate} />}
          {dashboardPath === 'notifications' && <MerchantNotifications onNavigate={onNavigate} />}
          {dashboardPath === 'chats' && (
            <ChatLayout viewId={viewId} onNavigateToCheckout={() => {}} />
          )}
          {dashboardPath === 'shipping-cart' && <MerchantShippingCartPage />}
          {dashboardPath === 'billing' && <BillingPage />}
          {dashboardPath === 'resolution' && <MerchantResolutionPage onNavigate={onNavigate} />}
          {dashboardPath === 'dispute-details' && (
            <MerchantDisputeDetails
              caseId={viewId}
              onBack={() => onNavigate('resolution')}
            />
          )}
          {dashboardPath === 'violations' && <ViolationsPage role="merchant" />}
          {dashboardPath === 'performance' && <MerchantPerformance />}
          {dashboardPath === 'info-center' && <InfoCenter />}
        </DashboardLayout>
      </MerchantStatusGuard>
      </>
    );
  }

  return (
    <>
      <DashboardAutomationRunner maintenanceMode={maintenanceMode} />
      <DashboardLayout
      role="admin"
      onLogout={onLogout}
      currentPath={dashboardPath}
      onNavigate={onNavigate}
      onBack={onBack}
    >
      {dashboardPath === 'home' && <AdminHome />}
      {dashboardPath === 'users' && <AdminHome subPath="users" />}
      {dashboardPath === 'store-profile' && <AdminHome subPath="store-profile" viewId={viewId} />}
      {dashboardPath === 'customers' && <AdminHome subPath="customers" />}
      {dashboardPath === 'customer-profile' && (
        <AdminHome subPath="customer-profile" viewId={viewId} />
      )}
      {dashboardPath === 'reviews' && <AdminHome subPath="reviews" />}
      {dashboardPath === 'orders-control' && <AdminHome subPath="orders-control" />}
      {dashboardPath === 'admin-order-details' && (
        <AdminHome subPath="admin-order-details" viewId={viewId} />
      )}
      {dashboardPath === 'billing' && <AdminHome subPath="billing" />}
      {dashboardPath === 'financials' && <AdminHome subPath="financials" />}
      {dashboardPath === 'invoice-details' && (
        <AdminHome subPath="invoice-details" viewId={viewId} />
      )}
      {dashboardPath === 'shipping' && <AdminHome subPath="shipping" viewId={viewId} />}
      {dashboardPath === 'shipping-carts' && <AdminHome subPath="shipping-carts" />}
      {dashboardPath === 'audit-logs' && <AdminHome subPath="audit-logs" />}
      {dashboardPath === 'settings' && <AdminHome subPath="settings" />}
      {dashboardPath === 'support' && <AdminHome subPath="support" viewId={viewId} />}
      {dashboardPath === 'resolution' && <AdminHome subPath="resolution" />}
      {dashboardPath === 'admin-dispute-details' && (
        <AdminHome subPath="admin-dispute-details" viewId={viewId} />
      )}
      {dashboardPath === 'security-audit' && <AdminHome subPath="security-audit" />}
      {dashboardPath === 'violations' && <AdminHome subPath="violations" />}
      {dashboardPath === 'chats' && (
        <Suspense fallback={null}>
          <AdminChatOversight />
        </Suspense>
      )}
      {dashboardPath === 'chat-monitoring' && (
        <Suspense fallback={null}>
          <AdminChatMonitoring />
        </Suspense>
      )}
      {dashboardPath === 'access-control' && <AdminHome subPath="access-control" />}
      {dashboardPath === 'verification-tasks' && (
        <AdminHome subPath="verification-tasks" onNavigate={onNavigate} />
      )}
      {dashboardPath === 'verification-task-details' && (
        <AdminHome
          subPath="verification-task-details"
          viewId={viewId}
          onNavigate={onNavigate}
        />
      )}
      {dashboardPath === 'profile' && <ProfileView />}
    </DashboardLayout>
    </>
  );
};

export default DashboardShell;
