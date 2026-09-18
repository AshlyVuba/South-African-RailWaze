// apps/web/src/components/UnifiedViewport.tsx
import React, { useState, useCallback } from 'react';
import { MapCanvas } from './MapCanvas'; // From Issue #2
import { MemoryVaultSlider } from './MemoryVaultSlider'; // From Issue #5

interface WaypointProperties {
    stationId: string;
    name: string;
    // Conforms to contracts/waypoint.schema.json
}

export const UnifiedViewport: React.FC = () => {
    const [activeStation, setActiveStation] = useState<WaypointProperties | null>(null);

    const handleWaypointSelect = useCallback((station: WaypointProperties) => {
        setActiveStation(station);
    }, []);

    const handleCloseVault = useCallback(() => {
        setActiveStation(null);
    }, []);

    return (
        <main className="relative w-full h-screen overflow-hidden bg-slate-900">
            {/* 3D Map Canvas: Remains mounted underneath to preserve zoom/center */}
            <MapCanvas onSelectWaypoint={handleWaypointSelect} />

            {/* Floating Memory Vault Drawer/Modal */}
            {activeStation && (
                <section
                    aria-label="Station Memory Vault"
                    className="absolute inset-x-0 bottom-0 z-30 max-h-[70vh] bg-slate-950/95 border-t border-slate-800 rounded-t-2xl shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out flex flex-col pb-[env(safe-area-inset-bottom)]"
                >
                    <div className="flex items-center justify-between p-4 border-b border-slate-800">
                        <h2 className="text-lg font-bold text-white tracking-wide">
                            {activeStation.name} Vault
                        </h2>
                        <button
                            onClick={handleCloseVault}
                            className="p-2 text-slate-400 hover:text-white rounded-lg active:bg-slate-800"
                            aria-label="Close card"
                        >
                            ✕
                        </button>
                    </div>

                    <div className="p-4 overflow-y-auto">
                        <MemoryVaultSlider stationId={activeStation.stationId} />
                    </div>
                </section>
            )}
        </main>
    );
};