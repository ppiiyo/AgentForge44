import axios from 'axios';
import { logger } from '../utils/logger.js';
import { validateUrl } from '../utils/ssrf-validator.js';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[]; // 'graph.started', 'graph.completed', 'graph.failed'
  secret?: string;
  enabled: boolean;
  history: Array<{
    timestamp: Date;
    event: string;
    status: number;
    success: boolean;
    error?: string;
  }>;
}

const webhooks = new Map<string, Webhook>();

export async function triggerWebhook(event: string, payload: any) {
  logger.info(`Checking Webhooks to trigger for event: ${event}`);
  for (const webhook of webhooks.values()) {
    if (!webhook.enabled || !webhook.events.includes(event)) {
      continue;
    }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (webhook.secret) {
        headers['X-Webhook-Secret'] = webhook.secret;
      }

      logger.info(`Posting webhook to: ${webhook.url}`);
      await validateUrl(webhook.url);
      const response = await axios.post(
        webhook.url,
        {
          event,
          payload,
          timestamp: new Date().toISOString()
        },
        {
          headers,
          timeout: 6000
        }
      );

      webhook.history.unshift({
        timestamp: new Date(),
        event,
        status: response.status,
        success: true
      });
      // Limit history to 20 entries
      if (webhook.history.length > 20) {
        webhook.history.pop();
      }

      logger.info(`Webhook successfully sent to: ${webhook.url} Status: ${response.status}`);
    } catch (error: any) {
      logger.error(`Webhook delivery failure to URL ${webhook.url}: ${error.message}`);
      
      webhook.history.unshift({
        timestamp: new Date(),
        event,
        status: error.response?.status || 500,
        success: false,
        error: error.message || String(error)
      });
      if (webhook.history.length > 20) {
        webhook.history.pop();
      }
    }
  }
}

export function registerWebhook(config: Omit<Webhook, 'history'>): Webhook {
  const fullWebhook: Webhook = {
    ...config,
    history: []
  };
  webhooks.set(config.id, fullWebhook);
  return fullWebhook;
}

export function removeWebhook(id: string): boolean {
  return webhooks.delete(id);
}

export function toggleWebhook(id: string, enabled: boolean): Webhook | undefined {
  const webhook = webhooks.get(id);
  if (webhook) {
    webhook.enabled = enabled;
  }
  return webhook;
}

export function listWebhooks(): Webhook[] {
  return Array.from(webhooks.values());
}
