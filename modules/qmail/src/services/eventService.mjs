/**
 * Event Service
 * Handles event publishing and management
 */

export class EventService {
  constructor(qerberosService) {
    this.qerberos = qerberosService;
    this.eventHistory = new Map(); // Store events for demo
  }

  /**
   * Publish event to the event bus
   */
  async publishEvent(topic, payload) {
    try {
      console.log(`[EventService] Publishing event ${topic}`);

      const event = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        topic,
        payload,
        timestamp: new Date().toISOString(),
        version: this.extractVersionFromTopic(topic)
      };

      // Store event for demo purposes
      this.eventHistory.set(event.eventId, event);

      // In a real implementation, this would publish to an actual event bus
      // For now, we'll just log and simulate successful publishing
      console.log(`[EventService] Event ${event.eventId} published to topic ${topic}`);

      // Log the event publishing to Qerberos
      await this.qerberos.logAuditEvent({
        type: 'EVENT_PUBLISHED',
        actor: 'qmail_service',
        resource: event.eventId,
        details: {
          topic,
          payloadSize: JSON.stringify(payload).length,
          version: event.version
        }
      });

      return {
        eventId: event.eventId,
        topic,
        timestamp: event.timestamp,
        published: true
      };

    } catch (error) {
      console.error(`[EventService] Failed to publish event to ${topic}:`, error);
      throw new Error(`Event publishing failed: ${error.message}`);
    }
  }

  /**
   * Get event history (for demo/testing purposes)
   */
  async getEventHistory(filters = {}) {
    try {
      let events = Array.from(this.eventHistory.values());

      // Apply filters
      if (filters.topic) {
        events = events.filter(event => event.topic === filters.topic);
      }

      if (filters.since) {
        const sinceDate = new Date(filters.since);
        events = events.filter(event => new Date(event.timestamp) >= sinceDate);
      }

      if (filters.limit) {
        events = events.slice(0, filters.limit);
      }

      // Sort by timestamp (newest first)
      events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return {
        events,
        totalCount: events.length,
        filters
      };

    } catch (error) {
      console.error('[EventService] Failed to get event history:', error);
      throw error;
    }
  }

  /**
   * Subscribe to events (mock implementation)
   */
  async subscribeToEvents(topics, callback) {
    try {
      console.log(`[EventService] Subscribing to topics: ${topics.join(', ')}`);

      // In a real implementation, this would set up actual event subscriptions
      // For demo purposes, we'll just log the subscription
      
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log(`[EventService] Subscription ${subscriptionId} created for topics: ${topics.join(', ')}`);

      return {
        subscriptionId,
        topics,
        createdAt: new Date().toISOString(),
        active: true
      };

    } catch (error) {
      console.error('[EventService] Failed to subscribe to events:', error);
      throw error;
    }
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribeFromEvents(subscriptionId) {
    try {
      console.log(`[EventService] Unsubscribing from ${subscriptionId}`);

      // In a real implementation, this would remove the actual subscription
      console.log(`[EventService] Subscription ${subscriptionId} removed`);

      return {
        subscriptionId,
        unsubscribedAt: new Date().toISOString(),
        success: true
      };

    } catch (error) {
      console.error('[EventService] Failed to unsubscribe:', error);
      throw error;
    }
  }

  /**
   * Validate event payload against schema
   */
  async validateEventPayload(topic, payload) {
    try {
      // In a real implementation, this would validate against actual schemas
      // For demo purposes, we'll do basic validation
      
      if (!topic || typeof topic !== 'string') {
        throw new Error('Invalid topic');
      }

      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid payload');
      }

      // Check if topic follows naming convention
      const topicPattern = /^q\.[a-z]+\.[a-z]+\.v\d+$/;
      if (!topicPattern.test(topic)) {
        throw new Error('Topic does not follow naming convention: q.<module>.<action>.<version>');
      }

      console.log(`[EventService] Event payload validated for topic ${topic}`);
      return true;

    } catch (error) {
      console.error(`[EventService] Event validation failed for ${topic}:`, error);
      throw error;
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats() {
    try {
      const events = Array.from(this.eventHistory.values());
      
      // Group by topic
      const topicStats = {};
      events.forEach(event => {
        if (!topicStats[event.topic]) {
          topicStats[event.topic] = 0;
        }
        topicStats[event.topic]++;
      });

      // Group by hour for timeline
      const hourlyStats = {};
      events.forEach(event => {
        const hour = new Date(event.timestamp).toISOString().substr(0, 13);
        if (!hourlyStats[hour]) {
          hourlyStats[hour] = 0;
        }
        hourlyStats[hour]++;
      });

      return {
        totalEvents: events.length,
        topicStats,
        hourlyStats,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('[EventService] Failed to get event stats:', error);
      throw error;
    }
  }

  /**
   * Extract version from topic name
   */
  extractVersionFromTopic(topic) {
    const match = topic.match(/\.v(\d+)$/);
    return match ? match[1] : '1';
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      eventCount: this.eventHistory.size,
      lastEventTime: this.eventHistory.size > 0 
        ? Array.from(this.eventHistory.values()).pop().timestamp 
        : null
    };
  }

  /**
   * Clear event history (for testing)
   */
  async clearEventHistory() {
    this.eventHistory.clear();
    console.log('[EventService] Event history cleared');
  }
}