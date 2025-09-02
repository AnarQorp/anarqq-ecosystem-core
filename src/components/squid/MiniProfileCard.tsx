import React, { useState, useEffect } from 'react';
import { Avatar, Box, Typography, Skeleton, Tooltip, useTheme } from '@mui/material';
import { Verified as VerifiedIcon, Warning as WarningIcon } from '@mui/icons-material';
import Qlock, { Qlock as QlockStatic } from '@/modules/qlock/Qlock';
import ProfileManager from '@/modules/squid/manager';

interface MiniProfileCardProps {
  /** CID of the encrypted profile on IPFS */
  cid: string;
  /** Encryption key as CryptoKey or base64 string */
  encryptionKey: CryptoKey | string;
  /** Optional IPFS gateway URL */
  gatewayUrl?: string;
  /** Optional custom size for the avatar */
  size?: 'small' | 'medium' | 'large';
  /** Optional click handler */
  onClick?: () => void;
  /** Optional class name */
  className?: string;
  /** Whether to show the follow button */
  showFollowButton?: boolean;
}

interface ProfileData {
  alias?: string;
  avatar?: string;
  reputation?: number;
  did?: string;
}

const avatarSizes = {
  small: 32,
  medium: 40,
  large: 48,
} as const;

const MiniProfileCard: React.FC<MiniProfileCardProps> = ({
  cid,
  encryptionKey: encryptionKeyProp,
  gatewayUrl = 'https://ipfs.io/ipfs/',
  size = 'medium',
  onClick,
  className = '',
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const theme = useTheme();
  
  const avatarSize = avatarSizes[size];
  const fontSize = size === 'small' ? 'body2' : size === 'medium' ? 'body1' : 'h6';

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        // Convert encryption key if it's a base64 string
        const key = typeof encryptionKeyProp === 'string'
          ? await QlockStatic.importKey(encryptionKeyProp)
          : encryptionKeyProp;

        // Download the encrypted profile from IPFS
        const response = await fetch(`${gatewayUrl}${cid}`);
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }

        const encryptedData = await response.arrayBuffer();
        
        // Decrypt the profile
        const decryptedData = await QlockStatic.decrypt(new Uint8Array(encryptedData), key);
        const profile = JSON.parse(new TextDecoder().decode(decryptedData));

        // Verify the signature
        const verification = await ProfileManager.verifyProfileSignature(profile);
        if (!verification.isValid) {
          throw new Error('Invalid profile signature');
        }

        if (isMounted) {
          setProfile({
            alias: profile.name,
            avatar: profile.avatar,
            reputation: profile.reputation,
            did: profile.did,
          });
          setError(null);
        }
      } catch (err) {
        console.error('Error loading mini profile:', err);
        if (isMounted) {
          setError('Invalid profile');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [cid, encryptionKeyProp, gatewayUrl]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        alignItems="center" 
        gap={1.5}
        className={className}
        onClick={handleClick}
        sx={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <Skeleton variant="circular" width={avatarSize} height={avatarSize} />
        <Box>
          <Skeleton variant="text" width={100} height={20} />
          <Skeleton variant="text" width={80} height={16} />
        </Box>
      </Box>
    );
  }

  if (error || !profile) {
    return (
      <Box 
        display="flex" 
        alignItems="center" 
        gap={1.5}
        color="text.secondary"
        className={className}
        onClick={handleClick}
        sx={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <Tooltip title={error || 'Profile error'}>
          <Avatar sx={{ width: avatarSize, height: avatarSize, bgcolor: theme.palette.error.light }}>
            <WarningIcon fontSize={size} color="error" />
          </Avatar>
        </Tooltip>
        <Typography variant={fontSize} color="textSecondary">
          {error || 'Invalid profile'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      display="flex" 
      alignItems="center" 
      gap={1.5}
      className={className}
      onClick={handleClick}
      sx={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <Tooltip title={profile.alias || 'Anonymous'}>
        <Box position="relative" display="inline-flex">
          <Avatar 
            src={profile.avatar} 
            alt={profile.alias || 'Profile'}
            sx={{ width: avatarSize, height: avatarSize }}
          >
            {!profile.avatar && (profile.alias?.[0]?.toUpperCase() || '?')}
          </Avatar>
          {profile.reputation !== undefined && profile.reputation > 0 && (
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'background.paper',
                borderRadius: '50%',
                p: 0.25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 1,
              }}
            >
              <VerifiedIcon 
                fontSize={size === 'large' ? 'small' : 'inherit'} 
                color="primary"
                sx={{ 
                  width: size === 'small' ? 12 : 16,
                  height: size === 'small' ? 12 : 16,
                }}
              />
            </Box>
          )}
        </Box>
      </Tooltip>
      
      <Box>
        <Typography 
          variant={fontSize} 
          component="div" 
          fontWeight="medium"
          noWrap
          sx={{ maxWidth: 200 }}
        >
          {profile.alias || 'Anonymous'}
        </Typography>
        
        {profile.reputation !== undefined && (
          <Typography 
            variant="caption" 
            color="textSecondary"
            display="flex"
            alignItems="center"
            gap={0.5}
          >
            {profile.reputation} rep
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default MiniProfileCard;
