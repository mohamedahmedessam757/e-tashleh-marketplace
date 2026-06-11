
import React from 'react';
import { GlassCard } from '../../ui/GlassCard';
import { useAdminStore } from '../../../stores/useAdminStore';
import { Power, Shield, Users } from 'lucide-react';

export const SystemSettings: React.FC = () => {
  const { systemStatus, toggleSystemStatus } = useAdminStore();

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">System Configuration</h1>
        
        <GlassCard className="p-6 border-red-500/20 bg-red-900/5">
            <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                <Shield size={20} />
                Danger Zone
            </h3>
            
            <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-red-500/20">
                <div>
                    <div className="text-white font-bold">System Status</div>
                    <div className="text-xs text-white/40">Toggle maintenance mode. Stops all new orders.</div>
                </div>
                <button 
                    onClick={toggleSystemStatus}
                    className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${!systemStatus.maintenanceMode ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                >
                    <Power size={16} />
                    {!systemStatus.maintenanceMode ? 'Active' : 'Maintenance'}
                </button>
            </div>
        </GlassCard>

        <GlassCard className="p-6">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                <Users size={20} className="text-gold-500" />
                Admin Accounts
            </h3>
            <div className="text-center text-white/30 py-8">
                Manage other admin accounts here (Placeholder)
            </div>
        </GlassCard>
    </div>
  );
};
