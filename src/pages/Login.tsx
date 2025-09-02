
/**
 * sQuid users login page with real IPFS search
 * Decentralized authentication system with Storacha space verification
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, User, Lock, LogIn, UserPlus, Globe } from 'lucide-react';
import { useIdentityStore } from '@/state/identity';
import { useToast } from '@/hooks/use-toast';
import { loginUser } from '@/utils/squid/squidAuthService';

export default function Login() {
  const navigate = useNavigate();
  const { setActiveIdentity } = useIdentityStore();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    alias: '',
    password: ''
  });
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.alias.trim()) {
      newErrors.alias = 'Alias is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoggingIn(true);
    
    try {
      console.log('[Login] Starting authentication with real IPFS...');
      
      const result = await loginUser(formData.alias, formData.password);
      
      if (result.success && result.identity) {
        setActiveIdentity(result.identity);
        
        toast({
          title: "¡Welcome back!",
          description: `Session started as ${result.identity.name}`,
        });

        // Show recovered space information
        if (result.spaceDID) {
          console.log(`[Login] Storacha space connected: ${result.spaceDID}`);
          toast({
            title: "IPFS space connected",
            description: `Your decentralized space is active: ${result.spaceDID.slice(0, 20)}...`,
          });
        }
        
        navigate('/');
        
      } else {
        toast({
          title: "Authentication error",
          description: result.error || "Incorrect credentials or your space doesn't exist in real IPFS.",
          variant: "destructive"
        });
      }
      
    } catch (error) {
      console.error('[Login] Unexpected error:', error);
      toast({
        title: "Error",
        description: `IPFS connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center">
            <Shield className="h-12 w-12 text-purple-400 mr-3" />
            <h1 className="text-3xl font-bold text-white">sQuid</h1>
          </div>
          <p className="text-slate-300">Access your decentralized identity</p>
          <div className="flex items-center justify-center gap-2 text-xs text-purple-300">
            <Globe className="h-4 w-4" />
            <span>Connecting via Real IPFS</span>
          </div>
        </div>

        {/* Login form */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <LogIn className="h-5 w-5 mr-2" />
              Sign In
            </CardTitle>
            <CardDescription className="text-slate-400">
              Connect with your sovereign identity stored on IPFS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Alias */}
            <div className="space-y-2">
              <Label htmlFor="alias" className="text-slate-300">User alias</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="alias"
                  type="text"
                  placeholder="your_alias"
                  value={formData.alias}
                  onChange={(e) => handleInputChange('alias', e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                  disabled={isLoggingIn}
                />
              </div>
              {errors.alias && (
                <p className="text-xs text-red-400">{errors.alias}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                  disabled={isLoggingIn}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Security information */}
            <Alert className="bg-slate-700 border-slate-600">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-slate-300 text-sm">
                <strong>Decentralized authentication:</strong><br/>
                • Your identity is searched on the IPFS network<br/>
                • Access is verified with your Storacha space<br/>
                • No central servers or traditional databases
              </AlertDescription>
            </Alert>

            {/* Login button */}
            <Button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isLoggingIn ? (
                'Searching on IPFS...'
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Access the ecosystem
                </>
              )}
            </Button>

            {/* Link to registration */}
            <div className="text-center">
              <p className="text-slate-400 text-sm">
                Don't have an account?{' '}
                <Link 
                  to="/register" 
                  className="text-purple-400 hover:text-purple-300 underline"
                >
                  Register here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          <p>sQuid decentralized identity system</p>
          <p>AnarQ&Q Ecosystem - Privacy and Digital Sovereignty</p>
          <p className="text-purple-400 mt-1">Powered by Storacha & IPFS</p>
        </div>
      </div>
    </div>
  );
}
