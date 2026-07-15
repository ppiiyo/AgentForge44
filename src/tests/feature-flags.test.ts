import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { FeatureFlagService } from "../services/featureFlags.js";

describe("Feature Flags Service & OpenFeature Provider Integration", () => {
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should retrieve default values for registered flags when env is not set", async () => {
    const isLLMGuardEnabled = await FeatureFlagService.getBooleanValue("enable-llm-guard", false);
    expect(isLLMGuardEnabled).toBe(true); // Default configured to true

    const isChaosEngineEnabled = await FeatureFlagService.getBooleanValue("enable-chaos-engine", true);
    expect(isChaosEngineEnabled).toBe(false); // Default configured to false
  });

  it("should evaluate string and numeric flags with proper defaults", async () => {
    const memoryLimit = await FeatureFlagService.getNumberValue("sandbox-memory-limit-mb", 128);
    expect(memoryLimit).toBe(256); // Default configured to 256
  });

  it("should respect environment variable overrides when specified", async () => {
    process.env.ENABLE_CHAOS_ENGINE = "true";
    process.env.SANDBOX_MEMORY_LIMIT_MB = "512";

    const isChaosEngineEnabled = await FeatureFlagService.getBooleanValue("enable-chaos-engine", false);
    expect(isChaosEngineEnabled).toBe(true);

    const memoryLimit = await FeatureFlagService.getNumberValue("sandbox-memory-limit-mb", 128);
    expect(memoryLimit).toBe(512);
  });

  it("should fallback to provided default for unregistered flag keys", async () => {
    const unregisteredBool = await FeatureFlagService.getBooleanValue("non-existent-flag-key-test", true);
    expect(unregisteredBool).toBe(true);

    const unregisteredString = await FeatureFlagService.getStringValue("non-existent-string-key", "fallback-default");
    expect(unregisteredString).toBe("fallback-default");
  });
});
