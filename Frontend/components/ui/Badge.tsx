
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Truck } from 'lucide-react';

export type StatusType =
  | 'COLLECTING_OFFERS'
  | 'AWAITING_SELECTION'
  | 'AWAITING_OFFERS'
  | 'AWAITING_PAYMENT'
  | 'PREPARATION'
  | 'PREPARED'
  | 'VERIFICATION'
  | 'VERIFICATION_SUCCESS'
  | 'READY_FOR_SHIPPING'
  | 'NON_MATCHING'
  | 'CORRECTION_PERIOD'
  | 'CORRECTION_SUBMITTED'
  | 'DELAYED_PREPARATION'
  | 'PARTIALLY_SHIPPED'
  | 'SHIPPED'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PARTIALLY_PAID'
  | 'RETURNED'
  | 'DISPUTED'
  | 'REFUNDED'
  // Task Statuses
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'LINK_SENT'
  | 'IN_PROGRESS'
  | 'COMPLETED_MATCH'
  | 'COMPLETED_NON_MATCH'
  | 'AWAITING_ADMIN_APPROVAL'
  | 'AWAITING_CORRECTION'
  | 'ADMIN_APPROVED'
  | 'ADMIN_REJECTED'
  // Shipment Detailed Statuses
  | 'RECEIVED_AT_HUB'
  | 'QUALITY_CHECK_PASSED'
  | 'PACKAGED_FOR_SHIPPING'
  | 'AWAITING_CARRIER_PICKUP'
  | 'PICKED_UP_BY_CARRIER'
  | 'IN_TRANSIT_TO_DESTINATION'
  | 'ARRIVED_AT_LOCAL_FACILITY'
  | 'CUSTOMS_CLEARANCE'
  | 'AT_LOCAL_WAREHOUSE'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERY_ATTEMPTED'
  | 'DELIVERED_TO_CUSTOMER'
  | 'RETURN_TO_SENDER_INITIATED'
  | 'RETURNED_TO_SENDER'
  // Legacy/Extra compatibility
  | 'RETURN_REQUESTED'
  | 'RETURN_APPROVED'
  | 'WARRANTY_ACTIVE'
  | 'WARRANTY_EXPIRED'
  | 'RETURN_LABEL_ISSUED'
  | 'RETURN_STARTED'
  | 'RECEIVED_FROM_CUSTOMER'
  | 'DELIVERED_TO_VENDOR'
  | 'EXCHANGE_COMPLETED'
  | 'IN_TRANSIT_TO_CUSTOMER'
  | 'RETURN_COMPLETED_TO_CUSTOMER'
  | 'RESOLVED';

interface BadgeProps {
  status?: StatusType | string;
  className?: string;
  children?: React.ReactNode;
  variant?: 'gold' | 'cyan' | 'red' | 'green' | 'outline' | 'default';
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '', children, variant = 'default' }) => {
  const { t, language } = useLanguage();

  const isShipmentStatus = status && [
    'RECEIVED_AT_HUB', 'QUALITY_CHECK_PASSED', 'PACKAGED_FOR_SHIPPING',
    'AWAITING_CARRIER_PICKUP', 'PICKED_UP_BY_CARRIER', 'IN_TRANSIT_TO_DESTINATION',
    'ARRIVED_AT_LOCAL_FACILITY', 'CUSTOMS_CLEARANCE', 'AT_LOCAL_WAREHOUSE',
    'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'DELIVERED_TO_CUSTOMER',
    'RETURN_TO_SENDER_INITIATED', 'RETURNED_TO_SENDER',
    'RETURN_LABEL_ISSUED', 'RETURN_STARTED', 'RECEIVED_FROM_CUSTOMER',
    'DELIVERED_TO_VENDOR', 'EXCHANGE_COMPLETED', 'IN_TRANSIT_TO_CUSTOMER',
    'RETURN_COMPLETED_TO_CUSTOMER'
  ].includes(status);

  const styles: Record<string, string> = {
    COLLECTING_OFFERS: "bg-gold-500/10 text-gold-500 border-gold-500/30 animate-pulse shadow-[0_0_15px_rgba(212,175,55,0.2)]",
    AWAITING_SELECTION: "bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse",
    AWAITING_OFFERS: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    AWAITING_PAYMENT: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    PREPARATION: "bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse",
    DELAYED_PREPARATION: "bg-red-600/20 text-red-500 border-red-600/80 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.5)] font-bold",
    PREPARED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    VERIFICATION: "bg-amber-500/10 text-amber-500 border-amber-500/30", 
    VERIFICATION_SUCCESS: "bg-green-500/10 text-green-400 border-green-500/30", 
    READY_FOR_SHIPPING: "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse",
    NON_MATCHING: "bg-red-500/10 text-red-400 border-red-500/30", 
    CORRECTION_PERIOD: "bg-orange-500/10 text-orange-400 border-orange-500/30 animate-pulse", 
    CORRECTION_SUBMITTED: "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse",
    PARTIALLY_SHIPPED: "bg-blue-400/10 text-blue-300 border-blue-400/20 shadow-[0_0_10px_rgba(59,130,246,0.1)] animate-pulse",
    SHIPPED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    PARTIALLY_DELIVERED: "bg-teal-400/10 text-teal-300 border-teal-400/20 animate-pulse",
    DELIVERED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    COMPLETED: "bg-green-500/10 text-green-400 border-green-500/20",
    CANCELLED: "bg-red-500/10 text-red-400 border-red-500/20",
    PARTIALLY_PAID: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    RETURNED: "bg-red-500/10 text-red-400 border-red-500/20",
    DISPUTED: "bg-red-600/20 text-red-500 border-red-600/50 animate-pulse font-bold",
    REFUNDED: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",

    // Task Statuses
    PENDING_ASSIGNMENT: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    ASSIGNED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    LINK_SENT: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse",
    IN_PROGRESS: "bg-gold-500/10 text-gold-500 border-gold-500/30 animate-pulse shadow-[0_0_15px_rgba(212,175,55,0.2)]",
    COMPLETED_MATCH: "bg-green-500/10 text-green-400 border-green-500/30 font-bold",
    COMPLETED_NON_MATCH: "bg-red-500/10 text-red-400 border-red-500/30 font-bold",
    AWAITING_ADMIN_APPROVAL: "bg-amber-500/10 text-amber-500 border-amber-500/30 animate-pulse",
    AWAITING_CORRECTION: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    ADMIN_APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]",
    ADMIN_REJECTED: "bg-red-600/20 text-red-500 border-red-600/50 font-bold shadow-[0_0_10px_rgba(220,38,38,0.2)]",

    // Shipment Detailed Styles
    RECEIVED_AT_HUB: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    QUALITY_CHECK_PASSED: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    PACKAGED_FOR_SHIPPING: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    AWAITING_CARRIER_PICKUP: "bg-purple-500/10 text-purple-400 border-purple-500/20 animate-pulse",
    PICKED_UP_BY_CARRIER: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    IN_TRANSIT_TO_DESTINATION: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse",
    ARRIVED_AT_LOCAL_FACILITY: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    CUSTOMS_CLEARANCE: "bg-amber-500/10 text-amber-500 border-amber-500/20 animate-bounce",
    AT_LOCAL_WAREHOUSE: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    OUT_FOR_DELIVERY: "bg-teal-500/15 text-teal-400 border-teal-500/40 animate-pulse font-bold",
    DELIVERY_ATTEMPTED: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    DELIVERED_TO_CUSTOMER: "bg-green-500/10 text-green-400 border-green-500/20 font-bold",
    RETURN_TO_SENDER_INITIATED: "bg-red-500/10 text-red-400 border-red-500/20",
    RETURNED_TO_SENDER: "bg-red-600/20 text-red-500 border-red-600/50",

    // 2026 Return Journey Styles
    RETURN_LABEL_ISSUED: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]",
    RETURN_STARTED: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 animate-pulse",
    RECEIVED_FROM_CUSTOMER: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    DELIVERED_TO_VENDOR: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    EXCHANGE_COMPLETED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] font-black",
    IN_TRANSIT_TO_CUSTOMER: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 animate-pulse",
    RETURN_COMPLETED_TO_CUSTOMER: "bg-green-500/20 text-green-400 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)] font-black",

    // Fallbacks & Extra
    RETURN_REQUESTED: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    RETURN_APPROVED: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    WARRANTY_ACTIVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)] font-black",
    WARRANTY_EXPIRED: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    RESOLVED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  const variantStyles: Record<string, string> = {
    gold: "bg-gold-500/10 text-gold-500 border-gold-500/30 shadow-[0_0_15px_rgba(234,179,8,0.15)]",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    green: "bg-green-500/10 text-green-500 border-green-500/20",
    outline: "bg-transparent border-white/10 text-white/60",
    default: status ? styles[status] || styles.CANCELLED : "bg-white/5 border-white/10 text-white/40"
  };

  const taskTranslations: Record<string, string> = {
    PENDING_ASSIGNMENT: language === 'ar' ? 'بانتظار التعيين' : 'Pending Assignment',
    ASSIGNED: language === 'ar' ? 'تم التعيين' : 'Assigned',
    LINK_SENT: language === 'ar' ? 'رابط نشط' : 'Link Sent',
    IN_PROGRESS: language === 'ar' ? 'قيد الفحص' : 'In Progress',
    COMPLETED_MATCH: language === 'ar' ? 'مطابق' : 'Matched',
    COMPLETED_NON_MATCH: language === 'ar' ? 'غير مطابق' : 'Non-Matching',
    AWAITING_ADMIN_APPROVAL: language === 'ar' ? 'بانتظار اعتماد الإدارة' : 'Awaiting Approval',
    AWAITING_CORRECTION: language === 'ar' ? 'بانتظار التصحيح' : 'Awaiting correction',
    ADMIN_APPROVED: language === 'ar' ? 'تم الاعتماد' : 'Approved',
    ADMIN_REJECTED: language === 'ar' ? 'مرفوض' : 'Rejected',
  };

  const statusLabel = status ? (taskTranslations[status] || (t.common as any).status?.[status] || status) : null;

  return (
    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-sm whitespace-nowrap ${isShipmentStatus ? 'border-dashed' : ''} ${variant !== 'default' ? variantStyles[variant] : variantStyles.default} ${className}`}>
      {isShipmentStatus && <Truck size={12} className={language === 'ar' ? 'ml-1.5' : 'mr-1.5'} />}
      {children || statusLabel}
    </span>
  );
};
