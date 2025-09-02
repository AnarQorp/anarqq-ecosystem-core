/**
 * VotingInterface - Interactive voting component for DAO proposals
 * 
 * Provides a comprehensive voting interface for eligible users to cast votes
 * on active DAO proposals with validation, confirmation, and feedback.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useDAO } from '../../composables/useDAO';
import { useSessionContext } from '../../contexts/SessionContext';
import { 
  HandRaisedIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ArrowPathIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { cn } from '../../lib/utils';
import type { Proposal } from '../../composables/useDAO';

interface VotingInterfaceProps {
  proposal: Proposal;
  daoId: string;
  open?: boolean;
  onClose?: () => void;
  className?: string;
}

interface VotingState {
  selectedOption: string | null;
  isSubmitting: boolean;
  hasVoted: boolean;
  voteSubmitted: string | null; // The option that was voted for
  error: string | null;
}

const VotingInterface: React.FC<VotingInterfaceProps> = ({
  proposal,
  daoId,
  open = true,
  onClose,
  className
}) => {
  const { isAuthenticated } = useSessionContext();
  const {
    membership,
    voteOnProposal,
    loading,
    error: daoError,
    clearError
  } = useDAO();

  // Voting state
  const [votingState, setVotingState] = useState<VotingState>({
    selectedOption: null,
    isSubmitting: false,
    hasVoted: false,
    voteSubmitted: null,
    error: null
  });

  // Reset state when proposal changes
  useEffect(() => {
    setVotingState({
      selectedOption: null,
      isSubmitting: false,
      hasVoted: false,
      voteSubmitted: null,
      error: null
    });
    clearError();
  }, [proposal.id, clearError]);

  // Calculate time remaining
  const timeRemaining = useMemo(() => {
    const now = new Date();
    const expiresAt = new Date(proposal.expiresAt);
    const timeLeft = expiresAt.getTime() - now.getTime();
    
    if (timeLeft <= 0) {
      return { text: 'Expired', urgent: true, expired: true };
    }
    
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const daysLeft = Math.floor(hoursLeft / 24);
    
    if (daysLeft > 1) {
      return { text: `${daysLeft} days remaining`, urgent: false, expired: false };
    } else if (hoursLeft > 1) {
      return { text: `${hoursLeft} hours remaining`, urgent: hoursLeft <= 24, expired: false };
    } else {
      const minutesLeft = Math.floor(timeLeft / (1000 * 60));
      return { 
        text: minutesLeft > 0 ? `${minutesLeft} minutes remaining` : 'Expires soon', 
        urgent: true, 
        expired: false 
      };
    }
  }, [proposal.expiresAt]);

  // Check voting eligibility
  const eligibility = useMemo(() => {
    if (!isAuthenticated) {
      return {
        canVote: false,
        reason: 'You must be authenticated to vote',
        details: 'Please sign in with your sQuid identity to participate in governance.'
      };
    }

    if (!membership?.isMember) {
      return {
        canVote: false,
        reason: 'You must be a DAO member to vote',
        details: 'Only DAO members can participate in governance decisions.'
      };
    }

    if (!membership.permissions.canVote) {
      return {
        canVote: false,
        reason: 'You do not have voting permissions',
        details: 'Your current membership level does not include voting rights.'
      };
    }

    if (proposal.status !== 'active') {
      return {
        canVote: false,
        reason: 'This proposal is no longer active',
        details: 'Voting has ended for this proposal.'
      };
    }

    if (timeRemaining.expired) {
      return {
        canVote: false,
        reason: 'Voting period has expired',
        details: 'The deadline for voting on this proposal has passed.'
      };
    }

    // TODO: Check if user has already voted
    // This would require additional backend support
    if (votingState.hasVoted) {
      return {
        canVote: false,
        reason: 'You have already voted on this proposal',
        details: 'Each member can only vote once per proposal.'
      };
    }

    return {
      canVote: true,
      reason: null,
      details: null
    };
  }, [isAuthenticated, membership, proposal.status, timeRemaining.expired, votingState.hasVoted]);

  // Format creator identity
  const formatCreator = (creatorId: string) => {
    if (creatorId.startsWith('did:squid:')) {
      const identifier = creatorId.replace('did:squid:', '');
      return identifier.length > 12 ? `${identifier.slice(0, 6)}...${identifier.slice(-6)}` : identifier;
    }
    return creatorId.length > 20 ? `${creatorId.slice(0, 10)}...${creatorId.slice(-10)}` : creatorId;
  };

  // Handle option selection
  const handleOptionSelect = (option: string) => {
    if (votingState.isSubmitting || votingState.hasVoted) return;
    
    setVotingState(prev => ({
      ...prev,
      selectedOption: option,
      error: null
    }));
  };

  // Handle vote submission
  const handleSubmitVote = async () => {
    if (!votingState.selectedOption || !eligibility.canVote) return;

    setVotingState(prev => ({
      ...prev,
      isSubmitting: true,
      error: null
    }));

    try {
      const voteData = {
        option: votingState.selectedOption,
        signature: `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      const result = await voteOnProposal(daoId, proposal.id, voteData);
      
      if (result) {
        setVotingState(prev => ({
          ...prev,
          isSubmitting: false,
          hasVoted: true,
          voteSubmitted: votingState.selectedOption,
          selectedOption: null
        }));

        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose?.();
        }, 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit vote';
      setVotingState(prev => ({
        ...prev,
        isSubmitting: false,
        error: errorMessage
      }));
    }
  };

  // Handle cancel
  const handleCancel = () => {
    if (votingState.isSubmitting) return;
    onClose?.();
  };

  // Calculate current vote distribution for preview
  const votePreview = useMemo(() => {
    if (!proposal.results) return null;

    const totalVotes = proposal.voteCount || 0;
    return proposal.options.map(option => {
      const result = proposal.results[option] || { count: 0, weight: 0 };
      const percentage = totalVotes > 0 ? (result.count / totalVotes) * 100 : 0;
      
      return {
        option,
        count: result.count,
        percentage: Math.round(percentage * 10) / 10
      };
    });
  }, [proposal.results, proposal.options, proposal.voteCount]);

  // Render eligibility error
  if (!eligibility.canVote) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-2" />
              Cannot Vote
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-medium text-gray-900 mb-2">
                {eligibility.reason}
              </p>
              <p className="text-sm text-gray-600">
                {eligibility.details}
              </p>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleCancel} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Render success state
  if (votingState.hasVoted && votingState.voteSubmitted) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
              Vote Submitted
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4 mb-4">
                <p className="text-lg font-medium text-green-900 mb-2">
                  Your vote has been recorded!
                </p>
                <p className="text-sm text-green-700">
                  You voted for: <span className="font-semibold">{votingState.voteSubmitted}</span>
                </p>
              </div>
              
              <p className="text-sm text-gray-600">
                Your vote has been securely recorded on the blockchain and cannot be changed.
              </p>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleCancel}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Main voting interface
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HandRaisedIcon className="h-6 w-6 text-blue-600 mr-2" />
            Cast Your Vote
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Message */}
          {(votingState.error || daoError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-red-800">{votingState.error || daoError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Proposal Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{proposal.title}</CardTitle>
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
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-4">
                {proposal.description}
              </p>
              
              {/* Time Remaining */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-600">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  Expires: {new Date(proposal.expiresAt).toLocaleDateString()} at{' '}
                  {new Date(proposal.expiresAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <Badge 
                  variant="secondary" 
                  className={cn(
                    timeRemaining.urgent ? "bg-orange-100 text-orange-800" : "bg-blue-100 text-blue-800"
                  )}
                >
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {timeRemaining.text}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Voting Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Your Vote</CardTitle>
              <CardDescription>
                Choose one option below. Your vote will be recorded on the blockchain and cannot be changed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {proposal.options.map((option, index) => (
                  <div
                    key={index}
                    className={cn(
                      "relative flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200",
                      votingState.selectedOption === option
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                      votingState.isSubmitting && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => handleOptionSelect(option)}
                  >
                    <input
                      type="radio"
                      name="vote-option"
                      value={option}
                      checked={votingState.selectedOption === option}
                      onChange={() => handleOptionSelect(option)}
                      disabled={votingState.isSubmitting}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      aria-describedby={`option-${index}-description`}
                    />
                    <div className="ml-3 flex-1">
                      <label 
                        htmlFor={`option-${index}`}
                        className="text-sm font-medium text-gray-900 cursor-pointer"
                      >
                        {option}
                      </label>
                      {votePreview && (
                        <p 
                          id={`option-${index}-description`}
                          className="text-xs text-gray-500 mt-1"
                        >
                          Current: {votePreview[index]?.count || 0} votes ({votePreview[index]?.percentage || 0}%)
                        </p>
                      )}
                    </div>
                    {votingState.selectedOption === option && (
                      <CheckCircleIcon className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Current Vote Distribution Preview */}
          {votePreview && votePreview.some(v => v.count > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center">
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Current Vote Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {votePreview.map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-700">{item.option}</span>
                        <span className="text-gray-500">
                          {item.count} votes ({item.percentage}%)
                        </span>
                      </div>
                      <Progress value={item.percentage} className="h-1" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Total votes: {proposal.voteCount} • Quorum: {proposal.quorum}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={votingState.isSubmitting}
              className="flex items-center"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <Button
              onClick={handleSubmitVote}
              disabled={!votingState.selectedOption || votingState.isSubmitting}
              className="flex items-center min-w-[120px]"
            >
              {votingState.isSubmitting ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <HandRaisedIcon className="h-4 w-4 mr-2" />
                  Submit Vote
                </>
              )}
            </Button>
          </div>

          {/* Voting Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Voting Instructions</p>
                <ul className="space-y-1 text-xs">
                  <li>• Select one option above</li>
                  <li>• Your vote will be recorded on the blockchain</li>
                  <li>• Votes cannot be changed once submitted</li>
                  <li>• Your identity will be verified via sQuid</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VotingInterface;