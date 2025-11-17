import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { parseBrunoFile, extractJsonFromDocs, ParsedBrunoFile } from './bruParser';

const TEST_DIR = join(__dirname, '../../.test-temp-parser');

describe('bruParser', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('parseBrunoFile', () => {
    it('should parse basic GET request', () => {
      const bruContent = `meta {
  name: Get User
  type: http
  seq: 1
}

get {{baseUrl}}/api/users/:id
`;
      const filePath = join(TEST_DIR, 'get-user.bru');
      writeFileSync(filePath, bruContent, 'utf-8');

      const result = parseBrunoFile(filePath);

      assert.strictEqual(result.meta.name, 'Get User');
      assert.strictEqual(result.meta.type, 'http');
      assert.strictEqual(result.meta.seq, 1);
      assert.strictEqual(result.http.method, 'GET');
      assert.ok(result.http.url.includes('/api/users/:id'));
    });

    it('should parse POST request with body', () => {
      const bruContent = `meta {
  name: Create User
  type: http
}

post {{baseUrl}}/api/users

body:json {
  {
    "name": "John",
    "email": "john@example.com"
  }
}
`;
      const filePath = join(TEST_DIR, 'post-user.bru');
      writeFileSync(filePath, bruContent, 'utf-8');

      const result = parseBrunoFile(filePath);

      assert.strictEqual(result.http.method, 'POST');
      assert.ok(result.body);
      assert.strictEqual(result.body.type, 'json');
      assert.ok(result.body.content.includes('"name": "John"'));
    });

    it('should parse headers', () => {
      const bruContent = `meta {
  name: Auth Request
  type: http
}

get {{baseUrl}}/api/protected

headers {
  Authorization: Bearer token123
  Content-Type: application/json
}
`;
      const filePath = join(TEST_DIR, 'auth-request.bru');
      writeFileSync(filePath, bruContent, 'utf-8');

      const result = parseBrunoFile(filePath);

      assert.ok(result.headers);
      assert.strictEqual(result.headers['Authorization'], 'Bearer token123');
      assert.strictEqual(result.headers['Content-Type'], 'application/json');
    });

    it('should parse docs with JSON code block', () => {
      const bruContent = `meta {
  name: Get Users
  type: http
}

get {{baseUrl}}/api/users

docs {
Response example:
\`\`\`json
{
  "users": [
    {
      "id": 1,
      "name": "John"
    }
  ],
  "total": 100
}
\`\`\`
}
`;
      const filePath = join(TEST_DIR, 'get-users.bru');
      writeFileSync(filePath, bruContent, 'utf-8');

      const result = parseBrunoFile(filePath);

      assert.ok(result.docs);
      assert.ok(result.docs.includes('"users"'));
      assert.ok(result.docs.includes('"total": 100'));
    });

    it('should parse done flag', () => {
      const bruContent = `meta {
  name: Completed Request
  type: http
  done: true
}

get {{baseUrl}}/api/done
`;
      const filePath = join(TEST_DIR, 'done-request.bru');
      writeFileSync(filePath, bruContent, 'utf-8');

      const result = parseBrunoFile(filePath);

      assert.strictEqual(result.meta.done, true);
    });

    it('should parse all HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

      for (const method of methods) {
        const bruContent = `meta {
  name: ${method} Request
  type: http
}

${method.toLowerCase()} {{baseUrl}}/api/resource
`;
        const filePath = join(TEST_DIR, `${method.toLowerCase()}-request.bru`);
        writeFileSync(filePath, bruContent, 'utf-8');

        const result = parseBrunoFile(filePath);
        assert.strictEqual(result.http.method, method);
      }
    });
  });

  describe('extractJsonFromDocs', () => {
    it('should extract JSON from code block', () => {
      const docs = `
Some description
\`\`\`json
{
  "id": 1,
  "name": "Test"
}
\`\`\`
`;
      const result = extractJsonFromDocs(docs);

      assert.deepStrictEqual(result, { id: 1, name: 'Test' });
    });

    it('should return null for invalid JSON', () => {
      const docs = 'No JSON here';
      const result = extractJsonFromDocs(docs);

      assert.strictEqual(result, null);
    });

    it('should parse plain JSON without code block', () => {
      const docs = '{"status": "ok", "code": 200}';
      const result = extractJsonFromDocs(docs);

      assert.deepStrictEqual(result, { status: 'ok', code: 200 });
    });

    it('should handle nested JSON', () => {
      const docs = `
\`\`\`json
{
  "data": {
    "items": [
      {"id": 1},
      {"id": 2}
    ]
  }
}
\`\`\`
`;
      const result = extractJsonFromDocs(docs);

      assert.deepStrictEqual(result, {
        data: {
          items: [{ id: 1 }, { id: 2 }],
        },
      });
    });
  });
});
