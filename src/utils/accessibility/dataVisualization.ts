/**
 * Accessible Data Visualization Utilities for DAO Dashboard
 * 
 * Provides utilities for creating WCAG 2.1 compliant data visualizations
 * with high contrast colors, alternative text, and screen reader support.
 */

import React, { useState, useEffect, useMemo } from 'react';

// High contrast color schemes for accessibility
export const ACCESSIBLE_COLORS = {
  // Primary color palette with WCAG AA contrast ratios
  primary: {
    blue: '#1e40af',      // 4.5:1 contrast on white
    green: '#166534',     // 4.5:1 contrast on white
    red: '#dc2626',       // 4.5:1 contrast on white
    orange: '#ea580c',    // 4.5:1 contrast on white
    purple: '#7c3aed',    // 4.5:1 contrast on white
    gray: '#374151'       // 4.5:1 contrast on white
  },
  
  // Secondary color palette for backgrounds
  secondary: {
    blue: '#dbeafe',      // Light blue background
    green: '#dcfce7',     // Light green background
    red: '#fee2e2',       // Light red background
    orange: '#fed7aa',    // Light orange background
    purple: '#e9d5ff',    // Light purple background
    gray: '#f3f4f6'       // Light gray background
  },

  // High contrast mode colors
  highContrast: {
    foreground: '#000000',
    background: '#ffffff',
    accent: '#0066cc',
    success: '#008000',
    warning: '#ff8c00',
    error: '#cc0000'
  },

  // Color blind friendly palette
  colorBlindFriendly: {
    blue: '#0173b2',
    orange: '#de8f05',
    green: '#029e73',
    red: '#cc78bc',
    brown: '#ca9161',
    pink: '#fbafe4',
    gray: '#949494',
    yellow: '#ece133'
  }
} as const;

// Pattern definitions for non-color differentiation
export const ACCESSIBLE_PATTERNS = {
  solid: 'none',
  dots: 'url(#dots)',
  stripes: 'url(#stripes)',
  diagonal: 'url(#diagonal)',
  crosshatch: 'url(#crosshatch)'
} as const;

/**
 * Generate accessible color scheme based on user preferences
 */
export function getAccessibleColorScheme(options?: {
  highContrast?: boolean;
  colorBlindFriendly?: boolean;
  darkMode?: boolean;
}): typeof ACCESSIBLE_COLORS.primary {
  const { highContrast = false, colorBlindFriendly = false, darkMode = false } = options || {};

  if (highContrast) {
    return {
      blue: darkMode ? '#66b3ff' : '#003d82',
      green: darkMode ? '#66ff66' : '#004d00',
      red: darkMode ? '#ff6666' : '#990000',
      orange: darkMode ? '#ffaa66' : '#cc4400',
      purple: darkMode ? '#cc99ff' : '#4d0099',
      gray: darkMode ? '#cccccc' : '#1a1a1a'
    };
  }

  if (colorBlindFriendly) {
    return ACCESSIBLE_COLORS.colorBlindFriendly;
  }

  return ACCESSIBLE_COLORS.primary;
}

/**
 * Create SVG pattern definitions for accessibility
 */
export function createSVGPatterns(): string {
  return `
    <defs>
      <pattern id="dots" patternUnits="userSpaceOnUse" width="4" height="4">
        <circle cx="2" cy="2" r="1" fill="currentColor" opacity="0.5"/>
      </pattern>
      <pattern id="stripes" patternUnits="userSpaceOnUse" width="4" height="4">
        <rect width="2" height="4" fill="currentColor" opacity="0.5"/>
      </pattern>
      <pattern id="diagonal" patternUnits="userSpaceOnUse" width="4" height="4">
        <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="currentColor" stroke-width="1" opacity="0.5"/>
      </pattern>
      <pattern id="crosshatch" patternUnits="userSpaceOnUse" width="4" height="4">
        <path d="M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
        <path d="M 0,0 l 4,4 M -1,3 l 2,2 M 3,-1 l 2,2" stroke="currentColor" stroke-width="0.5" opacity="0.5"/>
      </pattern>
    </defs>
  `;
}

/**
 * Generate alternative text for data visualizations
 */
export class DataVisualizationDescriber {
  /**
   * Generate alt text for a progress bar
   */
  static describeProgressBar(value: number, max: number = 100, label?: string): string {
    const percentage = Math.round((value / max) * 100);
    const baseDescription = `${percentage}% progress`;
    
    if (label) {
      return `${label}: ${baseDescription}`;
    }
    
    return baseDescription;
  }

  /**
   * Generate alt text for a pie chart
   */
  static describePieChart(data: Array<{ label: string; value: number; percentage?: number }>): string {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    
    const descriptions = data.map(item => {
      const percentage = item.percentage || Math.round((item.value / total) * 100);
      return `${item.label}: ${percentage}%`;
    });

    return `Pie chart showing: ${descriptions.join(', ')}`;
  }

  /**
   * Generate alt text for a bar chart
   */
  static describeBarChart(data: Array<{ label: string; value: number }>, title?: string): string {
    const maxValue = Math.max(...data.map(item => item.value));
    const minValue = Math.min(...data.map(item => item.value));
    
    const descriptions = data.map(item => {
      return `${item.label}: ${item.value}`;
    });

    const baseDescription = `Bar chart with values ranging from ${minValue} to ${maxValue}. Data: ${descriptions.join(', ')}`;
    
    if (title) {
      return `${title}. ${baseDescription}`;
    }
    
    return baseDescription;
  }

  /**
   * Generate alt text for voting distribution
   */
  static describeVotingDistribution(data: Array<{
    option: string;
    count: number;
    percentage: number;
    isWinning?: boolean;
  }>): string {
    const totalVotes = data.reduce((sum, item) => sum + item.count, 0);
    const winner = data.find(item => item.isWinning);
    
    const descriptions = data.map(item => {
      const winningText = item.isWinning ? ' (winning)' : '';
      return `${item.option}: ${item.count} votes (${item.percentage}%)${winningText}`;
    });

    let baseDescription = `Voting results with ${totalVotes} total votes. ${descriptions.join(', ')}`;
    
    if (winner) {
      baseDescription += `. Leading option: ${winner.option} with ${winner.percentage}% of votes`;
    }
    
    return baseDescription;
  }

  /**
   * Generate alt text for token supply visualization
   */
  static describeTokenSupply(circulating: number, total: number, symbol: string): string {
    const percentage = Math.round((circulating / total) * 100);
    return `Token supply for ${symbol}: ${circulating.toLocaleString()} of ${total.toLocaleString()} tokens in circulation (${percentage}%)`;
  }

  /**
   * Generate alt text for quorum progress
   */
  static describeQuorumProgress(current: number, required: number, achieved: boolean): string {
    const percentage = Math.round((current / required) * 100);
    const status = achieved ? 'achieved' : 'not achieved';
    return `Quorum progress: ${current} of ${required} votes required (${percentage}%). Status: ${status}`;
  }
}

/**
 * Create accessible data table as fallback for complex charts
 */
export function createDataTable(
  data: Array<Record<string, any>>,
  columns: Array<{ key: string; label: string; format?: (value: any) => string }>,
  options?: {
    caption?: string;
    sortable?: boolean;
    className?: string;
  }
): React.ReactElement {
  const { caption, sortable = false, className = '' } = options || {};

  return React.createElement('div', {
    className: `overflow-x-auto ${className}`,
    role: 'region',
    'aria-label': caption || 'Data table'
  }, [
    React.createElement('table', {
      key: 'table',
      className: 'min-w-full divide-y divide-gray-200',
      role: 'table'
    }, [
      caption && React.createElement('caption', {
        key: 'caption',
        className: 'sr-only'
      }, caption),
      
      React.createElement('thead', {
        key: 'thead',
        className: 'bg-gray-50'
      }, [
        React.createElement('tr', { key: 'header-row' }, 
          columns.map((column, index) => 
            React.createElement('th', {
              key: column.key,
              scope: 'col',
              className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
              ...(sortable && {
                tabIndex: 0,
                role: 'columnheader',
                'aria-sort': 'none'
              })
            }, column.label)
          )
        )
      ]),
      
      React.createElement('tbody', {
        key: 'tbody',
        className: 'bg-white divide-y divide-gray-200'
      }, 
        data.map((row, rowIndex) =>
          React.createElement('tr', {
            key: rowIndex,
            className: rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
          },
            columns.map((column, colIndex) => {
              const value = row[column.key];
              const formattedValue = column.format ? column.format(value) : value;
              
              return React.createElement('td', {
                key: `${rowIndex}-${column.key}`,
                className: 'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                ...(colIndex === 0 && { scope: 'row' })
              }, formattedValue);
            })
          )
        )
      )
    ])
  ]);
}

/**
 * Hook for managing accessible data visualization
 */

export function useAccessibleVisualization(options?: {
  highContrast?: boolean;
  colorBlindFriendly?: boolean;
  preferDataTable?: boolean;
}) {
  const [userPreferences, setUserPreferences] = useState({
    highContrast: false,
    colorBlindFriendly: false,
    preferDataTable: false,
    reducedMotion: false
  });

  // Detect user preferences from system settings
  useEffect(() => {
    const detectPreferences = () => {
      const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      
      setUserPreferences(prev => ({
        ...prev,
        highContrast: options?.highContrast ?? highContrast,
        colorBlindFriendly: options?.colorBlindFriendly ?? false,
        preferDataTable: options?.preferDataTable ?? false,
        reducedMotion
      }));
    };

    detectPreferences();

    // Listen for changes in user preferences
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    highContrastQuery.addEventListener('change', detectPreferences);
    reducedMotionQuery.addEventListener('change', detectPreferences);

    return () => {
      highContrastQuery.removeEventListener('change', detectPreferences);
      reducedMotionQuery.removeEventListener('change', detectPreferences);
    };
  }, [options]);

  // Generate accessible color scheme
  const colorScheme = useMemo(() => {
    return getAccessibleColorScheme({
      highContrast: userPreferences.highContrast,
      colorBlindFriendly: userPreferences.colorBlindFriendly
    });
  }, [userPreferences.highContrast, userPreferences.colorBlindFriendly]);

  // Animation preferences
  const animationDuration = userPreferences.reducedMotion ? 0 : 300;

  return {
    userPreferences,
    colorScheme,
    animationDuration,
    shouldShowDataTable: userPreferences.preferDataTable,
    describer: DataVisualizationDescriber
  };
}

/**
 * Utility for creating accessible chart components
 */
export function createAccessibleChart<T extends Record<string, any>>(
  data: T[],
  chartType: 'bar' | 'pie' | 'progress' | 'voting',
  options: {
    title?: string;
    description?: string;
    colorScheme?: Record<string, string>;
    showDataTable?: boolean;
    tableColumns?: Array<{ key: keyof T; label: string; format?: (value: any) => string }>;
  }
) {
  const { title, description, colorScheme, showDataTable = false, tableColumns } = options;

  // Generate appropriate alt text based on chart type
  let altText = '';
  switch (chartType) {
    case 'bar':
      altText = DataVisualizationDescriber.describeBarChart(
        data.map(item => ({ label: String(item.label || item.name), value: Number(item.value) })),
        title
      );
      break;
    case 'pie':
      altText = DataVisualizationDescriber.describePieChart(
        data.map(item => ({ 
          label: String(item.label || item.name), 
          value: Number(item.value),
          percentage: Number(item.percentage)
        }))
      );
      break;
    case 'voting':
      altText = DataVisualizationDescriber.describeVotingDistribution(
        data.map(item => ({
          option: String(item.option || item.label),
          count: Number(item.count || item.value),
          percentage: Number(item.percentage),
          isWinning: Boolean(item.isWinning)
        }))
      );
      break;
  }

  return {
    altText,
    ariaLabel: title || altText,
    ariaDescription: description,
    colorScheme: colorScheme || ACCESSIBLE_COLORS.primary,
    dataTable: showDataTable && tableColumns ? createDataTable(data, tableColumns, {
      caption: title,
      className: 'mt-4'
    }) : null
  };
}

/**
 * React component for accessible progress indicators
 */

interface AccessibleProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  colorScheme?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  colorScheme = 'default',
  size = 'md',
  className = ''
}) => {
  const percentage = Math.round((value / max) * 100);
  const altText = DataVisualizationDescriber.describeProgressBar(value, max, label);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-orange-500',
    error: 'bg-red-500'
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700" id={`progress-label-${label}`}>
            {label}
          </span>
          {showPercentage && (
            <span className="text-sm text-gray-600" aria-label={`${percentage} percent`}>
              {percentage}%
            </span>
          )}
        </div>
      )}
      
      <div 
        className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={altText}
        aria-labelledby={label ? `progress-label-${label}` : undefined}
      >
        <div 
          className={`h-full transition-all duration-300 ease-out ${colorClasses[colorScheme]} rounded-full`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      
      {/* Screen reader only description */}
      <div className="sr-only">
        {altText}
      </div>
    </div>
  );
};

export default {
  ACCESSIBLE_COLORS,
  ACCESSIBLE_PATTERNS,
  getAccessibleColorScheme,
  createSVGPatterns,
  DataVisualizationDescriber,
  createDataTable,
  useAccessibleVisualization,
  createAccessibleChart,
  AccessibleProgress
};