/**
 * Qmail Service
 * 
 * This service provides functionality for sharing files via Qmail,
 * including generating shareable links and opening Qmail compose with pre-filled data.
 */

/**
 * Generates a shareable URL for a file
 * 
 * @param options - The file details and sharing options
 * @returns A shareable URL for the file
 */
export function getQmailShareUrl(options: {
  cid: string;
  name: string;
  type: string;
  isEncrypted?: boolean;
  fileHash?: string;
}): string {
  const { cid, name, type, isEncrypted, fileHash } = options;
  const baseUrl = `${window.location.origin}/share/file`;
  
  const params = new URLSearchParams({
    cid,
    name: encodeURIComponent(name),
    type: encodeURIComponent(type),
    ...(isEncrypted && { encrypted: 'true' }),
    ...(fileHash && { hash: fileHash }),
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Opens Qmail compose with pre-filled data for sharing a file
 * 
 * @param options - The file details and sharing options
 * @param subject - Optional subject for the email (defaults to "Sharing: [filename]")
 * @param body - Optional body for the email
 */
export function shareViaQmail(
  options: {
    cid: string;
    name: string;
    type: string;
    isEncrypted?: boolean;
    fileHash?: string;
  },
  subject?: string,
  body?: string
) {
  const shareUrl = getQmailShareUrl(options);
  const defaultSubject = `Sharing: ${options.name}`;
  const defaultBody = `Check out this file: ${shareUrl}`;
  
  // Open Qmail compose with pre-filled data
  window.open(
    `/qmail/compose?` +
    `subject=${encodeURIComponent(subject || defaultSubject)}&` +
    `body=${encodeURIComponent(body || defaultBody)}`,
    '_blank'
  );
}

/**
 * Copies a shareable link to the clipboard
 * 
 * @param options - The file details and sharing options
 * @returns A promise that resolves when the link has been copied
 */
export async function copyShareLink(
  options: {
    cid: string;
    name: string;
    type: string;
    isEncrypted?: boolean;
    fileHash?: string;
  }
): Promise<boolean> {
  try {
    const shareUrl = getQmailShareUrl(options);
    await navigator.clipboard.writeText(shareUrl);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}
