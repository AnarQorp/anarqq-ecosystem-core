/**
 * Keyboard Navigation Utilities for DAO Dashboard Components
 * 
 * Provides utilities for implementing WCAG 2.1 compliant keyboard navigation
 * across all interactive elements in the DAO dashboard.
 */

// Keyboard event constants
export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown'
} as const;

// Focus management utilities
export class FocusManager {
  private static focusableSelectors = [
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'a[href]',
    '[tabindex]:not([tabindex="-1"])',
    '[role="button"]:not([disabled])',
    '[role="link"]:not([disabled])',
    '[role="menuitem"]:not([disabled])',
    '[role="tab"]:not([disabled])',
    '[role="option"]:not([disabled])'
  ].join(', ');

  /**
   * Get all focusable elements within a container
   */
  static getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(this.focusableSelectors))
      .filter(element => this.isVisible(element)) as HTMLElement[];
  }

  /**
   * Check if an element is visible and focusable
   */
  static isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           (element as HTMLElement).offsetParent !== null;
  }

  /**
   * Focus the first focusable element in a container
   */
  static focusFirst(container: HTMLElement): boolean {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
      return true;
    }
    return false;
  }

  /**
   * Focus the last focusable element in a container
   */
  static focusLast(container: HTMLElement): boolean {
    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length > 0) {
      focusableElements[focusableElements.length - 1].focus();
      return true;
    }
    return false;
  }

  /**
   * Focus the next focusable element
   */
  static focusNext(container: HTMLElement, currentElement: HTMLElement): boolean {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (currentIndex >= 0 && currentIndex < focusableElements.length - 1) {
      focusableElements[currentIndex + 1].focus();
      return true;
    }
    return false;
  }

  /**
   * Focus the previous focusable element
   */
  static focusPrevious(container: HTMLElement, currentElement: HTMLElement): boolean {
    const focusableElements = this.getFocusableElements(container);
    const currentIndex = focusableElements.indexOf(currentElement);
    
    if (currentIndex > 0) {
      focusableElements[currentIndex - 1].focus();
      return true;
    }
    return false;
  }

  /**
   * Trap focus within a container (for modals, dropdowns, etc.)
   */
  static trapFocus(container: HTMLElement, event: KeyboardEvent): void {
    if (event.key !== KEYBOARD_KEYS.TAB) return;

    const focusableElements = this.getFocusableElements(container);
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Create a focus trap for modal dialogs
   */
  static createFocusTrap(container: HTMLElement): () => void {
    const handleKeyDown = (event: KeyboardEvent) => {
      this.trapFocus(container, event);
    };

    container.addEventListener('keydown', handleKeyDown);
    
    // Focus the first element when trap is created
    this.focusFirst(container);

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }
}

// Keyboard shortcut management
export class KeyboardShortcuts {
  private shortcuts: Map<string, () => void> = new Map();
  private isEnabled = true;

  /**
   * Register a keyboard shortcut
   */
  register(key: string, callback: () => void, modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  }): void {
    const shortcutKey = this.createShortcutKey(key, modifiers);
    this.shortcuts.set(shortcutKey, callback);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(key: string, modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  }): void {
    const shortcutKey = this.createShortcutKey(key, modifiers);
    this.shortcuts.delete(shortcutKey);
  }

  /**
   * Handle keyboard events
   */
  handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return;

    const shortcutKey = this.createShortcutKey(event.key, {
      ctrl: event.ctrlKey,
      alt: event.altKey,
      shift: event.shiftKey,
      meta: event.metaKey
    });

    const callback = this.shortcuts.get(shortcutKey);
    if (callback) {
      event.preventDefault();
      callback();
    }
  };

  /**
   * Enable keyboard shortcuts
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Disable keyboard shortcuts
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Create a unique key for the shortcut
   */
  private createShortcutKey(key: string, modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  }): string {
    const parts = [];
    if (modifiers?.ctrl) parts.push('ctrl');
    if (modifiers?.alt) parts.push('alt');
    if (modifiers?.shift) parts.push('shift');
    if (modifiers?.meta) parts.push('meta');
    parts.push(key.toLowerCase());
    return parts.join('+');
  }
}

// React hooks for keyboard navigation
import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing keyboard navigation within a component
 */
export function useKeyboardNavigation(options?: {
  enabled?: boolean;
  trapFocus?: boolean;
  autoFocus?: boolean;
}) {
  const containerRef = useRef<HTMLElement>(null);
  const { enabled = true, trapFocus = false, autoFocus = false } = options || {};

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled || !containerRef.current) return;

    switch (event.key) {
      case KEYBOARD_KEYS.ARROW_DOWN:
        event.preventDefault();
        FocusManager.focusNext(containerRef.current, event.target as HTMLElement);
        break;
      case KEYBOARD_KEYS.ARROW_UP:
        event.preventDefault();
        FocusManager.focusPrevious(containerRef.current, event.target as HTMLElement);
        break;
      case KEYBOARD_KEYS.HOME:
        event.preventDefault();
        FocusManager.focusFirst(containerRef.current);
        break;
      case KEYBOARD_KEYS.END:
        event.preventDefault();
        FocusManager.focusLast(containerRef.current);
        break;
    }

    if (trapFocus) {
      FocusManager.trapFocus(containerRef.current, event);
    }
  }, [enabled, trapFocus]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('keydown', handleKeyDown);

    if (autoFocus) {
      FocusManager.focusFirst(container);
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown, autoFocus]);

  return {
    containerRef,
    focusFirst: () => containerRef.current && FocusManager.focusFirst(containerRef.current),
    focusLast: () => containerRef.current && FocusManager.focusLast(containerRef.current)
  };
}

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Array<{
  key: string;
  callback: () => void;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  enabled?: boolean;
}>) {
  const shortcutManager = useRef(new KeyboardShortcuts());

  useEffect(() => {
    const manager = shortcutManager.current;

    // Register shortcuts
    shortcuts.forEach(({ key, callback, modifiers, enabled = true }) => {
      if (enabled) {
        manager.register(key, callback, modifiers);
      }
    });

    // Add global event listener
    document.addEventListener('keydown', manager.handleKeyDown);

    return () => {
      // Cleanup
      document.removeEventListener('keydown', manager.handleKeyDown);
      shortcuts.forEach(({ key, modifiers }) => {
        manager.unregister(key, modifiers);
      });
    };
  }, [shortcuts]);

  return {
    enable: () => shortcutManager.current.enable(),
    disable: () => shortcutManager.current.disable()
  };
}

/**
 * Hook for managing focus trap in modals
 */
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const cleanup = FocusManager.createFocusTrap(containerRef.current);
    return cleanup;
  }, [isActive]);

  return containerRef;
}

/**
 * Utility for creating accessible button handlers
 */
export function createAccessibleClickHandler(
  onClick: () => void,
  options?: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
  }
) {
  const { preventDefault = true, stopPropagation = false } = options || {};

  return {
    onClick: (event: React.MouseEvent) => {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      onClick();
    },
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE) {
        if (preventDefault) event.preventDefault();
        if (stopPropagation) event.stopPropagation();
        onClick();
      }
    }
  };
}

/**
 * Utility for creating accessible navigation handlers
 */
export function createNavigationHandlers(options: {
  onNext?: () => void;
  onPrevious?: () => void;
  onFirst?: () => void;
  onLast?: () => void;
  onEscape?: () => void;
}) {
  return {
    onKeyDown: (event: React.KeyboardEvent) => {
      switch (event.key) {
        case KEYBOARD_KEYS.ARROW_DOWN:
        case KEYBOARD_KEYS.ARROW_RIGHT:
          event.preventDefault();
          options.onNext?.();
          break;
        case KEYBOARD_KEYS.ARROW_UP:
        case KEYBOARD_KEYS.ARROW_LEFT:
          event.preventDefault();
          options.onPrevious?.();
          break;
        case KEYBOARD_KEYS.HOME:
          event.preventDefault();
          options.onFirst?.();
          break;
        case KEYBOARD_KEYS.END:
          event.preventDefault();
          options.onLast?.();
          break;
        case KEYBOARD_KEYS.ESCAPE:
          event.preventDefault();
          options.onEscape?.();
          break;
      }
    }
  };
}