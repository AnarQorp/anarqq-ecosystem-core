
/**
 * Date formatting utilities
 */

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleString();
}

/**
 * Format a date to a short string (MM/DD/YYYY)
 */
export function formatShortDate(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString();
}

/**
 * Format a date to time only (HH:MM)
 */
export function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format relative time (5 minutes ago, 2 hours ago, etc.)
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  
  // Convert to seconds
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) {
    return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
  }
  
  // Convert to minutes
  const diffMins = Math.floor(diffSecs / 60);
  
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }
  
  // Convert to hours
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  
  // Convert to days
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  
  // Convert to months
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  }
  
  // Convert to years
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
}

/**
 * Format time ago in a compact format (1m, 2h, 3d, etc.)
 */
export function formatTimeAgo(date: Date | string | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  
  // Convert to seconds
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) {
    return 'now';
  }
  
  // Convert to minutes
  const diffMins = Math.floor(diffSecs / 60);
  
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  
  // Convert to hours
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  
  // Convert to days
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays < 30) {
    return `${diffDays}d`;
  }
  
  // Convert to months
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMonths < 12) {
    return `${diffMonths}mo`;
  }
  
  // Convert to years
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears}y`;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string | number): boolean {
  const d = new Date(date);
  const today = new Date();
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear();
}

/**
 * Format a date including relative indicators ("Today", "Yesterday")
 */
export function formatDateWithRelative(date: Date | string | number): string {
  const d = new Date(date);
  
  if (isToday(d)) {
    return `Today, ${formatTime(d)}`;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear()) {
    return `Yesterday, ${formatTime(d)}`;
  }
  
  return formatDate(d);
}
