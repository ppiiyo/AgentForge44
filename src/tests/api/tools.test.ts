import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { executeWebSearch, executeCodeInterpreter, executeFileRead, executeTool } from '../../api/tools.js';

describe('Tools Execution API Suite', () => {
  const testFilePath = 'temp_test_read.txt';

  beforeEach(() => {
    fs.writeFileSync(testFilePath, 'Hello Visual Orchestrator Workspaces!', 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  describe('WebSearchTool', () => {
    it('should successfully fallback to mock web search results', async () => {
      const originalKey = process.env.TAVILY_API_KEY;
      delete process.env.TAVILY_API_KEY;

      const result = await executeWebSearch('React 19 release specifications');
      expect(result.success).toBe(true);
      expect(result.output).toContain('Web Search Mock Fallback');
      expect(result.output).toContain('React 19 release specifications');
      expect(result.metadata.engine).toBe('mock_fallback');

      process.env.TAVILY_API_KEY = originalKey;
    });

    it('should query Tavily if API key is provided', async () => {
      const originalKey = process.env.TAVILY_API_KEY;
      process.env.TAVILY_API_KEY = 'mock_tavily_key';

      // We expect the fetch to fail or be intercepted. Let's make sure it handles fetch issues gracefully or runs fallback.
      const result = await executeWebSearch('Vite Dev Server configuration');
      expect(result.success).toBe(true); // fallbacks if api request fails
      expect(result.output).toBeDefined();

      process.env.TAVILY_API_KEY = originalKey;
    });
  });

  describe('CodeInterpreterTool', () => {
    it('should run valid JS mathematical calculations inside sandbox', async () => {
      const script = 'const a = 12; const b = 30; return a + b;';
      const result = await executeCodeInterpreter(script);

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.output);
      expect(parsed.result).toBe(42);
    });

    it('should gracefully handle runtime evaluation errors', async () => {
      const faultyScript = 'throw new Error("Syntax error mock exception")';
      const result = await executeCodeInterpreter(faultyScript);

      expect(result.success).toBe(false);
      expect(result.output).toContain('Code execution runtime error');
      expect(result.output).toContain('Syntax error mock exception');
    });
  });

  describe('FileReadTool', () => {
    it('should read a valid existing text file from safe workspace paths', async () => {
      const result = await executeFileRead(testFilePath);
      expect(result.success).toBe(true);
      expect(result.output).toBe('Hello Visual Orchestrator Workspaces!');
    });

    it('should refuse to read files outside workspace root due to security traversal guard', async () => {
      const result = await executeFileRead('/etc/passwd');
      expect(result.success).toBe(false);
      expect(result.output).toContain('Security Violation');
    });

    it('should return error for nonexistent files', async () => {
      const result = await executeFileRead('non_existing_file_999.txt');
      expect(result.success).toBe(false);
      expect(result.output).toContain('File does not exist');
    });

    it('should return error if trying to read a directory as a file', async () => {
      const result = await executeFileRead('src');
      expect(result.success).toBe(false);
      expect(result.output).toContain('Path target is not a standard readable file');
    });
  });

  describe('executeTool routing', () => {
    it('should route execution requests matching tool specifications', async () => {
      const searchRes = await executeTool('web_search', { query: 'test query' });
      expect(searchRes.success).toBe(true);

      const codeRes = await executeTool('code_interpreter', { code: 'return 100;' });
      expect(codeRes.success).toBe(true);

      const fileRes = await executeTool('file_read', { filePath: testFilePath });
      expect(fileRes.success).toBe(true);
      expect(fileRes.output).toBe('Hello Visual Orchestrator Workspaces!');
    });

    it('should return failure for unknown tools spec matching switch fallbacks', async () => {
      const result = await executeTool('missing_tool_alias', {});
      expect(result.success).toBe(false);
      expect(result.output).toContain('undefined in this execution sandbox');
    });
  });
});
