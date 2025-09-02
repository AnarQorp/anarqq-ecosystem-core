/**
 * Webhooks Module
 * 
 * External event processing and webhook integration
 */

export { WebhookService, webhookService } from './WebhookService.js';
export { WebhookController, webhookController } from './WebhookController.js';
export { ExternalIntegrationService, externalIntegrationService } from './ExternalIntegrationService.js';

export type {
  WebhookEvent,
  WebhookConfig,
  WebhookValidationResult,
  ProcessedWebhookEvent,
  ExternalEventSchema
} from './WebhookService.js';

export type {
  WebhookCreateRequest,
  WebhookUpdateRequest
} from './WebhookController.js';

export type {
  ExternalSystemConfig,
  IntegrationTemplate
} from './ExternalIntegrationService.js';