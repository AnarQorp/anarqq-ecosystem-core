/**
 * Accessibility Utilities Index
 * 
 * Central export point for all accessibility utilities used in the DAO Dashboard
 */

// Keyboard navigation utilities
export {
  KEYBOARD_KEYS,
  FocusManager,
  KeyboardShortcuts,
  useKeyboardNavigation,
  useKeyboardShortcuts,
  useFocusTrap,
  createAccessibleClickHandler,
  createNavigationHandlers
} from './keyboardNavigation';

// Data visualization accessibility
export {
  ACCESSIBLE_COLORS,
  ACCESSIBLE_PATTERNS,
  getAccessibleColorScheme,
  createSVGPatterns,
  DataVisualizationDescriber,
  createDataTable,
  useAccessibleVisualization,
  createAccessibleChart,
  AccessibleProgress
} from './dataVisualization';

// ARIA utilities
export {
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
} from './ariaUtils';

// Screen reader utilities
export {
  ScreenReaderUtils,
  useScreenReaderAnnouncements,
  useDAOComponentDescriptions,
  useFocusAnnouncements,
  ScreenReaderInstructions,
  DataDescription,
  StatusAnnouncement
} from './screenReader';