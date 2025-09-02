/**
 * Analytics Service
 * 
 * Provides analytics and reporting for marketplace activities.
 */

import { EventEmitter } from 'events';

export class AnalyticsService extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.qmarketService = options.qmarketService;
    this.analytics = new Map();
    this.events = [];
    
    console.log('[AnalyticsService] Initialized');
  }

  async getUserAnalytics(squidId) {
    try {
      // Get user's listings and purchases from QmarketService
      const userListings = Array.from(this.qmarketService.listings.values())
        .filter(listing => listing.squidId === squidId);

      const userPurchases = Array.from(this.qmarketService.purchases.values())
        .filter(purchase => purchase.buyerId === squidId);

      // Calculate analytics
      const totalListings = userListings.length;
      const activeListings = userListings.filter(l => l.status === 'active').length;
      const totalSales = userListings.reduce((sum, l) => sum + l.purchaseCount, 0);
      const totalRevenue = userPurchases.reduce((sum, p) => sum + p.price, 0);
      const totalSpent = userPurchases.reduce((sum, p) => sum + p.price, 0);

      // Category breakdown
      const listingsByCategory = {};
      userListings.forEach(listing => {
        listingsByCategory[listing.category] = (listingsByCategory[listing.category] || 0) + 1;
      });

      // Monthly activity
      const monthlyActivity = this.calculateMonthlyActivity(userListings, userPurchases);

      return {
        success: true,
        analytics: {
          squidId,
          summary: {
            totalListings,
            activeListings,
            totalSales,
            totalRevenue,
            totalPurchases: userPurchases.length,
            totalSpent,
            averageListingPrice: totalListings > 0 
              ? userListings.reduce((sum, l) => sum + l.price, 0) / totalListings 
              : 0
          },
          breakdown: {
            listingsByCategory,
            monthlyActivity
          },
          performance: {
            conversionRate: totalListings > 0 ? (totalSales / totalListings) * 100 : 0,
            averageSalePrice: totalSales > 0 
              ? totalRevenue / totalSales 
              : 0
          },
          lastUpdated: new Date().toISOString()
        }
      };

    } catch (error) {
      console.error('[AnalyticsService] Get user analytics error:', error);
      return {
        success: false,
        error: error.message,
        code: 'USER_ANALYTICS_ERROR'
      };
    }
  }

  async getListingAnalytics(listingId) {
    try {
      const listing = this.qmarketService.listings.get(listingId);
      if (!listing) {
        return {
          success: false,
          error: 'Listing not found',
          code: 'LISTING_NOT_FOUND'
        };
      }

      // Calculate analytics for this specific listing
      const analytics = {
        listingId,
        title: listing.title,
        category: listing.category,
        price: listing.price,
        currency: listing.currency,
        metrics: {
          viewCount: listing.viewCount || 0,
          favoriteCount: listing.favoriteCount || 0,
          purchaseCount: listing.purchaseCount || 0,
          conversionRate: listing.viewCount > 0 
            ? (listing.purchaseCount / listing.viewCount) * 100 
            : 0
        },
        timeline: {
          createdAt: listing.createdAt,
          lastViewedAt: listing.lastViewedAt,
          lastPurchasedAt: listing.lastPurchasedAt
        },
        performance: {
          daysActive: Math.floor((new Date() - new Date(listing.createdAt)) / (1000 * 60 * 60 * 24)),
          averageViewsPerDay: listing.viewCount && listing.createdAt 
            ? listing.viewCount / Math.max(1, Math.floor((new Date() - new Date(listing.createdAt)) / (1000 * 60 * 60 * 24)))
            : 0
        }
      };

      return {
        success: true,
        analytics
      };

    } catch (error) {
      console.error('[AnalyticsService] Get listing analytics error:', error);
      return {
        success: false,
        error: error.message,
        code: 'LISTING_ANALYTICS_ERROR'
      };
    }
  }

  async getCategoryAnalytics() {
    try {
      const listings = Array.from(this.qmarketService.listings.values());
      
      const categoryStats = {};
      
      listings.forEach(listing => {
        if (!categoryStats[listing.category]) {
          categoryStats[listing.category] = {
            category: listing.category,
            totalListings: 0,
            activeListings: 0,
            totalViews: 0,
            totalPurchases: 0,
            totalRevenue: 0,
            averagePrice: 0,
            prices: []
          };
        }

        const stats = categoryStats[listing.category];
        stats.totalListings++;
        if (listing.status === 'active') stats.activeListings++;
        stats.totalViews += listing.viewCount || 0;
        stats.totalPurchases += listing.purchaseCount || 0;
        stats.totalRevenue += (listing.purchaseCount || 0) * listing.price;
        stats.prices.push(listing.price);
      });

      // Calculate averages
      Object.values(categoryStats).forEach(stats => {
        stats.averagePrice = stats.prices.length > 0 
          ? stats.prices.reduce((sum, price) => sum + price, 0) / stats.prices.length 
          : 0;
        delete stats.prices; // Remove raw prices from response
      });

      return {
        success: true,
        categories: Object.values(categoryStats),
        totalCategories: Object.keys(categoryStats).length,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('[AnalyticsService] Get category analytics error:', error);
      return {
        success: false,
        error: error.message,
        code: 'CATEGORY_ANALYTICS_ERROR'
      };
    }
  }

  calculateMonthlyActivity(listings, purchases) {
    const monthlyData = {};

    // Process listings
    listings.forEach(listing => {
      const month = new Date(listing.createdAt).toISOString().substring(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { listings: 0, purchases: 0, revenue: 0, spent: 0 };
      }
      monthlyData[month].listings++;
    });

    // Process purchases
    purchases.forEach(purchase => {
      const month = new Date(purchase.purchasedAt).toISOString().substring(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { listings: 0, purchases: 0, revenue: 0, spent: 0 };
      }
      monthlyData[month].purchases++;
      monthlyData[month].spent += purchase.price;
    });

    // Convert to array and sort by month
    return Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  async healthCheck() {
    return {
      status: 'healthy',
      service: 'analytics-service',
      timestamp: new Date().toISOString(),
      analytics: this.analytics.size,
      events: this.events.length
    };
  }
}

export default AnalyticsService;