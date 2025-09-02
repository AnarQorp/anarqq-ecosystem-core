
import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Menu, X, Mail, User, Settings } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { moduleInfo } from '@/utils/mockData';
import { IdentitySwitcher } from '@/components/identity/IdentitySwitcher';
import { useActiveIdentity } from '@/hooks/useActiveIdentity';
import { useIdentityStore } from '@/state/identity';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const { identity: activeIdentity } = useActiveIdentity();
  const { isAuthenticated } = useIdentityStore();

  return (
    <header className="fixed top-0 left-0 w-full bg-background border-b border-border z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo and Brand */}
        <Link to="/" className="flex items-center space-x-2">
          <Shield className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">
            <span className="text-primary">AnarQ</span>
            <span className="text-secondary">&nbsp;Q</span>
          </span>
        </Link>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-6 w-6 text-primary" />
                    <span className="font-bold text-xl">
                      <span className="text-primary">AnarQ</span>
                      <span className="text-secondary">&nbsp;Q</span>
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close menu</span>
                  </Button>
                </div>
                
                <nav className="flex-1">
                  <ul className="space-y-4">
                    <li>
                      <Link 
                        to="/dashboard" 
                        className="flex items-center p-2 space-x-3 hover:bg-muted rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Shield className="h-5 w-5 text-primary" />
                        <span>Dashboard</span>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/inbox" 
                        className="flex items-center p-2 space-x-3 hover:bg-muted rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Mail className="h-5 w-5" style={{ color: 'hsl(var(--qmail))' }} />
                        <span>Inbox</span>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/compose" 
                        className="flex items-center p-2 space-x-3 hover:bg-muted rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Mail className="h-5 w-5" style={{ color: 'hsl(var(--qmail))' }} />
                        <span>Compose</span>
                      </Link>
                    </li>
                    <li>
                      <Link 
                        to="/config" 
                        className="flex items-center p-2 space-x-3 hover:bg-muted rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Settings className="h-5 w-5" style={{ color: 'hsl(var(--qonsent))' }} />
                        <span>Privacy Settings</span>
                      </Link>
                    </li>
                  </ul>
                </nav>
                
                <div className="mt-auto pt-6 border-t border-border">
                  {isAuthenticated && activeIdentity ? (
                    <div className="space-y-3">
                      <div className="px-2">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Current Identity</p>
                        <IdentitySwitcher 
                          mode="grid" 
                          compactMode={true}
                          showSecurityBadges={true}
                          onIdentitySwitch={(identity) => {
                            console.log('Identity switched to:', identity.name);
                            setIsMenuOpen(false);
                          }}
                        />
                      </div>
                      <Link 
                        to="/identity/dashboard" 
                        className="flex items-center p-2 space-x-3 hover:bg-muted rounded-md transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-5 w-5" style={{ color: 'hsl(var(--squid))' }} />
                        <span>Identity Management</span>
                      </Link>
                    </div>
                  ) : (
                    <Link 
                      to="/identity" 
                      className="flex items-center p-2 space-x-3 hover:bg-muted rounded-md transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" style={{ color: 'hsl(var(--squid))' }} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Identity Login</span>
                        <span className="text-xs text-muted-foreground">Access sQuid</span>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-6">
          <Link to="/dashboard" className="font-medium hover:text-primary transition-colors">
            Dashboard
          </Link>
          <Link to="/inbox" className="font-medium hover:text-primary transition-colors">
            Inbox
          </Link>
          <Link to="/compose" className="font-medium hover:text-primary transition-colors">
            Compose
          </Link>
          <Link to="/config" className="font-medium hover:text-primary transition-colors">
            Privacy
          </Link>
        </nav>

        {/* User Controls */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated && activeIdentity ? (
            <IdentitySwitcher 
              mode="dropdown" 
              compactMode={true}
              showSecurityBadges={true}
              onIdentitySwitch={(identity) => {
                console.log('Identity switched to:', identity.name);
              }}
            />
          ) : (
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-sm font-medium">Not Authenticated</div>
                <div className="text-xs text-muted-foreground">Please log in</div>
              </div>
              <Button size="icon" variant="ghost" asChild>
                <Link to="/identity">
                  <User className="h-5 w-5" style={{ color: 'hsl(var(--squid))' }} />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
