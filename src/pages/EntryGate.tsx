/**
 * EntryGate - Clean landing page for AnarQ & Q ecosystem
 * Detects active sQuid session and redirects accordingly
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import TestTailwind from '@/components/TestTailwind';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Mail, 
  MessageCircle, 
  FolderOpen, 
  Image, 
  Wallet, 
  Settings,
  ArrowRight,
  Globe,
  Lock,
  User,
  UserPlus
} from 'lucide-react';
import { useIdentityStore } from '@/state/identity';

export default function EntryGate() {
  const navigate = useNavigate();
  const { activeIdentity, isAuthenticated, initializeFromStorage } = useIdentityStore();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from storage on mount
  useEffect(() => {
    const initializeSession = async () => {
      await initializeFromStorage();
      setIsLoading(false);
    };
    
    initializeSession();
  }, [initializeFromStorage]);

  // Redirect authenticated users to home
  useEffect(() => {
    if (!isLoading && isAuthenticated && activeIdentity) {
      console.log('[EntryGate] Active identity detected:', activeIdentity.name);
      navigate('/home');
    }
  }, [isLoading, isAuthenticated, activeIdentity, navigate]);

  const modules = [
    {
      id: 'qmail',
      name: 'QMail',
      description: 'Encrypted decentralized messaging',
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'qchat',
      name: 'QChat',
      description: 'Real-time P2P chat',
      icon: MessageCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      id: 'qdrive',
      name: 'QDrive',
      description: 'Decentralized file storage',
      icon: FolderOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      id: 'qpic',
      name: 'QPic',
      description: 'Encrypted image sharing',
      icon: Image,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50'
    },
    {
      id: 'qwallet',
      name: 'QWallet',
      description: 'Digital identity wallet',
      icon: Wallet,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    {
      id: 'qonsent',
      name: 'Qonsent',
      description: 'Privacy permissions manager',
      icon: Settings,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-purple-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading AnarQ & Q...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <TestTailwind />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-slate-900">AnarQ & Q</h1>
              <p className="text-slate-600">Decentralized Ecosystem</p>
            </div>
          </div>
          
          <p className="text-xl text-slate-700 mb-4 max-w-2xl mx-auto">
            Sovereign communication platform built on IPFS with quantum-resistant encryption
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-purple-600">
            <Globe className="h-4 w-4" />
            <span>Powered by Storacha & Real IPFS</span>
          </div>
        </div>

        {/* Authentication Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <User className="h-5 w-5" />
                Access Your Sovereign Identity
              </CardTitle>
              <CardDescription>
                Connect with your decentralized identity stored on IPFS to access all modules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* New Identity */}
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto">
                    <UserPlus className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Create New Identity</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Register a new sovereign identity with your own IPFS space
                    </p>
                    <Link to="/register">
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        Register
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Existing Identity */}
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                    <Shield className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 mb-2">Access Existing Identity</h3>
                    <p className="text-sm text-slate-600 mb-4">
                      Connect with your registered identity from IPFS
                    </p>
                    <Link to="/login">
                      <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modules Showcase */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-8">
            Ecosystem Modules
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {modules.map((module) => (
              <Card key={module.id} className="hover:shadow-lg transition-all duration-200 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg ${module.bgColor} flex items-center justify-center mb-3`}>
                    <module.icon className={`h-6 w-6 ${module.color}`} />
                  </div>
                  <CardTitle className="flex items-center gap-2">
                    {module.name}
                    <Lock className="h-4 w-4 text-slate-400" />
                  </CardTitle>
                  <CardDescription>
                    {module.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline" className="text-xs">
                    Requires Authentication
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Features Information */}
        <div className="max-w-4xl mx-auto">
          <Alert className="bg-white/80 backdrop-blur-sm border-slate-200">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-medium text-slate-800">Why AnarQ & Q?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                  <div>
                    <p>✅ <strong>Decentralized Storage:</strong> Your data lives on IPFS, not on corporate servers</p>
                    <p>✅ <strong>Quantum Encryption:</strong> Future-proof security with Qlock technology</p>
                    <p>✅ <strong>Sovereign Identity:</strong> You control your digital identity with sQuid</p>
                  </div>
                  <div>
                    <p>✅ <strong>No Surveillance:</strong> End-to-end encryption for all communications</p>
                    <p>✅ <strong>Censorship Resistant:</strong> No central authority can shut you down</p>
                    <p>✅ <strong>Open Source:</strong> Transparent, auditable, and community-driven</p>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-sm text-slate-500">
            <p className="mb-2">
              <span className="font-medium">AnarQ & Q Ecosystem</span> • 
              Privacy and Digital Sovereignty Platform
            </p>
            <p>Built with React, IPFS, Storacha, and Quantum-Resistant Cryptography</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
