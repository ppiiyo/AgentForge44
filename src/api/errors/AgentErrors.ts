export class AgentForgeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly metadata: Record<string, any> = {}
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class MissingApiKeyError extends AgentForgeError {
  constructor(provider: string, details?: string) {
    super(
      "MISSING_API_KEY",
      `API key is missing for provider "${provider}". Please configure it in your environment variables.${details ? " " + details : ""}`,
      401
    );
  }
}

export class NodeExecutionError extends AgentForgeError {
  constructor(nodeId: string, nodeType: string, originalError: Error, metadata: Record<string, any> = {}) {
    super(
      "NODE_EXECUTION_ERROR",
      `Failed to execute node "${nodeId}" of type "${nodeType}": ${originalError.message}`,
      500,
      { nodeId, nodeType, originalError: originalError.message, ...metadata }
    );
  }
}

export class TemplateCompilationError extends AgentForgeError {
  constructor(message: string) {
    super("TEMPLATE_COMPILATION_ERROR", message, 400);
  }
}

export class SSRFValidationError extends AgentForgeError {
  constructor(message: string) {
    super("SSRF_VALIDATION_ERROR", message, 403);
  }
}
