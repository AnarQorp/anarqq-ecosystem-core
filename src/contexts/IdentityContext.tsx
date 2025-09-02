import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Identity {
  id: string;
  name?: string;
  address: string;
  avatar?: string;
}

interface IdentityContextType {
  identity: Identity | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
}

const IdentityContext = createContext<IdentityContextType | undefined>(undefined);

export const IdentityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate checking for existing session
  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        // In a real app, this would check for an existing session
        const storedIdentity = localStorage.getItem('qmail_identity');
        if (storedIdentity) {
          setIdentity(JSON.parse(storedIdentity));
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = async () => {
    setIsLoading(true);
    try {
      // Simulate sQuid authentication
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock identity - in a real app, this would come from sQuid
      const mockIdentity: Identity = {
        id: 'user-' + Math.random().toString(36).substr(2, 9),
        name: 'Qmail User',
        address: '0x' + Math.random().toString(16).substr(2, 40),
        avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
      };
      
      setIdentity(mockIdentity);
      localStorage.setItem('qmail_identity', JSON.stringify(mockIdentity));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setIdentity(null);
    localStorage.removeItem('qmail_identity');
  };

  return (
    <IdentityContext.Provider value={{ identity, isLoading, login, logout }}>
      {children}
    </IdentityContext.Provider>
  );
};

export const useIdentity = (): IdentityContextType => {
  const context = useContext(IdentityContext);
  if (context === undefined) {
    throw new Error('useIdentity must be used within an IdentityProvider');
  }
  return context;
};
