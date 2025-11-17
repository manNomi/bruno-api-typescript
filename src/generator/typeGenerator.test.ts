import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  inferTypeScriptType,
  generateTypeScriptInterface,
  toCamelCase,
  urlToFunctionName,
  functionNameToTypeName,
} from './typeGenerator';

describe('typeGenerator', () => {
  describe('inferTypeScriptType', () => {
    it('should infer string type', () => {
      assert.strictEqual(inferTypeScriptType('hello'), 'string');
    });

    it('should infer number type', () => {
      assert.strictEqual(inferTypeScriptType(42), 'number');
      assert.strictEqual(inferTypeScriptType(3.14), 'number');
    });

    it('should infer boolean type', () => {
      assert.strictEqual(inferTypeScriptType(true), 'boolean');
      assert.strictEqual(inferTypeScriptType(false), 'boolean');
    });

    it('should infer null type', () => {
      assert.strictEqual(inferTypeScriptType(null), 'null');
      assert.strictEqual(inferTypeScriptType(undefined), 'null');
    });

    it('should infer empty array type', () => {
      assert.strictEqual(inferTypeScriptType([]), 'any[]');
    });

    it('should infer primitive array type', () => {
      assert.strictEqual(inferTypeScriptType(['a', 'b']), 'string[]');
      assert.strictEqual(inferTypeScriptType([1, 2, 3]), 'number[]');
    });

    it('should infer object array type', () => {
      const type = inferTypeScriptType([{ id: 1 }], 'Items');
      assert.strictEqual(type, 'ItemsItem[]');
    });
  });

  describe('generateTypeScriptInterface', () => {
    it('should generate simple interface', () => {
      const json = {
        id: 1,
        name: 'Test',
        active: true,
      };

      const definitions = generateTypeScriptInterface(json, 'User');

      assert.strictEqual(definitions.length, 1);
      const mainDef = definitions.find(d => d.name === 'User');
      assert.ok(mainDef);
      assert.ok(mainDef.content.includes('export interface User'));
      assert.ok(mainDef.content.includes('id: number;'));
      assert.ok(mainDef.content.includes('name: string;'));
      assert.ok(mainDef.content.includes('active: boolean;'));
    });

    it('should generate interface with array of objects', () => {
      const json = {
        users: [
          { id: 1, name: 'John' },
        ],
        total: 100,
      };

      const definitions = generateTypeScriptInterface(json, 'Response');

      assert.ok(definitions.length > 1);
      const itemDef = definitions.find(d => d.name === 'UsersItem');
      assert.ok(itemDef);
      assert.ok(itemDef.content.includes('id: number;'));
      assert.ok(itemDef.content.includes('name: string;'));

      const mainDef = definitions.find(d => d.name === 'Response');
      assert.ok(mainDef);
      assert.ok(mainDef.content.includes('users: UsersItem[];'));
      assert.ok(mainDef.content.includes('total: number;'));
    });

    it('should handle nested objects', () => {
      const json = {
        data: {
          user: {
            id: 1,
            profile: {
              avatar: 'url',
            },
          },
        },
      };

      const definitions = generateTypeScriptInterface(json, 'Response');
      const mainDef = definitions.find(d => d.name === 'Response');

      assert.ok(mainDef);
      assert.ok(mainDef.content.includes('data: Data;'));
    });

    it('should handle null values', () => {
      const json = {
        value: null,
      };

      const definitions = generateTypeScriptInterface(json, 'Response');
      const mainDef = definitions[0];

      assert.ok(mainDef.content.includes('value: null;'));
    });
  });

  describe('toCamelCase', () => {
    it('should convert kebab-case', () => {
      assert.strictEqual(toCamelCase('get-user'), 'getUser');
      assert.strictEqual(toCamelCase('post-user-profile'), 'postUserProfile');
    });

    it('should convert snake_case', () => {
      assert.strictEqual(toCamelCase('get_user'), 'getUser');
      assert.strictEqual(toCamelCase('post_user_profile'), 'postUserProfile');
    });

    it('should lowercase first character', () => {
      assert.strictEqual(toCamelCase('GetUser'), 'getUser');
      assert.strictEqual(toCamelCase('User'), 'user');
    });

    it('should handle single word', () => {
      assert.strictEqual(toCamelCase('user'), 'user');
      assert.strictEqual(toCamelCase('login'), 'login');
    });
  });

  describe('urlToFunctionName', () => {
    it('should convert simple path', () => {
      const result = urlToFunctionName('GET', '/api/users');
      assert.strictEqual(result, 'getApiUsers');
    });

    it('should handle path parameters with colon', () => {
      const result = urlToFunctionName('GET', '/api/users/:id');
      assert.strictEqual(result, 'getApiUsersById');
    });

    it('should handle path parameters with braces', () => {
      const result = urlToFunctionName('GET', '/api/users/{id}');
      assert.strictEqual(result, 'getApiUsersById');
    });

    it('should handle multiple path segments', () => {
      const result = urlToFunctionName('POST', '/api/users/:userId/posts');
      assert.strictEqual(result, 'postApiUsersByIdPosts');
    });

    it('should handle different HTTP methods', () => {
      assert.ok(urlToFunctionName('GET', '/api/test').startsWith('get'));
      assert.ok(urlToFunctionName('POST', '/api/test').startsWith('post'));
      assert.ok(urlToFunctionName('PUT', '/api/test').startsWith('put'));
      assert.ok(urlToFunctionName('DELETE', '/api/test').startsWith('delete'));
    });
  });

  describe('functionNameToTypeName', () => {
    it('should add Response suffix by default', () => {
      const result = functionNameToTypeName('getUser');
      assert.strictEqual(result, 'GetUserResponse');
    });

    it('should capitalize first letter', () => {
      const result = functionNameToTypeName('postUserProfile');
      assert.strictEqual(result, 'PostUserProfileResponse');
    });

    it('should use custom suffix', () => {
      const result = functionNameToTypeName('getUser', 'Request');
      assert.strictEqual(result, 'GetUserRequest');
    });

    it('should handle single word', () => {
      const result = functionNameToTypeName('login');
      assert.strictEqual(result, 'LoginResponse');
    });
  });
});
