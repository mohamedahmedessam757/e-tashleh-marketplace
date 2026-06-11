import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const excelApi = {
    /**
     * Download Invoice Excel for a specific order
     */
    async downloadInvoice(orderId: string, orderNumber: string) {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`${API_URL}/orders/${orderId}/export-excel`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Invoice_${orderNumber}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    /**
     * Download Waybills Excel for a specific order
     */
    async downloadWaybills(orderId: string, shipmentId?: string) {
        const token = localStorage.getItem('access_token');
        const urlParams = shipmentId ? `?shipmentId=${shipmentId}` : '';
        const response = await axios.get(`${API_URL}/orders/${orderId}/waybills/export-excel${urlParams}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
        });

        const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = blobUrl;
        link.setAttribute('download', `Waybills_${orderId}${shipmentId ? `_batch_${shipmentId.substring(0, 8)}` : ''}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
};
