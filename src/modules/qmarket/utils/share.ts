import { QmarketItem } from '../types';

/**
 * Generate a share URL for a Qmarket item
 * @param item The Qmarket item to share
 * @returns The share URL
 */
export function getQmailShareUrl(item: QmarketItem): string {
  const { cid, metadata } = item;
  
  const shareText = [
    `Check out this item on Qmarket: ${metadata.title}`,
    `\n\n${metadata.description || ''}`,
    `\n\nPrice: ${metadata.price > 0 ? `${metadata.price} AQ` : 'Free'}`,
    `\n\nView it here: /qmarket/item/${cid}`
  ].join('');
  
  const params = new URLSearchParams({
    subject: `Qmarket: ${metadata.title}`,
    body: shareText,
  });
  
  return `/qmail/compose?${params.toString()}`;
}

/**
 * Copy a shareable link to the clipboard
 * @param cid The CID of the item to share
 * @returns A promise that resolves when the link is copied
 */
export async function copyShareLink(cid: string): Promise<boolean> {
  try {
    const url = `${window.location.origin}/qmarket/item/${cid}`;
    await navigator.clipboard.writeText(url);
    return true;
  } catch (err) {
    console.error('Failed to copy share link:', err);
    return false;
  }
}

/**
 * Share a Qmarket item using the Web Share API if available
 * @param item The Qmarket item to share
 * @returns A promise that resolves when sharing is complete
 */
export async function shareItem(item: QmarketItem): Promise<boolean> {
  const { cid, metadata } = item;
  
  if (!navigator.share) {
    // Fallback to copying the link
    return copyShareLink(cid);
  }
  
  try {
    await navigator.share({
      title: metadata.title,
      text: metadata.description,
      url: `${window.location.origin}/qmarket/item/${cid}`,
    });
    return true;
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Error sharing item:', err);
    }
    return false;
  }
}
