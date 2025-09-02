/**
 * ARIA Utilities for DAO Dashboard Components
 * 
 * Provides utilities for implementing WCAG 2.1 compliant ARIA labels,
 * descriptions, and roles across all DAO dashboard components.
 */

import { useId, useMemo } from 'react';

// ARIA role constants
export const ARIA_ROLES = {
  // Landmark roles
  BANNER: 'banner',
  MAIN: 'main',
  NAVIGATION: 'navigation',
  COMPLEMENTARY: 'complementary',
  CONTENTINFO: 'contentinfo',
  REGION: 'region',
  
  // Widget roles
  BUTTON: 'button',
  LINK: 'link',
  MENUITEM: 'menuitem',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  OPTION: 'option',
  LISTBOX: 'listbox',
  COMBOBOX: 'combobox',
  TEXTBOX: 'textbox',
  PROGRESSBAR: 'progressbar',
  SLIDER: 'slider',
  SPINBUTTON: 'spinbutton',
  
  // Structure roles
  LIST: 'list',
  LISTITEM: 'listitem',
  TABLE: 'table',
  ROW: 'row',
  CELL: 'cell',
  COLUMNHEADER: 'columnheader',
  ROWHEADER: 'rowheader',
  
  // Live region roles
  ALERT: 'alert',
  ALERTDIALOG: 'alertdialog',
  STATUS: 'status',
  LOG: 'log',
  
  // Dialog roles
  DIALOG: 'dialog',
  MODAL: 'dialog'
} as const;

// ARIA properties and states
export const ARIA_PROPERTIES = {
  // Properties
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  DESCRIBEDBY: 'aria-describedby',
  REQUIRED: 'aria-required',
  INVALID: 'aria-invalid',
  READONLY: 'aria-readonly',
  DISABLED: 'aria-disabled',
  HIDDEN: 'aria-hidden',
  
  // States
  EXPANDED: 'aria-expanded',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  PRESSED: 'aria-pressed',
  CURRENT: 'aria-current',
  
  // Live regions
  LIVE: 'aria-live',
  ATOMIC: 'aria-atomic',
  RELEVANT: 'aria-relevant',
  
  // Relationships
  OWNS: 'aria-owns',
  CONTROLS: 'aria-controls',
  ACTIVEDESCENDANT: 'aria-activedescendant',
  
  // Values
  VALUENOW: 'aria-valuenow',
  VALUEMIN: 'aria-valuemin',
  VALUEMAX: 'aria-valuemax',
  VALUETEXT: 'aria-valuetext'
} as const;

/**
 * Generate unique IDs for ARIA relationships
 */
export function useAriaIds(prefix: string, count: number = 1): string[] {
  const baseId = useId();
  
  return useMemo(() => {
    return Array.from({ length: count }, (_, index) => 
      `${prefix}-${baseId}-${index}`
    );
  }, [prefix, baseId, count]);
}

/**
 * Create ARIA attributes for form fields
 */
export function createFormFieldAria(options: {
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  invalid?: boolean;
  readonly?: boolean;
  disabled?: boolean;
}) {
  const {
    label,
    description,
    error,
    required = false,
    invalid = false,
    readonly = false,
    disabled = false
  } = options;

  const [labelId, descriptionId, errorId] = useAriaIds('form-field', 3);

  const ariaAttributes: Record<string, any> = {};

  if (label) {
    ariaAttributes[ARIA_PROPERTIES.LABEL] = label;
  }

  if (description) {
    ariaAttributes[ARIA_PROPERTIES.DESCRIBEDBY] = descriptionId;
  }

  if (error) {
    ariaAttributes[ARIA_PROPERTIES.DESCRIBEDBY] = error 
      ? `${ariaAttributes[ARIA_PROPERTIES.DESCRIBEDBY] || ''} ${errorId}`.trim()
      : ariaAttributes[ARIA_PROPERTIES.DESCRIBEDBY];
    ariaAttributes[ARIA_PROPERTIES.INVALID] = 'true';
  } else if (invalid) {
    ariaAttributes[ARIA_PROPERTIES.INVALID] = 'true';
  }

  if (required) {
    ariaAttributes[ARIA_PROPERTIES.REQUIRED] = 'true';
  }

  if (readonly) {
    ariaAttributes[ARIA_PROPERTIES.READONLY] = 'true';
  }

  if (disabled) {
    ariaAttributes[ARIA_PROPERTIES.DISABLED] = 'true';
  }

  return {
    fieldAttributes: ariaAttributes,
    labelId,
    descriptionId,
    errorId
  };
}

/**
 * Create ARIA attributes for buttons
 */
export function createButtonAria(options: {
  label?: string;
  description?: string;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  disabled?: boolean;
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
}) {
  const {
    label,
    description,
    pressed,
    expanded,
    controls,
    disabled = false,
    current
  } = options;

  const ariaAttributes: Record<string, any> = {
    role: ARIA_ROLES.BUTTON
  };

  if (label) {
    ariaAttributes[ARIA_PROPERTIES.LABEL] = label;
  }

  if (description) {
    const [descriptionId] = useAriaIds('button-desc', 1);
    ariaAttributes[ARIA_PROPERTIES.DESCRIBEDBY] = descriptionId;
  }

  if (typeof pressed === 'boolean') {
    ariaAttributes[ARIA_PROPERTIES.PRESSED] = pressed.toString();
  }

  if (typeof expanded === 'boolean') {
    ariaAttributes[ARIA_PROPERTIES.EXPANDED] = expanded.toString();
  }

  if (controls) {
    ariaAttributes[ARIA_PROPERTIES.CONTROLS] = controls;
  }

  if (disabled) {
    ariaAttributes[ARIA_PROPERTIES.DISABLED] = 'true';
  }

  if (current) {
    ariaAttributes[ARIA_PROPERTIES.CURRENT] = current === true ? 'true' : current;
  }

  return ariaAttributes;
}

/**
 * Create ARIA attributes for progress indicators
 */
export function createProgressAria(options: {
  label?: string;
  description?: string;
  value: number;
  min?: number;
  max?: number;
  valueText?: string;
}) {
  const {
    label,
    description,
    value,
    min = 0,
    max = 100,
    valueText
  } = options;

  const [labelId, descriptionId] = useAriaIds('progress', 2);

  const ariaAttributes: Record<string, any> = {
    role: ARIA_ROLES.PROGRESSBAR,
    [ARIA_PROPERTIES.VALUENOW]: value,
    [ARIA_PROPERTIES.VALUEMIN]: min,
    [ARIA_PROPERTIES.VALUEMAX]: max
  };

  if (label) {
    ariaAttributes[ARIA_PROPERTIES.LABELLEDBY] = labelId;
  }

  if (description) {
    ariaAttributes[ARIA_PROPERTIES.DESCRIBEDBY] = descriptionId;
  }

  if (valueText) {
    ariaAttributes[ARIA_PROPERTIES.VALUETEXT] = valueText;
  }

  return {
    progressAttributes: ariaAttributes,
    labelId,
    descriptionId
  };
}

/**
 * Create ARIA attributes for data tables
 */
export function createTableAria(options: {
  caption?: string;
  summary?: string;
  sortable?: boolean;
  rowCount?: number;
  columnCount?: number;
}) {
  const {
    caption,
    summary,
    sortable = false,
    rowCount,
    columnCount
  } = options;

  const [captionId, summaryId] = useAriaIds('table', 2);

  const tableAttributes: Record<string, any> = {
    role: ARIA_ROLES.TABLE
  };

  if (caption) {
    tableAttributes[ARIA_PROPERTIES.LABELLEDBY] = captionId;
  }

  if (summary) {
    tableAttributes[ARIA_PROPERTIES.DESCRIBEDBY] = summaryId;
  }

  if (rowCount !== undefined) {
    tableAttributes['aria-rowcount'] = rowCount;
  }

  if (columnCount !== undefined) {
    tableAttributes['aria-colcount'] = columnCount;
  }

  const headerAttributes = sortable ? {
    role: ARIA_ROLES.COLUMNHEADER,
    tabIndex: 0,
    'aria-sort': 'none' as const
  } : {
    role: ARIA_ROLES.COLUMNHEADER
  };

  return {
    tableAttributes,
    headerAttributes,
    captionId,
    summaryId
  };
}

/**
 * Create ARIA attributes for modal dialogs
 */
export function createModalAria(options: {
  title?: string;
  description?: string;
  modal?: boolean;
}) {
  const {
    title,
    description,
    modal = true
  } = options;

  const [titleId, descriptionId] = useAriaIds('modal', 2);

  const modalAttributes: Record<string, any> = {
    role: modal ? ARIA_ROLES.MODAL : ARIA_ROLES.DIALOG,
    'aria-modal': modal.toString()
  };

  if (title) {
    modalAttributes[ARIA_PROPERTIES.LABELLEDBY] = titleId;
  }

  if (description) {
    modalAttributes[ARIA_PROPERTIES.DESCRIBEDBY] = descriptionId;
  }

  return {
    modalAttributes,
    titleId,
    descriptionId
  };
}

/**
 * Create ARIA attributes for live regions
 */
export function createLiveRegionAria(options: {
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  label?: string;
}) {
  const {
    politeness = 'polite',
    atomic = false,
    relevant = 'additions text',
    label
  } = options;

  const ariaAttributes: Record<string, any> = {
    [ARIA_PROPERTIES.LIVE]: politeness,
    [ARIA_PROPERTIES.ATOMIC]: atomic.toString(),
    [ARIA_PROPERTIES.RELEVANT]: relevant
  };

  if (label) {
    ariaAttributes[ARIA_PROPERTIES.LABEL] = label;
  }

  return ariaAttributes;
}

/**
 * Create ARIA attributes for navigation menus
 */
export function createNavigationAria(options: {
  label?: string;
  current?: string;
  expanded?: boolean;
  hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}) {
  const {
    label,
    current,
    expanded,
    hasPopup
  } = options;

  const navAttributes: Record<string, any> = {
    role: ARIA_ROLES.NAVIGATION
  };

  if (label) {
    navAttributes[ARIA_PROPERTIES.LABEL] = label;
  }

  const itemAttributes: Record<string, any> = {};

  if (current) {
    itemAttributes[ARIA_PROPERTIES.CURRENT] = current;
  }

  if (typeof expanded === 'boolean') {
    itemAttributes[ARIA_PROPERTIES.EXPANDED] = expanded.toString();
  }

  if (hasPopup) {
    itemAttributes['aria-haspopup'] = hasPopup === true ? 'true' : hasPopup;
  }

  return {
    navAttributes,
    itemAttributes
  };
}

/**
 * Create ARIA attributes for voting interfaces
 */
export function createVotingAria(options: {
  proposalTitle: string;
  optionCount: number;
  selectedOption?: string;
  votingStatus: 'active' | 'closed' | 'pending';
  quorumStatus?: 'achieved' | 'pending' | 'missed';
}) {
  const {
    proposalTitle,
    optionCount,
    selectedOption,
    votingStatus,
    quorumStatus
  } = options;

  const [groupId, statusId] = useAriaIds('voting', 2);

  const groupAttributes: Record<string, any> = {
    role: 'radiogroup',
    [ARIA_PROPERTIES.LABELLEDBY]: groupId,
    [ARIA_PROPERTIES.DESCRIBEDBY]: statusId
  };

  const optionAttributes = (optionText: string, index: number) => ({
    role: 'radio',
    [ARIA_PROPERTIES.CHECKED]: (selectedOption === optionText).toString(),
    [ARIA_PROPERTIES.DISABLED]: (votingStatus !== 'active').toString(),
    'aria-posinset': index + 1,
    'aria-setsize': optionCount
  });

  const statusText = `Voting status: ${votingStatus}${quorumStatus ? `, quorum ${quorumStatus}` : ''}`;

  return {
    groupAttributes,
    optionAttributes,
    groupId,
    statusId,
    statusText
  };
}

/**
 * Create ARIA attributes for token/NFT displays
 */
export function createTokenDisplayAria(options: {
  tokenName: string;
  tokenSymbol: string;
  balance?: number;
  type: 'token' | 'nft';
  interactive?: boolean;
}) {
  const {
    tokenName,
    tokenSymbol,
    balance,
    type,
    interactive = false
  } = options;

  const [labelId, descriptionId] = useAriaIds('token', 2);

  const containerAttributes: Record<string, any> = {
    role: interactive ? ARIA_ROLES.BUTTON : ARIA_ROLES.REGION,
    [ARIA_PROPERTIES.LABELLEDBY]: labelId,
    [ARIA_PROPERTIES.DESCRIBEDBY]: descriptionId
  };

  if (interactive) {
    containerAttributes.tabIndex = 0;
  }

  const labelText = `${tokenName} (${tokenSymbol})`;
  const descriptionText = type === 'token' 
    ? `Token balance: ${balance?.toLocaleString() || 0}`
    : `NFT collection`;

  return {
    containerAttributes,
    labelId,
    descriptionId,
    labelText,
    descriptionText
  };
}

/**
 * Hook for managing ARIA announcements
 */
export function useAriaAnnouncements() {
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    message: string;
    politeness: 'polite' | 'assertive';
    timestamp: number;
  }>>([]);

  const announce = useCallback((
    message: string, 
    politeness: 'polite' | 'assertive' = 'polite'
  ) => {
    const id = `announcement-${Date.now()}-${Math.random()}`;
    const announcement = {
      id,
      message,
      politeness,
      timestamp: Date.now()
    };

    setAnnouncements(prev => [...prev, announcement]);

    // Remove announcement after it's been read
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }, 1000);
  }, []);

  const clearAnnouncements = useCallback(() => {
    setAnnouncements([]);
  }, []);

  return {
    announcements,
    announce,
    clearAnnouncements
  };
}

/**
 * React component for ARIA live regions
 */
import React, { useState, useCallback } from 'react';

interface AriaLiveRegionProps {
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  relevant?: 'additions' | 'removals' | 'text' | 'all';
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export const AriaLiveRegion: React.FC<AriaLiveRegionProps> = ({
  politeness = 'polite',
  atomic = false,
  relevant = 'additions text',
  label,
  className = 'sr-only',
  children
}) => {
  const liveRegionAttributes = createLiveRegionAria({
    politeness,
    atomic,
    relevant,
    label
  });

  return (
    <div className={className} {...liveRegionAttributes}>
      {children}
    </div>
  );
};

export default {
  ARIA_ROLES,
  ARIA_PROPERTIES,
  useAriaIds,
  createFormFieldAria,
  createButtonAria,
  createProgressAria,
  createTableAria,
  createModalAria,
  createLiveRegionAria,
  createNavigationAria,
  createVotingAria,
  createTokenDisplayAria,
  useAriaAnnouncements,
  AriaLiveRegion
};