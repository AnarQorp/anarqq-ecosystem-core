/**
 * ProposalCard - Individual proposal display component for DAO governance
 * 
 * Displays proposal details including title, description, voting options,
 * status, and provides voting interface integration for the AnarQ&Q ecosystem.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useDAO } from '../../composables/useDAO';
import { useSessionContext } from '../../contexts/SessionContext';
import { 
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  HandRaisedIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { cn } from '../../lib/utils';
import type { Proposal } from '../../composables/useDAO';

interface ProposalCardProps {
  proposal: Proposal;
  daoId: string;
  onVote?: (proposalId: string) => void;
  compact?: boolean;
  className?: string;
  // Enhanced metrics props
  showVotingBreakdown?: boolean;
  showQuorumProgress?: boolean;
  votingMechanism?: 'user-based' | 'token-weighted' | 'nft-weighted';
  // Extended proposal analytics
  proposalAnalytics?: {
    votingBreakdown: {
      byWeight: Record<string, number>;
      byCount: Record<string, number>;
      uniqueVoters: number;
      totalWeight: number;
    };
    participationMetrics: {
      voterTurnout: number;
      weightTurnout: number;
      timeToQuorum: number | null;
      votingPattern: 'early' | 'late' | 'consistent';
    };
    quorumStatus: {
      required: number;
      current: number;
      achieved: boolean;
      projectedCompletion: string | null;
    };
  };
}

const ProposalCard: React.FC<ProposalCardProps> = ({
  proposal,
  daoId,
  onVote,
  compact = false,
  className,
  showVotingBreakdown = false,
  showQuorumProgress = false,
  votingMechanism = 'user-based',
  proposalAnalytics: providedAnalytics
}) => {
  const { isAuthenticated } = useSessionContext();
  const { membership } = useDAO();
  
  // State for analytics data fetching
  const [analyticsData, setAnalyticsData] = useState(providedAnalytics || null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Fetch proposal analytics if not provided and enhanced features are enabled
  useEffect(() => {
    const shouldFetchAnalytics = (showVotingBreakdown || showQuorumProgress) && 
                                 !providedAnalytics && 
                                 !analyticsData;

    if (shouldFetchAnalytics) {
      fetchProposalAnalytics();
    }
  }, [showVotingBreakdown, showQuorumProgress, providedAnalytics, proposal.id, daoId]);

  // Function to fetch extended proposal metrics
  const fetchProposalAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);

      const response = await fetch(`/api/dao/${daoId}/proposals/${proposal.id}/analytics`, {
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers if available
          ...(isAuthenticated && {
            'Authorization': `Bearer ${localStorage.getItem('session_token') || ''}`
          })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setAnalyticsData(data.data);
      } else {
        throw new Error(data.error || 'Failed to load proposal analytics');
      }
    } catch (error) {
      console.warn('Proposal analytics fetch failed:', error);
      setAnalyticsError(error instanceof Error ? error.message : 'Failed to load analytics');
      // Don't show error to user, just gracefully degrade
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Use provided analytics or fetched analytics
  const proposalAnalytics = providedAnalytics || analyticsData;

  // Calculate proposal status and timing
  const proposalStatus = useMemo(() => {
    const now = new Date();
    const expiresAt = new Date(proposal.expiresAt);
    const isExpired = now > expiresAt;
    
    if (proposal.status === 'closed' || isExpired) {
      return {
        status: 'closed',
        label: 'Closed',
        color: 'bg-gray-100 text-gray-800',
        icon: CheckCircleIcon
      };
    } else {
      return {
        status: 'active',
        label: 'Active',
        color: 'bg-green-100 text-green-800',
        icon: ClockIcon
      };
    }
  }, [proposal.status, proposal.expiresAt]);

  // Calculate time remaining or elapsed
  const timeInfo = useMemo(() => {
    const now = new Date();
    const expiresAt = new Date(proposal.expiresAt);
    const createdAt = new Date(proposal.createdAt);
    
    if (proposalStatus.status === 'closed') {
      const daysClosed = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        text: daysClosed === 0 ? 'Closed today' : `Closed ${daysClosed} day${daysClosed === 1 ? '' : 's'} ago`,
        urgent: false
      };
    } else {
      const timeRemaining = expiresAt.getTime() - now.getTime();
      const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
      const daysRemaining = Math.floor(hoursRemaining / 24);
      
      if (daysRemaining > 1) {
        return {
          text: `${daysRemaining} days remaining`,
          urgent: false
        };
      } else if (hoursRemaining > 1) {
        return {
          text: `${hoursRemaining} hours remaining`,
          urgent: hoursRemaining <= 24
        };
      } else {
        return {
          text: 'Expires soon',
          urgent: true
        };
      }
    }
  }, [proposal.expiresAt, proposalStatus.status]);

  // Calculate vote distribution for closed proposals
  const voteDistribution = useMemo(() => {
    if (proposalStatus.status !== 'closed' || !proposal.results) {
      return null;
    }

    const totalVotes = proposal.voteCount || 0;
    const totalWeight = Object.values(proposal.results).reduce(
      (sum, result) => sum + (result.weight || 0), 0
    );

    return proposal.options.map(option => {
      const result = proposal.results[option] || { count: 0, weight: 0 };
      const percentage = totalVotes > 0 ? (result.count / totalVotes) * 100 : 0;
      const weightPercentage = totalWeight > 0 ? (result.weight / totalWeight) * 100 : 0;
      
      return {
        option,
        count: result.count,
        weight: result.weight,
        percentage: Math.round(percentage * 10) / 10,
        weightPercentage: Math.round(weightPercentage * 10) / 10,
        isWinning: result.weight === Math.max(...Object.values(proposal.results).map(r => r.weight || 0))
      };
    });
  }, [proposal.results, proposal.options, proposal.voteCount, proposalStatus.status]);

  // Check if user can vote
  const votingEligibility = useMemo(() => {
    if (!isAuthenticated) {
      return {
        canVote: false,
        reason: 'Please authenticate to vote'
      };
    }

    if (!membership?.isMember) {
      return {
        canVote: false,
        reason: 'Only DAO members can vote'
      };
    }

    if (!membership.permissions.canVote) {
      return {
        canVote: false,
        reason: 'You do not have voting permissions'
      };
    }

    if (proposalStatus.status !== 'active') {
      return {
        canVote: false,
        reason: 'Voting has ended'
      };
    }

    // TODO: Check if user has already voted
    // This would require additional data from the backend
    const hasVoted = false; // Placeholder

    if (hasVoted) {
      return {
        canVote: false,
        reason: 'You have already voted'
      };
    }

    return {
      canVote: true,
      reason: null
    };
  }, [isAuthenticated, membership, proposalStatus.status]);

  // Enhanced vote distribution with weight breakdown
  const enhancedVoteDistribution = useMemo(() => {
    if (!showVotingBreakdown || !proposalAnalytics?.votingBreakdown) {
      return voteDistribution;
    }

    const { byWeight, byCount, uniqueVoters, totalWeight } = proposalAnalytics.votingBreakdown;
    
    return proposal.options.map(option => {
      const countVotes = byCount[option] || 0;
      const weightVotes = byWeight[option] || 0;
      const countPercentage = uniqueVoters > 0 ? (countVotes / uniqueVoters) * 100 : 0;
      const weightPercentage = totalWeight > 0 ? (weightVotes / totalWeight) * 100 : 0;
      
      return {
        option,
        count: countVotes,
        weight: weightVotes,
        percentage: Math.round(countPercentage * 10) / 10,
        weightPercentage: Math.round(weightPercentage * 10) / 10,
        isWinning: weightVotes === Math.max(...Object.values(byWeight)),
        // Additional metrics for enhanced display
        averageWeight: countVotes > 0 ? weightVotes / countVotes : 0,
        votingMechanism
      };
    });
  }, [voteDistribution, showVotingBreakdown, proposalAnalytics, proposal.options, votingMechanism]);

  // Format creator identity
  const formatCreator = (creatorId: string) => {
    // Extract readable part from DID or return shortened version
    if (creatorId.startsWith('did:squid:')) {
      const identifier = creatorId.replace('did:squid:', '');
      return identifier.length > 12 ? `${identifier.slice(0, 6)}...${identifier.slice(-6)}` : identifier;
    }
    return creatorId.length > 20 ? `${creatorId.slice(0, 10)}...${creatorId.slice(-10)}` : creatorId;
  };

  // Render enhanced vote distribution chart with weight breakdown
  const renderVoteDistribution = () => {
    const distributionData = enhancedVoteDistribution || voteDistribution;
    if (!distributionData) return null;

    const isEnhanced = showVotingBreakdown && proposalAnalytics?.votingBreakdown;
    const uniqueVoters = proposalAnalytics?.votingBreakdown?.uniqueVoters || proposal.voteCount || 0;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            {isEnhanced ? 'Voting Weight Distribution' : 'Vote Distribution'}
          </h4>
          <div className="flex items-center text-xs text-gray-500">
            <ChartBarIcon className="h-3 w-3 mr-1" />
            {isEnhanced ? `${uniqueVoters} unique voters` : `${proposal.voteCount} votes`}
          </div>
        </div>
        
        <div className="space-y-3">
          {distributionData.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className={cn(
                  "font-medium",
                  item.isWinning ? "text-green-700" : "text-gray-700"
                )}>
                  {item.option}
                  {item.isWinning && <span className="ml-1 text-green-600">👑</span>}
                </span>
                <div className="text-right">
                  {isEnhanced ? (
                    <div>
                      <div className="text-gray-900">{item.count} voters ({item.percentage}%)</div>
                      <div className="text-xs text-gray-500">
                        Weight: {item.weightPercentage}% 
                        {votingMechanism !== 'user-based' && item.averageWeight > 0 && (
                          <span className="ml-1">
                            (avg: {Math.round(item.averageWeight * 100) / 100})
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-gray-900">{item.count} votes ({item.percentage}%)</div>
                      <div className="text-xs text-gray-500">Weight: {item.weightPercentage}%</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Vote count progress bar */}
              <div className="space-y-1">
                <Progress 
                  value={item.percentage} 
                  className={cn(
                    "h-2",
                    item.isWinning ? "bg-green-100" : "bg-gray-100"
                  )}
                />
                
                {/* Weight distribution bar (for weighted voting) */}
                {isEnhanced && votingMechanism !== 'user-based' && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500 w-12">Weight:</span>
                    <Progress 
                      value={item.weightPercentage} 
                      className={cn(
                        "h-1.5 flex-1",
                        item.isWinning ? "bg-blue-100" : "bg-gray-50"
                      )}
                    />
                    <span className="text-xs text-gray-500 w-8 text-right">
                      {item.weightPercentage}%
                    </span>
                  </div>
                )}
              </div>

              {/* Voting mechanism indicator */}
              {isEnhanced && votingMechanism !== 'user-based' && (
                <div className="flex items-center text-xs text-gray-500">
                  <span className="capitalize">{votingMechanism.replace('-', ' ')} voting</span>
                  {item.averageWeight > 0 && (
                    <span className="ml-2">
                      • Avg weight per voter: {Math.round(item.averageWeight * 100) / 100}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Analytics loading state */}
        {analyticsLoading && (showVotingBreakdown || showQuorumProgress) && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-xs text-gray-500">Loading analytics...</span>
            </div>
          </div>
        )}

        {/* Enhanced voter metrics */}
        {isEnhanced && proposalAnalytics?.votingBreakdown && !analyticsLoading && (
          <div className="pt-2 border-t border-gray-100 space-y-2">
            <h5 className="text-xs font-medium text-gray-700 mb-2">Voter Metrics</h5>
            
            {/* Unique voters vs total votes */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Unique Voters</span>
                <span className="font-medium text-gray-900">
                  {proposalAnalytics.votingBreakdown.uniqueVoters}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total Votes</span>
                <span className="font-medium text-gray-900">
                  {Object.values(proposalAnalytics.votingBreakdown.byCount).reduce((sum, count) => sum + count, 0)}
                </span>
              </div>
            </div>

            {/* Participation rates */}
            {proposalAnalytics.participationMetrics && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Voter Participation Rate</span>
                  <span className="font-medium text-gray-900">
                    {Math.round(proposalAnalytics.participationMetrics.voterTurnout * 100)}%
                  </span>
                </div>
                {votingMechanism !== 'user-based' && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Weight Participation Rate</span>
                    <span className="font-medium text-gray-900">
                      {Math.round(proposalAnalytics.participationMetrics.weightTurnout * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Average vote weight */}
            {votingMechanism !== 'user-based' && proposalAnalytics.votingBreakdown.totalWeight > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Average Vote Weight</span>
                <span className="font-medium text-gray-900">
                  {Math.round((proposalAnalytics.votingBreakdown.totalWeight / proposalAnalytics.votingBreakdown.uniqueVoters) * 100) / 100}
                </span>
              </div>
            )}

            {/* Voting pattern indicator */}
            {proposalAnalytics.participationMetrics?.votingPattern && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Voting Pattern</span>
                <span className={cn(
                  "font-medium capitalize",
                  proposalAnalytics.participationMetrics.votingPattern === 'early' ? "text-green-700" :
                  proposalAnalytics.participationMetrics.votingPattern === 'late' ? "text-orange-700" :
                  "text-blue-700"
                )}>
                  {proposalAnalytics.participationMetrics.votingPattern}
                </span>
              </div>
            )}

            {/* Participation patterns and voting trends */}
            <div className="pt-2 border-t border-gray-50 space-y-2">
              <h6 className="text-xs font-medium text-gray-600">Participation Trends</h6>
              
              {/* Time to quorum information for completed proposals */}
              {proposalStatus.status === 'closed' && proposalAnalytics.participationMetrics?.timeToQuorum && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Time to Quorum</span>
                  <span className="font-medium text-gray-900">
                    {Math.round(proposalAnalytics.participationMetrics.timeToQuorum / 60)} hours
                  </span>
                </div>
              )}

              {/* Voting pattern explanation */}
              {proposalAnalytics.participationMetrics?.votingPattern && (
                <div className="text-xs text-gray-500">
                  {proposalAnalytics.participationMetrics.votingPattern === 'early' && 
                    "Most votes cast in first 25% of voting period"}
                  {proposalAnalytics.participationMetrics.votingPattern === 'late' && 
                    "Most votes cast in final 25% of voting period"}
                  {proposalAnalytics.participationMetrics.votingPattern === 'consistent' && 
                    "Votes distributed evenly throughout voting period"}
                </div>
              )}

              {/* Participation efficiency indicator */}
              {proposalAnalytics.participationMetrics && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Participation Efficiency</span>
                  <span className={cn(
                    "font-medium",
                    proposalAnalytics.participationMetrics.voterTurnout > 0.7 ? "text-green-700" :
                    proposalAnalytics.participationMetrics.voterTurnout > 0.4 ? "text-orange-700" :
                    "text-red-700"
                  )}>
                    {proposalAnalytics.participationMetrics.voterTurnout > 0.7 ? "High" :
                     proposalAnalytics.participationMetrics.voterTurnout > 0.4 ? "Medium" : "Low"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Quorum Progress Indicators */}
        {showQuorumProgress && proposalAnalytics?.quorumStatus ? (
          <div className="pt-2 border-t border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Quorum Progress</span>
              <div className="flex items-center">
                {proposalAnalytics.quorumStatus.achieved ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                    <span className="text-sm text-green-700 font-medium">Achieved</span>
                  </>
                ) : proposalStatus.status === 'active' ? (
                  <>
                    <ClockIcon className="h-4 w-4 text-orange-500 mr-1" />
                    <span className="text-sm text-orange-700 font-medium">Pending</span>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                    <span className="text-sm text-red-700 font-medium">Missed</span>
                  </>
                )}
              </div>
            </div>

            {/* Quorum progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  {proposalAnalytics.quorumStatus.current} / {proposalAnalytics.quorumStatus.required}
                </span>
                <span className="font-medium text-gray-900">
                  {Math.round((proposalAnalytics.quorumStatus.current / proposalAnalytics.quorumStatus.required) * 100)}%
                </span>
              </div>
              
              <Progress 
                value={(proposalAnalytics.quorumStatus.current / proposalAnalytics.quorumStatus.required) * 100}
                className={cn(
                  "h-2",
                  proposalAnalytics.quorumStatus.achieved ? "bg-green-100" : 
                  proposalStatus.status === 'active' ? "bg-orange-100" : "bg-red-100"
                )}
              />
            </div>

            {/* Time-based quorum projections */}
            {proposalStatus.status === 'active' && !proposalAnalytics.quorumStatus.achieved && (
              <div className="text-xs text-gray-600">
                {proposalAnalytics.quorumStatus.projectedCompletion ? (
                  <div className="flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    <span>
                      Projected to reach quorum: {new Date(proposalAnalytics.quorumStatus.projectedCompletion).toLocaleDateString()}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-3 w-3 mr-1 text-orange-500" />
                    <span>Quorum projection unavailable</span>
                  </div>
                )}
              </div>
            )}

            {/* Time to quorum for completed proposals */}
            {proposalStatus.status === 'closed' && proposalAnalytics.participationMetrics?.timeToQuorum && (
              <div className="text-xs text-gray-600">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-3 w-3 mr-1 text-green-500" />
                  <span>
                    Quorum reached in {Math.round(proposalAnalytics.participationMetrics.timeToQuorum / 60)} hours
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Fallback to basic quorum status */
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-sm text-gray-600">Quorum ({proposal.quorum})</span>
            <div className="flex items-center">
              {proposal.quorumReached ? (
                <>
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-700 font-medium">Reached</span>
                </>
              ) : (
                <>
                  <XCircleIcon className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-700 font-medium">Not reached</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render voting options for active proposals
  const renderVotingOptions = () => {
    if (proposalStatus.status !== 'active') return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-900">Voting Options</h4>
        <div className="grid grid-cols-1 gap-2">
          {proposal.options.map((option, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <span className="text-sm text-gray-700">{option}</span>
              <div className="text-xs text-gray-500">
                {proposal.results?.[option]?.count || 0} votes
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render action buttons
  const renderActionButtons = () => {
    return (
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center"
        >
          <EyeIcon className="h-4 w-4 mr-1" />
          View Details
        </Button>

        {proposalStatus.status === 'active' && (
          <div className="flex items-center space-x-2">
            {votingEligibility.canVote ? (
              <Button
                size="sm"
                onClick={() => onVote?.(proposal.id)}
                className="flex items-center"
              >
                <HandRaisedIcon className="h-4 w-4 mr-1" />
                Vote Now
              </Button>
            ) : (
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">{votingEligibility.reason}</div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="flex items-center"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  Cannot Vote
                </Button>
              </div>
            )}
          </div>
        )}

        {proposalStatus.status === 'closed' && (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <ChartBarIcon className="h-3 w-3 mr-1" />
            View Results
          </Badge>
        )}
      </div>
    );
  };

  // Compact version for lists
  if (compact) {
    return (
      <Card className={cn(
        "hover:shadow-md transition-shadow duration-200 cursor-pointer",
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {proposal.title}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                by {formatCreator(proposal.createdBy)}
              </p>
            </div>
            <Badge variant="secondary" className={cn("ml-2", proposalStatus.color)}>
              <proposalStatus.icon className="h-3 w-3 mr-1" />
              {proposalStatus.label}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{proposal.voteCount} votes</span>
            <span className={cn(timeInfo.urgent && "text-orange-600 font-medium")}>
              {timeInfo.text}
            </span>
          </div>

          {votingEligibility.canVote && (
            <Button
              size="sm"
              onClick={() => onVote?.(proposal.id)}
              className="w-full mt-3"
            >
              <HandRaisedIcon className="h-4 w-4 mr-1" />
              Vote Now
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full version
  return (
    <Card className={cn(
      "hover:shadow-lg transition-shadow duration-200",
      className
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight mb-2">
              {proposal.title}
            </CardTitle>
            <CardDescription className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 mr-1" />
                {formatCreator(proposal.createdBy)}
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {new Date(proposal.createdAt).toLocaleDateString()}
              </div>
            </CardDescription>
          </div>
          <Badge variant="secondary" className={cn("ml-4", proposalStatus.color)}>
            <proposalStatus.icon className="h-4 w-4 mr-1" />
            {proposalStatus.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        <div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {proposal.description}
          </p>
        </div>

        {/* Time Information */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <ClockIcon className="h-4 w-4 mr-1" />
            Expires: {new Date(proposal.expiresAt).toLocaleDateString()} at{' '}
            {new Date(proposal.expiresAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
          <span className={cn(
            "font-medium",
            timeInfo.urgent ? "text-orange-600" : "text-gray-600"
          )}>
            {timeInfo.text}
          </span>
        </div>

        {/* Vote Distribution (for closed proposals) or Voting Options (for active) */}
        {proposalStatus.status === 'closed' ? renderVoteDistribution() : renderVotingOptions()}

        {/* Action Buttons */}
        {renderActionButtons()}
      </CardContent>
    </Card>
  );
};

export default ProposalCard;