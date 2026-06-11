# 🛍️ Marketplace Frontend

This is the professional frontend application for the **Marketplace Admin & Vendor System**, designed for 2026 standards of performance, security, and real-time user experience.

## 🚀 Key Features

- **Omnichannel Dashboard**: Comprehensive views for Admins, Vendors, and Customers.
- **FSM Order Flow**: Robust order state management matching high-compliance standards.
- **Real-Time Synergy**: Live notifications and chat powered by Supabase/WebSockets.
- **Bi-Lingual Support**: Native support for Arabic (RTL) and English (LTR).
- **Secure Payments**: Integrated with modern payment gateways for AED/SAR transactions.

## 🛠️ Technology Stack

- **React 18+** with **Vite** for ultra-fast builds.
- **TypeScript** for end-to-end type safety.
- **Tailwind CSS** for premium, responsive design.
- **Zustand** for lightweight, scalable state management.
- **React Query** for optimized server-state synchronization.

## 📦 Getting Started

### Prerequisites
- Node.js **20.x** or higher.
- `npm` or `yarn`.

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your Environment Variables in `.env` (refer to the Deployment Guide).
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🚢 Deployment (Railway)

This project is optimized for **Railway** deployment.
- Build Command: `npm install --include=dev && npm run build`
- Start Command: `npx serve -s dist -l $PORT`

---
*Note: This system follows strict h-screen and glassmorphism design principles as defined in the master project specs.*
