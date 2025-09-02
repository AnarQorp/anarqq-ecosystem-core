import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useIdentityStore } from '@/state/identity';

interface QmarketNavProps {
  className?: string;
}

const navigation = [
  { name: 'Discover', href: '/qmarket' },
  { name: 'My Items', href: '/qmarket/my-items' },
  { name: 'Purchased', href: '/qmarket/purchased' },
  { name: 'Favorites', href: '/qmarket/favorites' },
];

export function QmarketNav({ className }: QmarketNavProps) {
  const location = useLocation();
  const isAuthenticated = !!useIdentityStore(state => state.activeIdentity);

  return (
    <div className={cn("border-b", className)}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold">Qmarket</h1>
            <nav className="flex space-x-4">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.name === 'My Items' && !isAuthenticated ? '/login' : item.href}
                  className={({ isActive }) =>
                    cn(
                      'text-sm font-medium transition-colors hover:text-primary px-3 py-2 rounded-md',
                      isActive || (item.href !== '/' && location.pathname.startsWith(item.href))
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground'
                    )
                  }
                >
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <Button asChild>
                <NavLink to="/qmarket/publish">
                  <Plus className="h-4 w-4 mr-2" />
                  Publish Item
                </NavLink>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <NavLink to="/login" state={{ from: location.pathname }}>
                  Sign In to Publish
                </NavLink>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default QmarketNav;
