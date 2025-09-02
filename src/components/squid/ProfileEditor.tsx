import React, { useState, useEffect } from 'react';
import { useSessionContext } from '@/contexts/SessionContext';
import ProfileManager from '@/modules/squid/manager';
import { Button, TextField, Box, Typography, CircularProgress, Alert, Paper } from '@mui/material';

export interface ProfileFormData {
  alias: string;
  avatar?: string;
  bio?: string;
}

const ProfileEditor: React.FC = () => {
  const { session, isAuthenticated, setCidProfile } = useSessionContext();
  const [formData, setFormData] = useState<ProfileFormData>({
    alias: '',
    avatar: '',
    bio: ''
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ cid: string } | null>(null);

  // Load existing profile if available
  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated || !session?.issuer) return;
      
      try {
        // TODO: Implement profile loading logic if needed
        // This would involve fetching the profile from IPFS using the user's DID
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    };

    loadProfile();
  }, [isAuthenticated, session]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.alias.trim()) {
      setError('Alias is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Create and sign the profile
      const profile = await ProfileManager.createProfile({
        name: formData.alias,
        avatar: formData.avatar || undefined,
        bio: formData.bio || undefined,
      });

      // 2. Encrypt and upload to IPFS
      const { cid } = await ProfileManager.encryptAndUploadProfile(profile);
      
      // 3. Update the cid_profile in the session context
      setCidProfile(cid);
      
      setSuccess({ cid });
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Profile Editor
        </Typography>
        <Alert severity="info">Please sign in to edit your profile.</Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        {formData.alias ? `Edit ${formData.alias}'s Profile` : 'Create Your Profile'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Box>
            <Box>Profile saved successfully!</Box>
            <Typography variant="caption" component="div" sx={{ mt: 1, wordBreak: 'break-all' }}>
              CID: {success.cid}
            </Typography>
          </Box>
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Alias *"
          name="alias"
          value={formData.alias}
          onChange={handleInputChange}
          margin="normal"
          disabled={isLoading}
          required
        />

        <TextField
          fullWidth
          label="Avatar URL"
          name="avatar"
          value={formData.avatar || ''}
          onChange={handleInputChange}
          margin="normal"
          disabled={isLoading}
          placeholder="https://example.com/avatar.jpg"
        />

        <TextField
          fullWidth
          label="Bio"
          name="bio"
          value={formData.bio || ''}
          onChange={handleInputChange}
          margin="normal"
          multiline
          rows={4}
          disabled={isLoading}
          placeholder="Tell us about yourself..."
        />

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            {isLoading ? 'Saving...' : 'Save Profile'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default ProfileEditor;
