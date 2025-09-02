
import React from 'react';
import { Header } from './Header';
import { moduleInfo } from '@/utils/mockData';
import { Shield } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  module?: keyof typeof moduleInfo;
  title?: string;
  description?: string;
}

export function Layout({ children, module, title, description }: LayoutProps) {
  const moduleData = module ? moduleInfo[module] : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      
      <main className="flex-1 pt-16">
        {/* Module header */}
        {(moduleData || title) && (
          <div 
            className="py-6 border-b" 
            style={{ borderColor: moduleData?.color ? `color-mix(in srgb, ${moduleData.color} 50%, transparent)` : '' }}
          >
            <div className="container mx-auto px-4">
              <div className="flex items-center space-x-3">
                {moduleData ? (
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: moduleData.color }}
                  >
                    <span className="text-white font-bold">
                      {moduleData.name.slice(0, 1)}
                    </span>
                  </div>
                ) : (
                  <Shield className="w-10 h-10 text-primary" />
                )}
                <div>
                  <h1 className="text-2xl font-bold">
                    {moduleData ? moduleData.name : title}
                  </h1>
                  {(moduleData?.description || description) && (
                    <p className="text-muted-foreground">
                      {moduleData?.description || description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      
      <footer className="py-4 border-t">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              AnarQ & Q | Technical MVP
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            Decentralized. Modular. Secure.
          </div>
        </div>
      </footer>
    </div>
  );
}
