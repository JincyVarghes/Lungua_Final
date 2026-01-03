import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BrainIcon, CloudIcon } from './IconComponents';
import type { ChartDataPoint, AnomalyStatus } from '../types';

interface DashboardMockupProps {
    heartRateData: ChartDataPoint[];
    airflowData: ChartDataPoint[];
    anomalyStatus: AnomalyStatus;
    anomalyMessage: string;
    sslReconstructionError: number;
}

const ChartCard: React.FC<{ 
    title: string; 
    data: ChartDataPoint[]; 
    color: string; 
    unit: string;
    domain: [number | string, number | string]
}> = ({ title, data, color, unit, domain }) => {
    const latestValue = data.length > 0 ? Math.round(data[data.length - 1].value) : '--';

    return (
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-[0_0_15px_rgba(0,0,0,0.3)] flex flex-col h-[350px] relative group">
            {/* Header / Readout */}
            <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 flex justify-between items-center z-20">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: color }}></div>
                    <h4 className="text-slate-400 font-medium tracking-widest uppercase text-xs">{title}</h4>
                </div>
                <div className="flex items-baseline space-x-1">
                    <span className="text-3xl font-mono font-bold text-white tracking-tighter" style={{ textShadow: `0 0 10px ${color}80` }}>{latestValue}</span>
                    <span className="text-xs text-slate-500 font-bold">{unit}</span>
                </div>
            </div>
            
            <div className="flex-1 w-full relative bg-[#0B1221]">
                {/* Medical Grid Background */}
                <div className="absolute inset-0 z-0 opacity-10" 
                     style={{ 
                         backgroundImage: `linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)`,
                         backgroundSize: '20px 20px' 
                     }}>
                </div>
                
                {/* CRT Scanline Effect */}
                <div className="absolute inset-0 z-10 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%]"></div>
                
                <ResponsiveContainer width="100%" height="100%">
                    {data.length > 0 ? (
                        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`color-${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                </linearGradient>
                                {/* Neon Glow Filter */}
                                <filter id={`glow-${title}`} height="300%" width="300%" x="-100%" y="-100%">
                                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            {/* Fine grid lines */}
                            <CartesianGrid strokeDasharray="1 4" stroke="#1e293b" opacity={0.5} vertical={false} />
                            <XAxis 
                                dataKey="time" 
                                tick={{fill: '#475569', fontSize: 10, fontFamily: 'monospace'}} 
                                tickLine={false}
                                axisLine={false}
                                minTickGap={50}
                            />
                            <YAxis 
                                domain={domain} 
                                tick={{fill: '#475569', fontSize: 10, fontFamily: 'monospace'}} 
                                tickLine={false}
                                axisLine={false}
                                width={40}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: '#0f172a', 
                                    border: `1px solid ${color}40`, 
                                    borderRadius: '4px', 
                                    fontSize: '12px',
                                    boxShadow: `0 4px 12px rgba(0,0,0,0.5)`
                                }}
                                itemStyle={{ color: '#fff', fontFamily: 'monospace' }}
                                labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                                isAnimationActive={false}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke={color} 
                                strokeWidth={2} 
                                fillOpacity={1} 
                                fill={`url(#color-${title})`} 
                                isAnimationActive={false}
                                filter={`url(#glow-${title})`}
                            />
                        </AreaChart>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-700 font-mono text-xs tracking-widest animate-pulse">
                            <span>WAITING FOR SIGNAL...</span>
                        </div>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const DashboardMockup: React.FC<DashboardMockupProps> = ({ heartRateData, airflowData, anomalyStatus, anomalyMessage, sslReconstructionError }) => {
  const isAnomaly = anomalyStatus === 'Anomaly Detected';
  
  // Logic to determine bar color based on error magnitude
  const getErrorColor = (err: number) => {
      if (err < 30) return 'bg-emerald-500';
      if (err < 60) return 'bg-yellow-500';
      return 'bg-red-500';
  };

  const errorColor = getErrorColor(sslReconstructionError);

  return (
    <div className="bg-dark-surface p-6 rounded-xl border border-dark-border shadow-xl">
      <div className="flex flex-col gap-6 mb-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
                <h2 className="text-2xl font-bold text-dark-text-primary tracking-tight">Real-Time Inference</h2>
                <div className="flex items-center mt-2 space-x-3">
                    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isAnomaly ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                        <span className={`w-2 h-2 rounded-full ${isAnomaly ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></span>
                        <span>{isAnomaly ? 'ANOMALY DETECTED' : 'SYSTEM NOMINAL'}</span>
                    </div>
                </div>
            </div>
            
            {/* SSL Metric Visualizer */}
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-700 w-full md:w-80 mt-4 md:mt-0">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center space-x-2">
                        <BrainIcon className="h-4 w-4 text-purple-400" />
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reconstruction Error</span>
                    </div>
                    <span className={`text-xs font-mono font-bold ${sslReconstructionError > 60 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {sslReconstructionError.toFixed(1)}%
                    </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mb-1">
                    <div 
                        className={`h-full transition-all duration-300 ${errorColor}`} 
                        style={{ width: `${sslReconstructionError}%` }}
                    ></div>
                </div>
                <p className="text-[9px] text-slate-500 text-right">Edge Deviation from MIMIC-III Baseline</p>
            </div>
         </div>

         {/* Dataset Info Box */}
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg flex items-center space-x-3">
                 <div className="p-2 bg-slate-700 rounded-md">
                     <CloudIcon className="h-5 w-5 text-brand-blue" />
                 </div>
                 <div>
                     <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Inference Baseline</p>
                     <p className="text-xs font-mono text-slate-200">PhysioNet MIMIC-III</p>
                 </div>
             </div>
             <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg flex items-center space-x-3">
                 <div className="p-2 bg-slate-700 rounded-md">
                     <BrainIcon className="h-5 w-5 text-purple-400" />
                 </div>
                 <div>
                     <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Architecture</p>
                     <p className="text-xs font-mono text-slate-200">Edge Autoencoder (SSL)</p>
                 </div>
             </div>
             <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg flex flex-col justify-center">
                 <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">
                     <span>Input Vector</span>
                     <span>Reconstruction</span>
                 </div>
                 <div className="flex space-x-1 h-1.5">
                     <div className="w-1/2 bg-blue-500 rounded-full opacity-80"></div>
                     <div className={`w-1/2 rounded-full transition-colors ${isAnomaly ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                 </div>
             </div>
             <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Inhaler Protocol</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${anomalyMessage.includes('Airway') ? 'bg-red-500/20 text-red-300 animate-pulse' : 'bg-slate-700 text-slate-400'}`}>
                    {anomalyMessage.includes('Airway') ? 'ACTION REQ' : 'STANDBY'}
                </span>
             </div>
         </div>
      </div>

      {isAnomaly && (
             <div className="mb-6 px-6 py-4 bg-red-900/40 border-l-4 border-red-500 text-red-100 text-sm font-semibold shadow-lg backdrop-blur-sm animate-pulse flex flex-col md:flex-row items-start md:items-center">
                 <span className="mr-2 text-xl mb-2 md:mb-0">⚠</span> 
                 <div>
                     <span className="block font-bold uppercase text-xs text-red-400 tracking-wider mb-1">Critical Event Logged</span>
                     {anomalyMessage}
                 </div>
             </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard 
            title="Heart Rate (ECG Lead II)" 
            data={heartRateData} 
            color="#ef4444" 
            unit="BPM" 
            domain={[40, 180]} 
        />
        <ChartCard 
            title="Inhaler Flow Rate" 
            data={airflowData} 
            color="#22d3ee" 
            unit="L/min" 
            domain={[0, 100]} 
        />
      </div>
    </div>
  );
};
