/**
 * Screen Reader Utilities for DAO Dashboard
 * 
 * Provides utilities for enhancing screen reader support and creating
 * accessible content descriptions for complex data displays.
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Screen reader detection and utilities
 */
export class ScreenReaderUtils {
  /**
   * Detect if a screen reader is likely being used
   */
  static isScreenReaderActive(): boolean {
    // Check for common screen reader indicators
    const hasScreenReaderClass = document.documentElement.classList.contains('sr-active');
    const hasHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Check for NVDA, JAWS, or other screen reader specific indicators
    const userAgent = navigator.userAgent.toLowerCase();
    const hasScreenReaderUA = userAgent.includes('nvda') || 
                              userAgent.includes('jaws') || 
                              userAgent.includes('dragon');

    return hasScreenReaderClass || hasScreenReaderUA || (hasHighContrast && hasReducedMotion);
  }

  /**
   * Create a screen reader only element
   */
  static createScreenReaderOnly(text: string): HTMLElement {
    const element = document.createElement('span');
    element.className = 'sr-only';
    element.textContent = text;
    element.setAttribute('aria-hidden', 'false');
    return element;
  }

  /**
   * Announce text to screen readers
   */
  static announce(text: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = text;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Create detailed description for complex data
   */
  static describeComplexData(data: {
    type: 'table' | 'chart' | 'form' | 'navigation';
    title?: string;
    summary: string;
    details?: string[];
    instructions?: string;
  }): string {
    const { type, title, summary, details = [], instructions } = data;

    let description = '';

    if (title) {
      description += `${title}. `;
    }

    description += `${type.charAt(0).toUpperCase() + type.slice(1)}: ${summary}`;

    if (details.length > 0) {
      description += `. Details: ${details.join(', ')}`;
    }

    if (instructions) {
      description += `. ${instructions}`;
    }

    return description;
  }

  /**
   * Create navigation instructions for complex interfaces
   */
  static createNavigationInstructions(context: {
    type: 'modal' | 'menu' | 'table' | 'form' | 'dashboard';
    shortcuts?: Array<{ key: string; action: string }>;
    navigation?: string[];
  }): string {
    const { type, shortcuts = [], navigation = [] } = context;

    let instructions = '';

    switch (type) {
      case 'modal':
        instructions = 'Modal dialog opened. Press Escape to close.';
        break;
      case 'menu':
        instructions = 'Menu opened. Use arrow keys to navigate, Enter to select, Escape to close.';
        break;
      case 'table':
        instructions = 'Data table. Use arrow keys to navigate cells, Tab to move between interactive elements.';
        break;
      case 'form':
        instructions = 'Form. Use Tab to move between fields, Space or Enter to activate buttons.';
        break;
      case 'dashboard':
        instructions = 'Dashboard interface. Use Tab to navigate between sections, arrow keys within sections.';
        break;
    }

    if (shortcuts.length > 0) {
      const shortcutDescriptions = shortcuts.map(s => `${s.key} for ${s.action}`);
      instructions += ` Keyboard shortcuts: ${shortcutDescriptions.join(', ')}.`;
    }

    if (navigation.length > 0) {
      instructions += ` Navigation: ${navigation.join(', ')}.`;
    }

    return instructions;
  }
}

/**
 * Hook for managing screen reader announcements
 */
export function useScreenReaderAnnouncements() {
  const announcementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Create announcement container
    const container = document.createElement('div');
    container.className = 'sr-only';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
    announcementRef.current = container;

    return () => {
      if (announcementRef.current && document.body.contains(announcementRef.current)) {
        document.body.removeChild(announcementRef.current);
      }
    };
  }, []);

  const announce = useCallback((
    text: string, 
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    if (!announcementRef.current) return;

    announcementRef.current.setAttribute('aria-live', priority);
    announcementRef.current.textContent = text;

    // Clear after announcement
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  return { announce };
}

/**
 * Hook for creating detailed descriptions of DAO components
 */
export function useDAOComponentDescriptions() {
  const describeProposal = useCallback((proposal: {
    title: string;
    status: string;
    voteCount: number;
    quorum: number;
    expiresAt: string;
    options: string[];
  }) => {
    const timeRemaining = new Date(proposal.expiresAt).getTime() - Date.now();
    const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
    
    const timeText = hoursRemaining > 0 
      ? `${hoursRemaining} hours remaining`
      : 'voting has ended';

    return ScreenReaderUtils.describeComplexData({
      type: 'form',
      title: proposal.title,
      summary: `Proposal with ${proposal.voteCount} of ${proposal.quorum} required votes, ${timeText}`,
      details: [
        `Status: ${proposal.status}`,
        `Options: ${proposal.options.join(', ')}`
      ],
      instructions: 'Use Tab to navigate voting options, Space or Enter to select'
    });
  }, []);

  const describeTokenOverview = useCallback((tokenInfo: {
    name: string;
    symbol: string;
    totalSupply: number;
    circulatingSupply: number;
    holderCount: number;
  }) => {
    const supplyPercentage = Math.round((tokenInfo.circulatingSupply / tokenInfo.totalSupply) * 100);

    return ScreenReaderUtils.describeComplexData({
      type: 'chart',
      title: `${tokenInfo.name} Token Overview`,
      summary: `${tokenInfo.symbol} token with ${tokenInfo.holderCount} holders`,
      details: [
        `Total supply: ${tokenInfo.totalSupply.toLocaleString()}`,
        `Circulating: ${tokenInfo.circulatingSupply.toLocaleString()} (${supplyPercentage}%)`,
        `Holders: ${tokenInfo.holderCount.toLocaleString()}`
      ]
    });
  }, []);

  const describeWalletOverview = useCallback((walletData: {
    tokenBalance: number;
    tokenSymbol: string;
    nftCount: number;
    votingPower: number;
  }) => {
    return ScreenReaderUtils.describeComplexData({
      type: 'dashboard',
      title: 'Wallet Overview',
      summary: `Your DAO wallet with ${walletData.tokenBalance} ${walletData.tokenSymbol} tokens and ${walletData.nftCount} NFTs`,
      details: [
        `Token balance: ${walletData.tokenBalance.toLocaleString()} ${walletData.tokenSymbol}`,
        `NFT count: ${walletData.nftCount}`,
        `Voting power: ${walletData.votingPower.toFixed(2)}%`
      ]
    });
  }, []);

  const describeQuickActions = useCallback((actions: Array<{
    label: string;
    description: string;
    enabled: boolean;
    reason?: string;
  }>) => {
    const enabledActions = actions.filter(a => a.enabled);
    const disabledActions = actions.filter(a => !a.enabled);

    let summary = `Quick actions panel with ${enabledActions.length} available actions`;
    
    if (disabledActions.length > 0) {
      summary += ` and ${disabledActions.length} disabled actions`;
    }

    const details = [
      ...enabledActions.map(a => `${a.label}: ${a.description}`),
      ...disabledActions.map(a => `${a.label}: disabled - ${a.reason}`)
    ];

    return ScreenReaderUtils.describeComplexData({
      type: 'navigation',
      title: 'Quick Actions',
      summary,
      details,
      instructions: 'Use Tab to navigate actions, Enter or Space to activate'
    });
  }, []);

  const describeProposalStats = useCallback((stats: {
    quorumReachRate: number;
    averageParticipation: number;
    topProposals: Array<{ title: string; voteCount: number; percentage: number }>;
  }) => {
    const topProposalDescriptions = stats.topProposals.map(p => 
      `${p.title}: ${p.voteCount} votes (${p.percentage}%)`
    );

    return ScreenReaderUtils.describeComplexData({
      type: 'chart',
      title: 'Proposal Statistics',
      summary: `Governance statistics showing ${stats.quorumReachRate}% quorum reach rate and ${stats.averageParticipation} average participation`,
      details: [
        `Quorum reach rate: ${stats.quorumReachRate}%`,
        `Average participation: ${stats.averageParticipation} votes`,
        `Top proposals: ${topProposalDescriptions.join(', ')}`
      ]
    });
  }, []);

  return {
    describeProposal,
    describeTokenOverview,
    describeWalletOverview,
    describeQuickActions,
    describeProposalStats
  };
}

/**
 * Hook for managing focus announcements
 */
export function useFocusAnnouncements() {
  const { announce } = useScreenReaderAnnouncements();

  const announceFocus = useCallback((element: HTMLElement) => {
    const role = element.getAttribute('role');
    const label = element.getAttribute('aria-label') || 
                  element.getAttribute('aria-labelledby') ||
                  element.textContent?.trim();

    if (label) {
      let announcement = label;
      
      if (role) {
        announcement += `, ${role}`;
      }

      // Add state information
      const expanded = element.getAttribute('aria-expanded');
      const selected = element.getAttribute('aria-selected');
      const checked = element.getAttribute('aria-checked');
      const disabled = element.getAttribute('aria-disabled');

      if (expanded === 'true') announcement += ', expanded';
      if (expanded === 'false') announcement += ', collapsed';
      if (selected === 'true') announcement += ', selected';
      if (checked === 'true') announcement += ', checked';
      if (checked === 'false') announcement += ', unchecked';
      if (disabled === 'true') announcement += ', disabled';

      announce(announcement);
    }
  }, [announce]);

  const announceStateChange = useCallback((
    element: HTMLElement, 
    change: string
  ) => {
    const label = element.getAttribute('aria-label') || 
                  element.textContent?.trim() || 
                  'Element';
    
    announce(`${label} ${change}`);
  }, [announce]);

  return {
    announceFocus,
    announceStateChange
  };
}

/**
 * React component for screen reader instructions
 */
import React from 'react';

interface ScreenReaderInstructionsProps {
  instructions: string;
  shortcuts?: Array<{ key: string; action: string }>;
  className?: string;
}

export const ScreenReaderInstructions: React.FC<ScreenReaderInstructionsProps> = ({
  instructions,
  shortcuts = [],
  className = 'sr-only'
}) => {
  const fullInstructions = shortcuts.length > 0
    ? `${instructions} Keyboard shortcuts: ${shortcuts.map(s => `${s.key} for ${s.action}`).join(', ')}.`
    : instructions;

  return (
    <div className={className} aria-hidden="false">
      {fullInstructions}
    </div>
  );
};

/**
 * React component for complex data descriptions
 */
interface DataDescriptionProps {
  data: {
    type: 'table' | 'chart' | 'form' | 'navigation';
    title?: string;
    summary: string;
    details?: string[];
    instructions?: string;
  };
  className?: string;
}

export const DataDescription: React.FC<DataDescriptionProps> = ({
  data,
  className = 'sr-only'
}) => {
  const description = ScreenReaderUtils.describeComplexData(data);

  return (
    <div className={className} aria-hidden="false">
      {description}
    </div>
  );
};

/**
 * React component for status announcements
 */
interface StatusAnnouncementProps {
  message: string;
  priority?: 'polite' | 'assertive';
  className?: string;
}

export const StatusAnnouncement: React.FC<StatusAnnouncementProps> = ({
  message,
  priority = 'polite',
  className = 'sr-only'
}) => {
  return (
    <div 
      className={className}
      aria-live={priority}
      aria-atomic="true"
      aria-hidden="false"
    >
      {message}
    </div>
  );
};

export default {
  ScreenReaderUtils,
  useScreenReaderAnnouncements,
  useDAOComponentDescriptions,
  useFocusAnnouncements,
  ScreenReaderInstructions,
  DataDescription,
  StatusAnnouncement
};