/**
 * ProposalStatsSidebar - Historical governance statistics and trends
 * 
 * Displays quorum statistics, top proposals, and participation metrics
 * for DAO governance analysis within the AnarQ&Q ecosystem.
 */

import React, { useMemo, useCallback } from 'react';
import { useRenderMonitoring } from '../../utils/performance/monitoring';
import { 
  useAccessibleVisualization,
  createAccessibleChart,
  DataVisualizationDescriber,
  AccessibleProgress,
  DataDescription,
  ACCESSIBLE_COLORS
} from '../../utils/accessibility';
import { 
  ChartBarIcon,
  TrophyIcon,
  ClockIcon,
  UsersIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';
import type { Proposal, DAOResults } from '../../composables/useDAO';

interface ProposalStatsSidebarProps {
  daoId: string;
  proposals: Proposal[];
  results: DAOResults | null;
  className?: string;
}

interface ProposalStats {
  quorumReachRate: number;
  averageParticipation: number;
  averageTimeToQuorum: number | null;
  topProposals: Array<{
    id: string;
    title: string;
    votePercentage: number;
    participationRate: number;
    voteCount: number;
    status: 'active' | 'closed';
  }>;
  participationTrend: 'increasing' | 'decreasing' | 'stable';
  totalProposals: number;
  completedProposals: number;
  hasInsufficientData: boolean;
}

const ProposalStatsSidebar: React.FC<ProposalStatsSidebarProps> = React.memo(({
  daoId,
  proposals,
  results,
  className
}) => {
  // Performance monitoring
  const { getMountTime } = useRenderMonitoring('ProposalStatsSidebar', { daoId });
  
  // Accessibility hooks
  const { colorScheme, shouldShowDataTable, describer } = useAccessibleVisualization({
    highContrast: false,
    colorBlindFriendly: false,
    preferDataTable: false
  });
  // Calculate comprehensive proposal statistics
  const proposalStats = useMemo((): ProposalStats => {
    if (!proposals || proposals.length === 0) {
      return {
        quorumReachRate: 0,
        averageParticipation: 0,
        averageTimeToQuorum: null,
        topProposals: [],
        participationTrend: 'stable',
        totalProposals: 0,
        completedProposals: 0,
        hasInsufficientData: true
      };
    }

    const totalProposals = proposals.length;
    const completedProposals = proposals.filter(p => p.status === 'closed').length;
    
    // Insufficient data check - need at least 3 completed proposals for meaningful stats
    const hasInsufficientData = completedProposals < 3;

    // Calculate quorum reach rate
    const proposalsWithQuorum = proposals.filter(p => p.quorumReached).length;
    const quorumReachRate = totalProposals > 0 ? (proposalsWithQuorum / totalProposals) * 100 : 0;

    // Calculate average participation
    const totalVotes = proposals.reduce((sum, p) => sum + (p.voteCount || 0), 0);
    const averageParticipation = totalProposals > 0 ? totalVotes / totalProposals : 0;

    // Calculate average time to quorum for completed proposals
    let averageTimeToQuorum: number | null = null;
    const completedWithQuorum = proposals.filter(p => 
      p.status === 'closed' && p.quorumReached
    );

    if (completedWithQuorum.length > 0) {
      // Mock calculation - in real implementation, this would use actual voting timestamps
      // For now, we'll estimate based on proposal duration and participation patterns
      const timeToQuorumValues = completedWithQuorum.map(proposal => {
        const createdAt = new Date(proposal.createdAt);
        const expiresAt = new Date(proposal.expiresAt);
        const totalDuration = expiresAt.getTime() - createdAt.getTime();
        
        // Estimate time to quorum based on participation rate
        // Higher participation typically means faster quorum
        const participationRate = proposal.voteCount / (proposal.quorum || 1);
        const estimatedTimeToQuorum = participationRate > 1.5 
          ? totalDuration * 0.3  // Fast quorum
          : participationRate > 1.0 
            ? totalDuration * 0.6  // Medium quorum
            : totalDuration * 0.8; // Slow quorum
        
        return estimatedTimeToQuorum / (1000 * 60 * 60); // Convert to hours
      });

      averageTimeToQuorum = timeToQuorumValues.reduce((sum, time) => sum + time, 0) / timeToQuorumValues.length;
    }

    // Identify top proposals by vote count and participation
    const topProposals = [...proposals]
      .sort((a, b) => (b.voteCount || 0) - (a.voteCount || 0))
      .slice(0, 5)
      .map(proposal => {
        const voteCount = proposal.voteCount || 0;
        const quorum = proposal.quorum || 1;
        const participationRate = (voteCount / quorum) * 100;
        
        // Calculate vote percentage based on results if available
        let votePercentage = 0;
        if (proposal.results && Object.keys(proposal.results).length > 0) {
          const totalWeight = Object.values(proposal.results).reduce(
            (sum, result) => sum + (result.weight || 0), 0
          );
          const maxWeight = Math.max(...Object.values(proposal.results).map(r => r.weight || 0));
          votePercentage = totalWeight > 0 ? (maxWeight / totalWeight) * 100 : 0;
        }

        return {
          id: proposal.id,
          title: proposal.title,
          votePercentage: Math.round(votePercentage * 10) / 10,
          participationRate: Math.round(participationRate * 10) / 10,
          voteCount,
          status: proposal.status
        };
      });

    // Calculate participation trend
    let participationTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (proposals.length >= 6) {
      const recentProposals = proposals
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3);
      const olderProposals = proposals
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(3, 6);

      const recentAvg = recentProposals.reduce((sum, p) => sum + (p.voteCount || 0), 0) / recentProposals.length;
      const olderAvg = olderProposals.reduce((sum, p) => sum + (p.voteCount || 0), 0) / olderProposals.length;

      const changeThreshold = 0.15; // 15% change threshold
      const changeRatio = (recentAvg - olderAvg) / olderAvg;

      if (changeRatio > changeThreshold) {
        participationTrend = 'increasing';
      } else if (changeRatio < -changeThreshold) {
        participationTrend = 'decreasing';
      }
    }

    return {
      quorumReachRate: Math.round(quorumReachRate * 10) / 10,
      averageParticipation: Math.round(averageParticipation * 10) / 10,
      averageTimeToQuorum: averageTimeToQuorum ? Math.round(averageTimeToQuorum * 10) / 10 : null,
      topProposals,
      participationTrend,
      totalProposals,
      completedProposals,
      hasInsufficientData
    };
  }, [proposals]);

  // Render insufficient data message with helpful explanations
  const renderInsufficientDataMessage = () => {
    const messageConfig = {
      noProposals: {
        icon: DocumentTextIcon,
        title: "No Proposals Yet",
        message: "This DAO hasn't created any proposals yet. Statistics will appear once governance activity begins.",
        suggestions: [
          "Members can create the first proposal to start governance",
          "Statistics become more meaningful with multiple proposals",
          "Quorum and participation metrics will be calculated automatically"
        ]
      },
      fewProposals: {
        icon: ExclamationTriangleIcon,
        title: "Limited Data Available",
        message: `Only ${proposalStats.completedProposals} completed proposal${proposalStats.completedProposals === 1 ? '' : 's'} available for analysis.`,
        suggestions: [
          "More proposals will improve statistical accuracy",
          "Trends become visible with 6+ proposals",
          "Current metrics are based on available data"
        ]
      }
    };

    const config = proposalStats.totalProposals === 0 ? messageConfig.noProposals : messageConfig.fewProposals;
    const IconComponent = config.icon;

    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <IconComponent className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800 mb-2">
                {config.title}
              </h4>
              <p className="text-sm text-yellow-700 mb-3">
                {config.message}
              </p>
              <ul className="text-xs text-yellow-600 space-y-1">
                {config.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render partial statistics when some data is available
  const renderPartialStatistics = () => {
    if (proposalStats.totalProposals === 0) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-start space-x-2">
          <InformationCircleIcon className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <span className="font-medium">Partial Statistics:</span>
            {' '}Based on {proposalStats.totalProposals} proposal{proposalStats.totalProposals === 1 ? '' : 's'}
            {proposalStats.completedProposals > 0 && (
              <span>, {proposalStats.completedProposals} completed</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render graceful degradation for new DAOs
  const renderNewDAOGuidance = () => {
    if (proposalStats.totalProposals > 0) return null;

    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="text-center">
            <UsersIcon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Welcome to DAO Governance
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              This DAO is ready for its first governance activities. Here's what you can expect:
            </p>
            <div className="grid grid-cols-1 gap-2 text-xs text-blue-600">
              <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                <span>Quorum Statistics</span>
                <span className="text-blue-500">After first votes</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                <span>Participation Trends</span>
                <span className="text-blue-500">After 6+ proposals</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded border border-blue-100">
                <span>Top Proposals</span>
                <span className="text-blue-500">After voting begins</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render participation trend indicator
  const renderParticipationTrend = () => {
    const trendConfig = {
      increasing: {
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        icon: '↗',
        label: 'Increasing'
      },
      decreasing: {
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        icon: '↘',
        label: 'Decreasing'
      },
      stable: {
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: '→',
        label: 'Stable'
      }
    };

    const config = trendConfig[proposalStats.participationTrend];

    return (
      <div className="flex items-center space-x-2">
        <div className={cn("px-2 py-1 rounded-full text-xs font-medium", config.bgColor, config.color)}>
          <span className="mr-1">{config.icon}</span>
          {config.label}
        </div>
      </div>
    );
  };

  // Render accessible quorum chart with high contrast colors
  const renderQuorumChart = () => {
    const reachedCount = Math.round((proposalStats.quorumReachRate / 100) * proposalStats.totalProposals);
    const notReachedCount = proposalStats.totalProposals - reachedCount;

    if (proposalStats.totalProposals === 0) return null;

    // Generate accessible chart description
    const chartDescription = describer.describeQuorumProgress(
      reachedCount,
      proposalStats.totalProposals,
      proposalStats.quorumReachRate >= 50
    );

    return (
      <div className="mt-2">
        <AccessibleProgress
          value={proposalStats.quorumReachRate}
          max={100}
          label="Quorum Reach Rate"
          showPercentage={false}
          colorScheme="success"
          size="sm"
          className="mb-2"
        />
        
        {/* Legend with high contrast colors */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: colorScheme.green }} />
            <span className="text-gray-600">Reached ({reachedCount})</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: colorScheme.gray }} />
            <span className="text-gray-600">Not reached ({notReachedCount})</span>
          </div>
        </div>

        {/* Screen reader description */}
        <div className="sr-only">
          {chartDescription}
        </div>

        {/* Data table fallback */}
        {shouldShowDataTable && (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" role="table">
              <caption className="sr-only">
                Quorum achievement breakdown for all proposals
              </caption>
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td scope="row" className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    Quorum Reached
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {reachedCount}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {proposalStats.quorumReachRate.toFixed(1)}%
                  </td>
                </tr>
                <tr>
                  <td scope="row" className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                    Quorum Not Reached
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {notReachedCount}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                    {(100 - proposalStats.quorumReachRate).toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Render participation distribution chart
  const renderParticipationChart = () => {
    if (proposalStats.totalProposals === 0) return null;

    // Create participation buckets
    const buckets = {
      high: proposals.filter(p => (p.voteCount || 0) >= proposalStats.averageParticipation * 1.5).length,
      medium: proposals.filter(p => {
        const votes = p.voteCount || 0;
        return votes >= proposalStats.averageParticipation * 0.5 && votes < proposalStats.averageParticipation * 1.5;
      }).length,
      low: proposals.filter(p => (p.voteCount || 0) < proposalStats.averageParticipation * 0.5).length
    };

    const total = buckets.high + buckets.medium + buckets.low;
    if (total === 0) return null;

    const highPercent = (buckets.high / total) * 100;
    const mediumPercent = (buckets.medium / total) * 100;
    const lowPercent = (buckets.low / total) * 100;

    return (
      <div className="mt-2">
        <div className="flex items-center space-x-1 mb-2">
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden flex">
            {highPercent > 0 && (
              <div 
                className="h-full bg-green-500 transition-all duration-500 ease-out"
                style={{ width: `${highPercent}%` }}
                title={`High participation: ${buckets.high} proposals`}
              />
            )}
            {mediumPercent > 0 && (
              <div 
                className="h-full bg-yellow-500 transition-all duration-500 ease-out"
                style={{ width: `${mediumPercent}%` }}
                title={`Medium participation: ${buckets.medium} proposals`}
              />
            )}
            {lowPercent > 0 && (
              <div 
                className="h-full bg-red-400 transition-all duration-500 ease-out"
                style={{ width: `${lowPercent}%` }}
                title={`Low participation: ${buckets.low} proposals`}
              />
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="text-gray-600">High ({buckets.high})</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
            <span className="text-gray-600">Med ({buckets.medium})</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-400 rounded-full" />
            <span className="text-gray-600">Low ({buckets.low})</span>
          </div>
        </div>
      </div>
    );
  };

  // Render tooltip component for hover states
  const renderTooltip = (content: string, children: React.ReactNode) => (
    <div className="group relative">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center space-x-2">
        <ChartBarIcon className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Governance Statistics</h3>
      </div>

      {/* Show insufficient data message if needed */}
      {proposalStats.hasInsufficientData && renderInsufficientDataMessage()}

      {/* Show new DAO guidance for DAOs with no proposals */}
      {renderNewDAOGuidance()}

      {/* Show partial statistics notice when some data is available */}
      {renderPartialStatistics()}

      {/* Quorum Statistics - only show if we have some data */}
      {proposalStats.totalProposals > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <CheckCircleIcon className="h-4 w-4 mr-2 text-green-600" />
              Quorum Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Quorum Reach Rate */}
            <div>
              {renderTooltip(
                `${proposalStats.quorumReachRate}% of proposals successfully reached the required quorum threshold`,
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Quorum Reach Rate</span>
                  <span className="text-sm font-bold text-gray-900">
                    {proposalStats.quorumReachRate}%
                  </span>
                </div>
              )}
              {renderQuorumChart()}
            </div>

            {/* Average Participation */}
            <div>
              {renderTooltip(
                `Average of ${proposalStats.averageParticipation} votes per proposal with distribution across high, medium, and low participation levels`,
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Average Participation</span>
                  <span className="text-sm font-bold text-gray-900">
                    {proposalStats.averageParticipation} votes
                  </span>
                </div>
              )}
              {renderParticipationChart()}
              <p className="text-xs text-gray-500 mt-1">
                Distribution across all proposals by participation level
              </p>
            </div>

            {/* Average Time to Quorum */}
            {proposalStats.averageTimeToQuorum !== null && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Avg. Time to Quorum</span>
                  <span className="text-sm font-bold text-gray-900">
                    {proposalStats.averageTimeToQuorum < 24 
                      ? `${Math.round(proposalStats.averageTimeToQuorum)}h`
                      : `${Math.round(proposalStats.averageTimeToQuorum / 24)}d`
                    }
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Based on {proposalStats.completedProposals} completed proposals
                </p>
              </div>
            )}

            {/* Participation Trend */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Participation Trend</span>
                {renderParticipationTrend()}
              </div>
              <p className="text-xs text-gray-500">
                Based on recent proposal activity
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Proposals */}
      {proposalStats.topProposals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <TrophyIcon className="h-4 w-4 mr-2 text-yellow-600" />
              Most Voted Proposals
            </CardTitle>
            <CardDescription className="text-sm">
              Proposals ranked by participation and vote count
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {proposalStats.topProposals.map((proposal, index) => (
              <div
                key={proposal.id}
                className="group cursor-pointer p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors duration-200"
                onClick={() => {
                  // Navigate to proposal details
                  // This would typically use router navigation
                  console.log('Navigate to proposal:', proposal.id);
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">
                        #{index + 1}
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs",
                          proposal.status === 'active' 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        )}
                      >
                        {proposal.status === 'active' ? 'Active' : 'Closed'}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {proposal.title}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600">Votes</span>
                      <span className="font-medium text-gray-900">
                        {proposal.voteCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Participation</span>
                      <span className="font-medium text-gray-900">
                        {proposal.participationRate}%
                      </span>
                    </div>
                  </div>
                  
                  {proposal.votePercentage > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-600">Leading Vote</span>
                        <span className="font-medium text-gray-900">
                          {proposal.votePercentage}%
                        </span>
                      </div>
                      <Progress 
                        value={proposal.votePercentage} 
                        className="h-1"
                      />
                    </div>
                  )}
                </div>

                {/* Hover indicator */}
                <div className="flex items-center justify-end mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-blue-600">Click to view details →</span>
                </div>
              </div>
            ))}

            {proposalStats.topProposals.length === 0 && (
              <div className="text-center py-4">
                <TrophyIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  No proposals with votes yet
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProposalStatsSidebar;