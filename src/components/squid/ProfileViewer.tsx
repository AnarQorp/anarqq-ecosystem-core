import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Avatar, Paper, Alert } from '@mui/material';
import Qlock, { Qlock as QlockStatic } from '@/modules/qlock/Qlock';
import ProfileManager from '@/modules/squid/manager';

interface ProfileViewerProps {
  /** CID of the encrypted profile on IPFS */
  cid: string;
  /** Encryption key as CryptoKey or base64 string */
  encryptionKey: CryptoKey | string;
  /** Optional custom IPFS gateway URL */
  gatewayUrl?: string;
}

interface ProfileViewerState {
  loading: boolean;
  error: string | null;
  profile: {
    alias?: string;
    avatar?: string;
    bio?: string;
    reputation?: number;
    did?: string;
    createdAt?: string;
  } | null;
}

const ProfileViewer: React.FC<ProfileViewerProps> = ({ 
  cid, 
  encryptionKey: encryptionKeyProp,
  gatewayUrl = 'https://ipfs.io/ipfs/'
}) => {
  const [state, setState] = useState<ProfileViewerState>({
    loading: true,
    error: null,
    profile: null
  });

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
          throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }

        const encryptedData = await response.arrayBuffer();
        
        // Decrypt the profile
        const decryptedData = await QlockStatic.decrypt(new Uint8Array(encryptedData), key);
        const profile = JSON.parse(new TextDecoder().decode(decryptedData));

        // Verify the signature
        const verification = await ProfileManager.verifyProfileSignature(profile);
        if (!verification.isValid) {
          throw new Error(verification.error || 'Invalid profile signature');
        }

        if (isMounted) {
          setState({
            loading: false,
            error: null,
            profile: {
              alias: profile.name,
              avatar: profile.avatar,
              bio: profile.bio,
              reputation: profile.reputation,
              did: profile.did,
              createdAt: profile.createdAt
            }
          });
        }
      } catch (err) {
        console.error('Error loading profile:', err);
        if (isMounted) {
          setState({
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load profile',
            profile: null
          });
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [cid, encryptionKeyProp, gatewayUrl]);

  const { loading, error, profile } = state;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Error loading profile: {error}
      </Alert>
    );
  }

  if (!profile) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No profile data available
      </Alert>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', my: 4 }}>
      <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
        {profile.avatar ? (
          <Avatar 
            src={profile.avatar} 
            alt={profile.alias || 'Profile'} 
            sx={{ width: 100, height: 100, mb: 2 }}
          />
        ) : (
          <Avatar sx={{ width: 100, height: 100, mb: 2 }}>
            {profile.alias?.[0]?.toUpperCase() || '?'}
          </Avatar>
        )}
        
        <Typography variant="h4" component="h1" gutterBottom>
          {profile.alias || 'Anonymous'}
        </Typography>
        
        {profile.did && (
          <Typography variant="caption" color="textSecondary" gutterBottom>
            {profile.did}
          </Typography>
        )}
      </Box>

      {profile.bio && (
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            About
          </Typography>
          <Typography variant="body1" paragraph>
            {profile.bio}
          </Typography>
        </Box>
      )}

      {profile.reputation !== undefined && (
        <Box display="flex" alignItems="center" mb={3}>
          <Typography variant="subtitle1" color="textSecondary">
            Reputation: {profile.reputation}
          </Typography>
        </Box>
      )}

      {profile.createdAt && (
        <Typography variant="caption" color="textSecondary" display="block" textAlign="right">
          Member since {new Date(profile.createdAt).toLocaleDateString()}
        </Typography>
      )}
    </Paper>
  );
};

export default ProfileViewer;
