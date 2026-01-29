import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ActivityIndicator, Dimensions, useColorScheme } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '@/constants/Config';
import axios from 'axios';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 160;
const CHART_PADDING = 20; // Side padding

const BilledVsCollectedWidget = () => {
    const { activeCommunity } = useAuth();
    const systemColorScheme = useColorScheme();
    const isDarkMode = systemColorScheme === 'dark';
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const fetchStats = async () => {
            try {
                if (!activeCommunity?.community_id) return;

                const response = await axios.get(`${API_URL}/api/maintenance/stats`, {
                    headers: { 'X-Community-ID': activeCommunity.community_id }
                });

                if (isMounted) {
                    setData(response.data);
                }
            } catch (error) {
                console.error("Error fetching chart data", error);
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (activeCommunity) {
            fetchStats();
        }

        return () => {
            isMounted = false;
        };
    }, [activeCommunity]);

    // Path Generation Logic (Spline)
    const { billedPath, collectedPath, billedArea, collectedArea, points, maxVal } = useMemo(() => {
        if (!data || data.length === 0) return { billedPath: '', collectedPath: '', billedArea: '', collectedArea: '', points: [], maxVal: 100 };

        const max = Math.max(...data.map(d => Math.max(Number(d.billed), Number(d.collected))), 100);

        // Calculate points
        const width = SCREEN_WIDTH - 64; // Approx width inside card padding
        const step = width / (data.length - 1);

        const billedPoints = data.map((d, i) => ({
            x: i * step,
            y: CHART_HEIGHT - (Number(d.billed) / max) * CHART_HEIGHT
        }));

        const collectedPoints = data.map((d, i) => ({
            x: i * step,
            y: CHART_HEIGHT - (Number(d.collected) / max) * CHART_HEIGHT
        }));

        const makePath = (nodes: { x: number, y: number }[]) => {
            if (nodes.length === 0) return '';

            // Start point
            let path = `M ${nodes[0].x},${nodes[0].y}`;

            // Catmull-Rom like cubic bezier smoothing
            for (let i = 0; i < nodes.length - 1; i++) {
                const current = nodes[i];
                const next = nodes[i + 1];

                // Simple smoothing: control points at mid x, same y as start/end
                const cp1x = current.x + (next.x - current.x) / 2;
                const cp1y = current.y;
                const cp2x = current.x + (next.x - current.x) / 2;
                const cp2y = next.y;

                path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
            }
            return path;
        };

        const bLine = makePath(billedPoints);
        const cLine = makePath(collectedPoints);

        // Area paths (close the loop down to bottom)
        const bArea = `${bLine} L ${width},${CHART_HEIGHT} L 0,${CHART_HEIGHT} Z`;
        const cArea = `${cLine} L ${width},${CHART_HEIGHT} L 0,${CHART_HEIGHT} Z`;

        return {
            billedPath: bLine,
            collectedPath: cLine,
            billedArea: bArea,
            collectedArea: cArea,
            points: data.map((d, i) => ({ x: i * step, label: d.name.substring(0, 3) })),
            maxVal: max
        };
    }, [data]);

    if (loading) return (
        <View
            style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)', borderRadius: 16, height: 240, justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }}
        >
            <ActivityIndicator size="small" color="#4f46e5" />
        </View>
    );

    if (!data || data.length === 0) return (
        <View className="bg-white/60 dark:bg-white/5 rounded-2xl p-4 mb-4 border border-white/40 dark:border-white/10 h-60 items-center justify-center">
            <Text className="text-gray-400">No financial data available</Text>
        </View>
    );

    return (
        <View className="bg-white/60 dark:bg-white/5 rounded-2xl p-4 mb-4 border border-white/40 dark:border-white/10 shadow-sm">
            <View className="mb-2">
                <Text className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">Financial Overview</Text>
                <Text className="text-xs text-gray-600 dark:text-gray-400">Billed vs Collected (Last 6 Months)</Text>
            </View>

            {/* Chart Area */}
            <View style={{ height: CHART_HEIGHT, width: '100%', marginTop: 10 }}>
                <Svg height={CHART_HEIGHT} width="100%" style={{ overflow: 'visible' }}>
                    <Defs>
                        <LinearGradient id="gradBilled" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#06b6d4" stopOpacity="0.5" />
                            <Stop offset="1" stopColor="#06b6d4" stopOpacity="0" />
                        </LinearGradient>
                        <LinearGradient id="gradCollected" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor="#10b981" stopOpacity="0.5" />
                            <Stop offset="1" stopColor="#10b981" stopOpacity="0" />
                        </LinearGradient>
                    </Defs>

                    {/* Billed Area & Line */}
                    <Path d={billedArea} fill="url(#gradBilled)" />
                    <Path d={billedPath} stroke="#06b6d4" strokeWidth="2" fill="none" />

                    {/* Collected Area & Line */}
                    <Path d={collectedArea} fill="url(#gradCollected)" />
                    <Path d={collectedPath} stroke="#10b981" strokeWidth="2" fill="none" />
                </Svg>
            </View>

            {/* X-Axis Labels */}
            <View className="h-5 w-full mt-1 relative">
                {points.map((p, i) => (
                    <Text
                        key={i}
                        className="text-[10px] text-gray-500 dark:text-gray-400 font-medium absolute text-center w-5"
                        style={{ left: p.x - 10 }}
                    >
                        {p.label}
                    </Text>
                ))}
            </View>

            {/* Legend */}
            <View className="flex-row justify-center gap-6 mt-4">
                <View className="flex-row items-center gap-2">
                    <View className="w-3 h-3 rounded-full bg-cyan-500" />
                    <Text className="text-xs text-gray-600 dark:text-gray-400">Billed</Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <View className="w-3 h-3 rounded-full bg-emerald-500" />
                    <Text className="text-xs text-gray-600 dark:text-gray-400">Collected</Text>
                </View>
            </View>
        </View>
    );
}

export default BilledVsCollectedWidget;
