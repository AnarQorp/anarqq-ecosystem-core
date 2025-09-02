/**
 * DAOExplorer - Browse and discover DAOs in the AnarQ&Q ecosystem
 * 
 * Displays a list of all available DAOs, allows users to view details,
 * and request to join them if permitted.
 */

import React, { useState, useEffect } from 'react';
import { useDAO } from '../../composables/useDAO';
import { useSessionContext } from '../../contexts/SessionContext';
import { 
  BuildingOfficeIcon,
  MagnifyingGlassIcon,
  UsersIcon,
  LockClosedIcon,
  GlobeAltIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  RefreshIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { cn } from '../../lib/utils';

const DAOExplorer: React.FC = () => {
  const { isAuthenticated } = useSessionContext();
  const {
    daos,
    loading,
    error,
    getDAOs,
    joinDAO,
    clearError
  } = useDAO();

  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'dao-only' | 'private'>('all');
  const [joiningDAO, setJoiningDAO] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load DAOs on mount
  useEffect(() => {
    getDAOs();
  }, [getDAOs]);

  // Clear success/error messages after 5 seconds
  useEffect(() => {
    if (joinSuccess) {
      const timer = setTimeout(() => setJoinSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [joinSuccess]);

  useEffect(() => {
    if (joinError) {
      const timer = setTimeout(() => setJoinError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [joinError]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await getDAOs();
    setRefreshing(false);
  };

  const handleJoinDAO = async (daoId: string, daoName: string) => {
    if (!isAuthenticated) {
      setJoinError('Please authenticate to join a DAO');
      return;
    }

    setJoiningDAO(daoId);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const success = await joinDAO(daoId);
      if (success) {
        setJoinSuccess(`Successfully joined ${daoName}!`);
        // Refresh DAOs to update member counts
        await getDAOs();
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Failed to join DAO');
    } finally {
      setJoiningDAO(null);
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
            <GlobeAltIcon className="h-3 w-3 mr-1" />
            Public
          </Badge>
        );
      case 'dao-only':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <UsersIcon className="h-3 w-3 mr-1" />
            DAO Only
          </Badge>
        );
      case 'private':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
            <LockClosedIcon className="h-3 w-3 mr-1" />
            Private
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {visibility}
          </Badge>
        );
    }
  };

  const canJoinDAO = (dao: any) => {
    // For now, allow joining public DAOs and dao-only DAOs
    // In production, this would check actual membership status and Qonsent rules
    return dao.visibility === 'public' || dao.visibility === 'dao-only';
  };

  const filteredDAOs = daos.filter(dao => {
    const matchesSearch = dao.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dao.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVisibility = visibilityFilter === 'all' || dao.visibility === visibilityFilter;
    return matchesSearch && matchesVisibility;
  });

  const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <Card key={i} className="h-64">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-4" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-12">
      <BuildingOfficeIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No DAOs found</h3>
      <p className="text-gray-600 mb-4">
        {searchQuery || visibilityFilter !== 'all' 
          ? 'Try adjusting your search or filters'
          : 'There are no DAOs available at the moment'
        }
      </p>
      {(searchQuery || visibilityFilter !== 'all') && (
        <Button
          variant="outline"
          onClick={() => {
            setSearchQuery('');
            setVisibilityFilter('all');
          }}
        >
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 mr-3 text-blue-600" />
            DAO Explorer
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Discover and join decentralized autonomous organizations in the AnarQ&Q ecosystem
          </p>
        </div>
        
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          variant="outline"
          className="mt-4 sm:mt-0"
        >
          <RefreshIcon className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Success/Error Messages */}
      {joinSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-green-800">{joinSuccess}</p>
          </div>
        </div>
      )}

      {(error || joinError) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800">{error || joinError}</p>
              <button
                onClick={() => {
                  clearError();
                  setJoinError(null);
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search DAOs by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Visibility</option>
          <option value="public">Public</option>
          <option value="dao-only">DAO Only</option>
          <option value="private">Private</option>
        </select>
      </div>

      {/* DAO Grid */}
      {loading && daos.length === 0 ? (
        <LoadingSkeleton />
      ) : filteredDAOs.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDAOs.map((dao) => (
            <Card key={dao.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{dao.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {getVisibilityBadge(dao.visibility)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {dao.description}
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center">
                      <UsersIcon className="h-4 w-4 mr-1" />
                      Members
                    </span>
                    <span className="font-medium">{dao.memberCount.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Quorum</span>
                    <span className="font-medium">{dao.quorum}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Active Proposals</span>
                    <span className="font-medium">{dao.activeProposals}</span>
                  </div>

                  {dao.tokenRequirement && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Token Requirement</span>
                      <span className="font-medium text-xs">
                        {dao.tokenRequirement.amount} {dao.tokenRequirement.token}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                  
                  {canJoinDAO(dao) && (
                    <Button
                      onClick={() => handleJoinDAO(dao.id, dao.name)}
                      disabled={joiningDAO === dao.id || !isAuthenticated}
                      size="sm"
                      className="min-w-[80px]"
                    >
                      {joiningDAO === dao.id ? (
                        <RefreshIcon className="h-4 w-4 animate-spin" />
                      ) : (
                        'Join'
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Authentication Notice */}
      {!isAuthenticated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 mr-2" />
            <p className="text-blue-800">
              Please authenticate with your sQuid identity to join DAOs and participate in governance.
            </p>
          </div>
        </div>
      )}

      {/* Stats Footer */}
      {daos.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{daos.length}</p>
              <p className="text-sm text-gray-600">Total DAOs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {daos.filter(d => d.visibility === 'public').length}
              </p>
              <p className="text-sm text-gray-600">Public DAOs</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {daos.reduce((sum, dao) => sum + dao.memberCount, 0).toLocaleString()}
              </p>
              <p className="text-sm text-gray-600">Total Members</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {daos.reduce((sum, dao) => sum + dao.activeProposals, 0)}
              </p>
              <p className="text-sm text-gray-600">Active Proposals</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DAOExplorer;