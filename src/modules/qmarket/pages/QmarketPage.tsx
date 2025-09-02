import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { QmarketFeed, QmarketNav } from '../components';
import { useIdentityStore } from '@/state/identity';

export function QmarketPage() {
  const navigate = useNavigate();
  const isAuthenticated = !!useIdentityStore(state => state.activeIdentity);

  const handleItemClick = (item: any) => {
    navigate(`/qmarket/item/${item.cid}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <QmarketNav />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Qmarket</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Discover and share digital assets in the decentralized marketplace of the AnarQ ecosystem.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Featured Items</h2>
            <p className="text-muted-foreground">Discover amazing digital assets from our community</p>
          </div>
          
          {isAuthenticated && (
            <div className="flex space-x-4">
              <Button variant="outline" onClick={() => navigate('/qmarket/my-items')}>
                My Items
              </Button>
              <Button onClick={() => navigate('/qmarket/publish')}>
                <Plus className="h-4 w-4 mr-2" />
                Publish New Item
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          <QmarketFeed 
            onItemClick={handleItemClick}
            showFilters={true}
            showSearch={true}
            showSort={true}
          />
        </div>

        {/* Categories Section */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold mb-6">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Art', icon: '🎨', count: 1243 },
              { name: 'Photography', icon: '📷', count: 876 },
              { name: 'Music', icon: '🎵', count: 542 },
              { name: '3D Models', icon: '🖥️', count: 321 },
              { name: 'Templates', icon: '📋', count: 765 },
              { name: 'Fonts', icon: '🔤', count: 432 },
            ].map((category) => (
              <button
                key={category.name}
                className="flex flex-col items-center justify-center p-6 rounded-lg border hover:bg-accent transition-colors"
                onClick={() => navigate(`/qmarket?category=${category.name.toLowerCase()}`)}
              >
                <span className="text-3xl mb-2">{category.icon}</span>
                <span className="font-medium">{category.name}</span>
                <span className="text-sm text-muted-foreground">{category.count} items</span>
              </button>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="mt-16 bg-muted/50 p-8 rounded-lg">
          <h2 className="text-2xl font-semibold mb-6 text-center">How Qmarket Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                title: 'Publish',
                description: 'Upload your digital assets, set your price, and publish to the marketplace.',
                icon: '📤',
              },
              {
                title: 'Discover',
                description: 'Browse and find the perfect digital assets for your projects.',
                icon: '🔍',
              },
              {
                title: 'Own & Trade',
                description: 'Purchase, own, and even resell digital assets with blockchain security.',
                icon: '💎',
              },
            ].map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="font-medium mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default QmarketPage;
