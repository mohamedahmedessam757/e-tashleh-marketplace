export interface EligibleResolutionPart {
    offerId?: string;
    orderId: string;
    orderPartId: string;
    partName: string;
    merchantName: string;
    orderNumber?: string;
    returnWindowEndsAt?: string | null;
    isReturnEligible?: boolean;
}
