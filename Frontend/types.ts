
import React from 'react';

// UI Types
export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

export interface StatItem {
  id: number;
  label: string;
  value: string;
  trend: string;
  isPositive: boolean;
  icon: React.ElementType;
}

export interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  delay: number;
}

// Database Types (matching SUPABASE_SCHEMA.sql)

export type OrderStatus =
  | 'AWAITING_OFFERS'
  | 'AWAITING_PAYMENT'
  | 'PARTIALLY_PAID'
  | 'PREPARATION'
  | 'PREPARED'
  | 'DELAYED_PREPARATION'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'DISPUTED'
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'REFUNDED'
  | 'RESOLVED'
  | 'WARRANTY_ACTIVE'
  | 'WARRANTY_EXPIRED';

export interface OrderPart {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  images: string[];
}

export interface Order {
  id: string; // UUID
  orderNumber: string;
  customerId: string; // UUID
  storeId?: string; // UUID
  status: OrderStatus;
  adminNotes?: string;

  // Vehicle
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vin?: string;

  // Part
  partName: string;
  partDescription?: string;
  partImages?: string[]; // JSONB
  parts?: OrderPart[]; // Joined relation

  // Preferences
  conditionPref?: string;
  warrantyPreferred?: boolean;

  // Financial
  totalAmount?: number;
  acceptedOfferId?: string; // Accepted Offer UUID

  // Timestamps
  offersDeadlineAt?: string;
  paymentDeadlineAt?: string;
  offerAcceptedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  delayedPreparationDeadlineAt?: string;
  warranty_active_at?: string;
  warranty_end_at?: string;
  createdAt: string;
  updatedAt: string;

  // Joined fields (optional)
  offers?: Offer[];
  store?: Store;
}

export interface Offer {
  id: string; // UUID
  orderId: string;
  storeId: string;
  unitPrice: number;
  weightKg: number;
  shippingCost: number;
  hasWarranty: boolean;
  deliveryDays?: string;
  condition?: string;
  notes?: string;
  offerImage?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  
  // Partial Shipping from Assembly Cart (2026)
  shippedFromCart?: boolean;
  shippedFromCartAt?: string;
  cartShipmentId?: string;

  createdAt: string;

  // Computed/Joined
  finalPrice?: number; // unit_price + shipping_cost
  dealerName?: string; // from joined store
  dealerNumber?: string; // from joined store metadata if exists
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  slug?: string;
  description?: string;
  currentRating?: number;
}

export interface Return {
  id: string;
  orderId: string;
  customerId: string;
  reason: string;
  description: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'RESOLVED' | 'RETURN_STARTED';
  evidenceFiles: string[];
  usageCondition?: string;
  faultParty?: string;
  feeBearer?: string;
  shippingCompanyLiability?: number;
  refundAmount?: number;
  netRefundAmount?: number;
  gatewayFeeAmount?: number;
  refundFeeAmount?: number;
  shippingRoundtrip?: number;
  shippingRefund?: number;
  shippingPayee?: 'MERCHANT' | 'CUSTOMER' | 'SHIPPING_COMPANY';
  shippingPaymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'PENDING_SETTLEMENT' | 'INSUFFICIENT_FUNDS';
  shippingPaymentMethod?: 'STRIPE' | 'WALLET';
  verdictNotes?: string;
  verdictIssuedAt?: string;
  adminApproval?: 'APPROVED' | 'REJECTED';
  adminApprovalReason?: string;
  adminSignature?: string;
  adminName?: string;
  createdAt: string;
  updatedAt: string;

  // Joined
  order?: Order;
}

export interface Dispute {
  id: string;
  orderId: string;
  customerId: string;
  reason: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED' | 'ESCALATED' | 'RETURN_STARTED';
  evidenceFiles: string[];
  faultParty?: string;
  feeBearer?: string;
  shippingCompanyLiability?: number;
  refundAmount?: number;
  netRefundAmount?: number;
  gatewayFeeAmount?: number;
  refundFeeAmount?: number;
  shippingRoundtrip?: number;
  shippingRefund?: number;
  shippingPayee?: 'MERCHANT' | 'CUSTOMER' | 'SHIPPING_COMPANY';
  shippingPaymentStatus?: 'PENDING' | 'PAID' | 'FAILED' | 'PENDING_SETTLEMENT' | 'INSUFFICIENT_FUNDS';
  shippingPaymentMethod?: 'STRIPE' | 'WALLET';
  verdictNotes?: string;
  verdictIssuedAt?: string;
  adminApproval?: 'APPROVED' | 'REJECTED';
  adminApprovalReason?: string;
  adminSignature?: string;
  adminName?: string;
  createdAt: string;
  updatedAt: string;

  // Joined
  order?: Order;
}