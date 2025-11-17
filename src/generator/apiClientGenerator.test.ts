import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractApiFunction, generateApiFunction } from './apiClientGenerator';
import { ParsedBrunoFile } from '../parser/bruParser';

describe('apiClientGenerator', () => {
  describe('extractApiFunction', () => {
    it('should extract GET function info', () => {
      const parsed: ParsedBrunoFile = {
        meta: { name: 'Get User', type: 'http' },
        http: { method: 'GET', url: '/api/users/:id' },
      };

      const result = extractApiFunction(parsed, '/project/bruno/users/get-user.bru');

      assert.ok(result);
      assert.strictEqual(result.name, 'getUser');
      assert.strictEqual(result.method, 'GET');
      assert.strictEqual(result.url, '/api/users/:id');
      assert.strictEqual(result.responseType, 'GetUserResponse');
      assert.strictEqual(result.hasParams, true);
      assert.strictEqual(result.hasBody, false);
    });

    it('should extract POST function info with body', () => {
      const parsed: ParsedBrunoFile = {
        meta: { name: 'Create User', type: 'http' },
        http: { method: 'POST', url: '/api/users' },
      };

      const result = extractApiFunction(parsed, '/project/bruno/users/post-user.bru');

      assert.ok(result);
      assert.strictEqual(result.name, 'postUser');
      assert.strictEqual(result.method, 'POST');
      assert.strictEqual(result.hasBody, true);
      assert.strictEqual(result.hasParams, false);
    });

    it('should detect URL parameters with colon notation', () => {
      const parsed: ParsedBrunoFile = {
        meta: { name: 'Get Post', type: 'http' },
        http: { method: 'GET', url: '/api/users/:userId/posts/:postId' },
      };

      const result = extractApiFunction(parsed, '/project/get-post.bru');

      assert.ok(result);
      assert.strictEqual(result.hasParams, true);
    });

    it('should detect URL parameters with curly braces', () => {
      const parsed: ParsedBrunoFile = {
        meta: { name: 'Get Item', type: 'http' },
        http: { method: 'GET', url: '/api/items/{itemId}' },
      };

      const result = extractApiFunction(parsed, '/project/get-item.bru');

      assert.ok(result);
      assert.strictEqual(result.hasParams, true);
    });

    it('should return null for invalid request', () => {
      const parsed: ParsedBrunoFile = {
        meta: { name: 'Invalid', type: 'http' },
        http: { method: '', url: '' },
      };

      const result = extractApiFunction(parsed, '/project/invalid.bru');

      assert.strictEqual(result, null);
    });

    it('should handle all HTTP methods that have body', () => {
      const methodsWithBody = ['POST', 'PUT', 'PATCH'];

      for (const method of methodsWithBody) {
        const parsed: ParsedBrunoFile = {
          meta: { name: 'Test', type: 'http' },
          http: { method, url: '/api/test' },
        };

        const result = extractApiFunction(parsed, '/project/test.bru');
        assert.ok(result);
        assert.strictEqual(result.hasBody, true, `${method} should have body`);
      }
    });

    it('should convert kebab-case filename to camelCase', () => {
      const parsed: ParsedBrunoFile = {
        meta: { name: 'Get User Profile', type: 'http' },
        http: { method: 'GET', url: '/api/profile' },
      };

      const result = extractApiFunction(parsed, '/project/get-user-profile.bru');

      assert.ok(result);
      assert.strictEqual(result.name, 'getUserProfile');
      assert.strictEqual(result.responseType, 'GetUserProfileResponse');
    });
  });

  describe('generateApiFunction', () => {
    it('should generate GET function without params', () => {
      const apiFunc = {
        name: 'getUsers',
        method: 'GET',
        url: '/api/users',
        responseType: 'GetUsersResponse',
        hasParams: false,
        hasBody: false,
      };

      const code = generateApiFunction(apiFunc, 'users');

      assert.ok(code.includes('const getUsers = async'));
      assert.ok(code.includes('Promise<GetUsersResponse>'));
      assert.ok(code.includes('axiosInstance.get<GetUsersResponse>'));
      assert.ok(code.includes('`/api/users`'));
    });

    it('should generate GET function with URL params', () => {
      const apiFunc = {
        name: 'getUser',
        method: 'GET',
        url: '/api/users/:userId',
        responseType: 'GetUserResponse',
        hasParams: true,
        hasBody: false,
      };

      const code = generateApiFunction(apiFunc, 'users');

      assert.ok(code.includes('userId: string | number'));
      assert.ok(code.includes('${params.userId}'));
    });

    it('should generate POST function with body', () => {
      const apiFunc = {
        name: 'postUser',
        method: 'POST',
        url: '/api/users',
        responseType: 'PostUserResponse',
        hasParams: false,
        hasBody: true,
      };

      const code = generateApiFunction(apiFunc, 'users');

      assert.ok(code.includes('data?: PostUserRequest'));
      assert.ok(code.includes('axiosInstance.post'));
      assert.ok(code.includes('params?.data'));
    });

    it('should generate function with multiple URL params', () => {
      const apiFunc = {
        name: 'getComment',
        method: 'GET',
        url: '/api/posts/:postId/comments/:commentId',
        responseType: 'GetCommentResponse',
        hasParams: true,
        hasBody: false,
      };

      const code = generateApiFunction(apiFunc, 'posts');

      assert.ok(code.includes('postId: string | number'));
      assert.ok(code.includes('commentId: string | number'));
      assert.ok(code.includes('${params.postId}'));
      assert.ok(code.includes('${params.commentId}'));
    });

    it('should include query params for GET requests', () => {
      const apiFunc = {
        name: 'getUsers',
        method: 'GET',
        url: '/api/users',
        responseType: 'GetUsersResponse',
        hasParams: false,
        hasBody: false,
      };

      const code = generateApiFunction(apiFunc, 'users');

      assert.ok(code.includes('params?: Record<string, any>'));
      assert.ok(code.includes('params: params?.params'));
    });
  });
});
