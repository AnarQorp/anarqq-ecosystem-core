/**
 * DAO Dashboard Skeleton Components
 * 
 * Provides skeleton loading states for all DAO dashboard components
 * with smooth transitions and accurate layout matching.
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '../../ui/card';
import { Skeleton } from '../../ui/skeleton';
import { cn } from '../../../lib/utils';

/**
 * Token Overview Panel Skeleton
 */
export const TokenOverviewSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn("w-full", className)}>
    <CardHeader>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-32" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Token Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div>
          <Skeleton className="h-4 w-16 mb-1" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      
      {/* Supply Metrics */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-2 w-full" />
      </div>
      
      {/* Governance Type */}
      <div className="flex items-center space-x-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
    </CardContent>
  </Card>
);

/**
 * DAO Wallet Overview Skeleton
 */
export const DAOWalletOverviewSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn("w-full", className)}>
    <CardHeader>
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-6" />
        <Skeleton className="h-6 w-32" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Token Balance */}
      <div>
        <Skeleton className="h-4 w-20 mb-2" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      
      {/* NFT Summary */}
      <div>
        <Skeleton className="h-4 w-16 mb-2" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      
      {/* Voting Power */}
      <div>
        <Skeleton className="h-4 w-24 mb-2" />
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

/**
 * Quick Actions Panel Skeleton
 */
export const QuickActionsSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn("w-full", className)}>
    <CardHeader>
      <Skeleton className="h-6 w-28" />
    </CardHeader>
    <CardContent className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

/**
 * Proposal Stats Sidebar Skeleton
 */
export const ProposalStatsSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn("w-full", className)}>
    <CardHeader>
      <Skeleton className="h-6 w-36" />
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Quorum Stats */}
      <div>
        <Skeleton className="h-4 w-24 mb-2" />
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
          <div className="text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        </div>
      </div>
      
      {/* Top Proposals */}
      <div>
        <Skeleton className="h-4 w-28 mb-2" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Chart Placeholder */}
      <div>
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>
    </CardContent>
  </Card>
);

/**
 * Enhanced Proposal Card Skeleton
 */
export const ProposalCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn("w-full", className)}>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-6 w-16" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Description */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      
      {/* Voting Options */}
      <div className="space-y-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded">
            <Skeleton className="h-4 w-16" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-2 w-20" />
            </div>
          </div>
        ))}
      </div>
      
      {/* Voting Metrics */}
      <div className="grid grid-cols-3 gap-4 pt-2 border-t">
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div className="text-center">
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      </div>
      
      {/* Action Button */}
      <div className="flex justify-end">
        <Skeleton className="h-9 w-20" />
      </div>
    </CardContent>
  </Card>
);

/**
 * DAO Header Skeleton
 */
export const DAOHeaderSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <Card className={cn("w-full", className)}>
    <CardHeader>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <Skeleton className="h-8 w-8 mr-3" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-4 w-96 mb-4" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {/* DAO Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-8 w-16 mx-auto mb-1" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        ))}
      </div>
      
      {/* Token Requirements */}
      <div className="bg-gray-50 rounded-lg p-4">
        <Skeleton className="h-4 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
    </CardContent>
  </Card>
);

/**
 * Proposals List Skeleton
 */
export const ProposalsListSkeleton: React.FC<{ 
  count?: number; 
  className?: string; 
}> = ({ count = 3, className }) => (
  <div className={cn("space-y-4", className)}>
    {[...Array(count)].map((_, i) => (
      <ProposalCardSkeleton key={i} />
    ))}
  </div>
);

/**
 * Complete DAO Dashboard Skeleton
 */
export const DAODashboardSkeleton: React.FC<{ 
  layout?: 'default' | 'compact';
  className?: string; 
}> = ({ layout = 'default', className }) => (
  <div className={cn("max-w-7xl mx-auto p-4 sm:p-6 space-y-6", className)}>
    {/* DAO Header */}
    <DAOHeaderSkeleton />
    
    {layout === 'default' ? (
      /* Desktop 2-column layout */
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Proposals */}
        <div className="lg:col-span-2 space-y-6">
          {/* Proposals Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-10 w-36 mt-4 sm:mt-0" />
          </div>
          
          {/* Proposal Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <Skeleton className="h-10 w-full" />
                </div>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
          
          {/* Proposals List */}
          <ProposalsListSkeleton />
        </div>
        
        {/* Right Column - Economic Data */}
        <div className="space-y-6">
          <TokenOverviewSkeleton />
          <DAOWalletOverviewSkeleton />
          <QuickActionsSkeleton />
          <ProposalStatsSkeleton />
        </div>
      </div>
    ) : (
      /* Compact stacked layout */
      <div className="space-y-6">
        <TokenOverviewSkeleton />
        <DAOWalletOverviewSkeleton />
        <QuickActionsSkeleton />
        <ProposalStatsSkeleton />
        <ProposalsListSkeleton />
      </div>
    )}
  </div>
);

/**
 * Progressive Loading Component
 * Shows different skeleton states based on loading progress
 */
export const ProgressiveLoadingSkeleton: React.FC<{
  stage: 'initial' | 'dao-loaded' | 'wallet-loading' | 'complete';
  className?: string;
}> = ({ stage, className }) => {
  switch (stage) {
    case 'initial':
      return <DAODashboardSkeleton className={className} />;
      
    case 'dao-loaded':
      return (
        <div className={cn("max-w-7xl mx-auto p-4 sm:p-6 space-y-6", className)}>
          {/* DAO content loaded, show wallet skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {/* Proposals loaded */}
            </div>
            <div className="space-y-6">
              <TokenOverviewSkeleton />
              <DAOWalletOverviewSkeleton />
              <QuickActionsSkeleton />
            </div>
          </div>
        </div>
      );
      
    case 'wallet-loading':
      return (
        <div className={cn("space-y-6", className)}>
          <DAOWalletOverviewSkeleton />
          <QuickActionsSkeleton />
        </div>
      );
      
    default:
      return null;
  }
};

/**
 * Skeleton transition wrapper with fade effects
 */
export const SkeletonTransition: React.FC<{
  isLoading: boolean;
  children: React.ReactNode;
  skeleton: React.ReactNode;
  className?: string;
}> = ({ isLoading, children, skeleton, className }) => (
  <div className={cn("relative", className)}>
    <div 
      className={cn(
        "transition-opacity duration-300",
        isLoading ? "opacity-0" : "opacity-100"
      )}
    >
      {children}
    </div>
    {isLoading && (
      <div className="absolute inset-0 transition-opacity duration-300">
        {skeleton}
      </div>
    )}
  </div>
);