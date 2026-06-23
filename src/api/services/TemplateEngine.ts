import Handlebars from 'handlebars';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { TemplateCompilationError } from '../errors/AgentErrors.js';

// Initialize DOMPurify with jsdom window
const window = new JSDOM('').window;
const purify = DOMPurify(window as any);

export class TemplateEngine {
  private static compiledCache = new Map<string, Handlebars.TemplateDelegate>();

  /**
   * Safely render a template using Handlebars, caching compiled templates and purifying the output.
   */
  static render(template: string, data: Record<string, unknown>): string {
    this.validateData(data);

    let compiled = this.compiledCache.get(template);
    if (!compiled) {
      try {
        // Safe options to prevent access to prototype methods
        compiled = Handlebars.compile(template, {
          noEscape: false,
          preventIndent: true,
        });
        this.compiledCache.set(template, compiled);
      } catch (error: any) {
        throw new TemplateCompilationError(`Template compilation failed: ${error.message}`);
      }
    }

    try {
      const result = compiled(data);
      // Clean HTML out of the template output to prevent XSS
      return purify.sanitize(result, { ALLOWED_TAGS: [] });
    } catch (error: any) {
      throw new TemplateCompilationError(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Recurse through the data object to prevent prototype pollution.
   */
  private static validateData(data: any): void {
    if (!data || typeof data !== 'object') return;

    const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
    const keys = new Set([...Object.keys(data), ...Object.getOwnPropertyNames(data)]);

    for (const key of keys) {
      if (dangerousKeys.some(dk => key.includes(dk))) {
        throw new TemplateCompilationError(`Forbidden key in template data: ${key}`);
      }
      this.validateData(data[key]);
    }
  }

  static clearCache(): void {
    this.compiledCache.clear();
  }
}
