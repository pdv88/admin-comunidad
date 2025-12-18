import React from 'react';
import DashboardLayout from '../components/DashboardLayout';
import GlassSkeleton from '../components/GlassSkeleton';

const DashboardSkeleton = () => {
    return (
        <DashboardLayout>
            <div className="flex flex-col h-full gap-4 animate-pulse">
                {/* 0. Notices Bar Skeleton */}
                <div className="w-full shrink-0">
                    <GlassSkeleton height="h-14" />
                </div>

                {/* 1. Welcome Section Skeleton */}
                <div className="w-full shrink-0">
                    <GlassSkeleton height="h-48" />
                </div>

                {/* 3. Action Center & Reports Grid Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0 w-full"> 
                    
                    {/* Polls */}
                    <div className="col-span-1 h-full min-h-[300px]">
                       <GlassSkeleton />
                    </div>

                    {/* Campaigns */}
                    <div className="col-span-1 h-full min-h-[300px]">
                        <GlassSkeleton />
                    </div>

                    {/* Reports */}
                    <div className="col-span-1 h-full min-h-[300px]">
                        <GlassSkeleton />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default DashboardSkeleton;
