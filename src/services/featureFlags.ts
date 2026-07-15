import { OpenFeature } from "@openfeature/server-sdk";
import type { Provider, Client } from "@openfeature/server-sdk";
import { ErrorCode } from "@openfeature/core";
import type { EvaluationContext, ResolutionDetails, JsonValue } from "@openfeature/core";

/**
 * Standard Environment & InMemory Fallback Provider for OpenFeature
 * Enables local development via environment variables and standard JSON/in-memory definitions.
 */
class LocalFallbackProvider implements Provider {
  readonly metadata = {
    name: "local-fallback-provider",
  };

  private defaults: Record<string, any> = {
    "enable-llm-guard": true,
    "enable-chaos-engine": false,
    "enable-aggressive-caching": true,
    "sandbox-memory-limit-mb": 256,
  };

  async resolveBooleanEvaluation(
    flagKey: string,
    defaultValue: boolean,
    context: EvaluationContext
  ): Promise<ResolutionDetails<boolean>> {
    const envValue = process.env[flagKey.toUpperCase().replace(/-/g, "_")];
    if (envValue !== undefined) {
      return { value: envValue === "true" || envValue === "1" };
    }
    const val = this.defaults[flagKey];
    return { value: val !== undefined ? Boolean(val) : defaultValue };
  }

  async resolveStringEvaluation(
    flagKey: string,
    defaultValue: string,
    context: EvaluationContext
  ): Promise<ResolutionDetails<string>> {
    const envValue = process.env[flagKey.toUpperCase().replace(/-/g, "_")];
    if (envValue !== undefined) {
      return { value: envValue };
    }
    const val = this.defaults[flagKey];
    return { value: val !== undefined ? String(val) : defaultValue };
  }

  async resolveNumberEvaluation(
    flagKey: string,
    defaultValue: number,
    context: EvaluationContext
  ): Promise<ResolutionDetails<number>> {
    const envValue = process.env[flagKey.toUpperCase().replace(/-/g, "_")];
    if (envValue !== undefined) {
      const parsed = Number(envValue);
      if (!isNaN(parsed)) return { value: parsed };
    }
    const val = this.defaults[flagKey];
    return { value: val !== undefined ? Number(val) : defaultValue };
  }

  async resolveObjectEvaluation<T extends JsonValue>(
    flagKey: string,
    defaultValue: T,
    context: EvaluationContext
  ): Promise<ResolutionDetails<T>> {
    const envValue = process.env[flagKey.toUpperCase().replace(/-/g, "_")];
    if (envValue !== undefined) {
      try {
        return { value: JSON.parse(envValue) as T };
      } catch {
        return { value: defaultValue, errorCode: ErrorCode.PARSE_ERROR };
      }
    }
    const val = this.defaults[flagKey];
    return { value: val !== undefined ? (val as T) : defaultValue };
  }
}

// Register Fallback Provider during system init
OpenFeature.setProvider(new LocalFallbackProvider());

export class FeatureFlagService {
  private static client: Client = OpenFeature.getClient("kostromai44");

  /**
   * Evaluates a boolean feature flag
   */
  public static async getBooleanValue(flagKey: string, defaultValue = false, context?: EvaluationContext): Promise<boolean> {
    return this.client.getBooleanValue(flagKey, defaultValue, context);
  }

  /**
   * Evaluates a string feature flag
   */
  public static async getStringValue(flagKey: string, defaultValue = "", context?: EvaluationContext): Promise<string> {
    return this.client.getStringValue(flagKey, defaultValue, context);
  }

  /**
   * Evaluates a numeric feature flag
   */
  public static async getNumberValue(flagKey: string, defaultValue = 0, context?: EvaluationContext): Promise<number> {
    return this.client.getNumberValue(flagKey, defaultValue, context);
  }

  /**
   * Evaluates a structured object feature flag
   */
  public static async getObjectValue<T extends JsonValue>(flagKey: string, defaultValue: T, context?: EvaluationContext): Promise<T> {
    return this.client.getObjectValue<T>(flagKey, defaultValue, context);
  }
}
