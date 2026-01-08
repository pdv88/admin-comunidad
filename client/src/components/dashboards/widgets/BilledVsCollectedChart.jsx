import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { API_URL } from '../../../config';

import { useAuth } from '../../../context/AuthContext';
import { getCurrencySymbol } from '../../../utils/currencyUtils';

const BilledVsCollectedChart = ({ className }) => {
  const { t } = useTranslation();
  const { activeCommunity } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Fix for Recharts "height -1" warning: Delay render to ensure DOM is ready
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Small timeout to ensure layout is painted
    const timer = setTimeout(() => {
        setIsMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
        if (!activeCommunity?.community_id) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/api/maintenance/stats`, {
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'x-community-id': activeCommunity.community_id
                }
            });
            
            if (res.ok) {
                const result = await res.json();
                setData(result);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
  }, [activeCommunity]);

  if (loading) {
    return (
      <div className={`flex flex-col items-center justify-center p-6 h-96 ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="mt-4 text-gray-500 text-sm">Loading chart data...</p>
      </div>
    );
  }

  // Custom Tooltip for Glassmorphism feel
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-neutral-800/90 backdrop-blur-md p-4 rounded-xl shadow-lg border border-white/20 text-sm">
          <p className="font-bold text-gray-800 dark:text-white mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-cyan-600 dark:text-cyan-400 font-medium">
              {t('dashboard.graphs.billed', 'Billed')}: {getCurrencySymbol(activeCommunity?.communities?.currency)}{payload[0].value.toLocaleString()}
            </p>
            <p className="text-emerald-600 dark:text-emerald-400 font-medium">
              {t('dashboard.graphs.collected', 'Collected')}: {getCurrencySymbol(activeCommunity?.communities?.currency)}{payload[1].value.toLocaleString()}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };



  return (
    <div className={`glass-card relative overflow-hidden flex flex-col ${className}`}>
        <div className="relative z-10 p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {t('dashboard.graphs.financial_overview', 'Financial Overview')}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-neutral-400">
                        {t('dashboard.graphs.billed_vs_collected', 'Billed vs Collected (Last 6 Months)')}
                    </p>
                </div>
            </div>

            {data.length === 0 ? (
                 <div className="flex-1 w-full flex items-center justify-center text-gray-400 dark:text-neutral-500">
                    <p>{t('dashboard.graphs.no_data', 'No financial data available')}</p>
                 </div>
            ) : (
                <div className="flex-1 w-full min-h-0 relative">
                    <div className="absolute inset-0">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={data}
                                margin={{
                                top: 10,
                                right: 10,
                                left: 0,
                                bottom: 0,
                                }}
                            >
                            <defs>
                            <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis 
                                dataKey="name" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#9ca3af', fontSize: 12 }} 
                                dy={10}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#9ca3af', fontSize: 12 }}
                                tickFormatter={(value) => `${getCurrencySymbol(activeCommunity?.communities?.currency)}${value / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area 
                                type="monotone" 
                                dataKey="billed" 
                                stroke="#06b6d4" 
                                fillOpacity={1} 
                                fill="url(#colorBilled)" 
                                strokeWidth={3}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="collected" 
                                stroke="#10b981" 
                                fillOpacity={1} 
                                fill="url(#colorCollected)" 
                                strokeWidth={3}
                            />
                        </AreaChart>
                        </ResponsiveContainer>
                        )}
                    </div>
                </div>
          )}
        </div>
    </div>
  );
};

export default BilledVsCollectedChart;
