import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  generateQueryKeyStructure,
  queryKeyStructureToCode,
  generateQueryKeyFile,
} from './queryKeyGenerator';
import { ParsedBrunoFile } from '../parser/bruParser';

describe('queryKeyGenerator', () => {
  const createParsedFile = (name: string): ParsedBrunoFile => ({
    meta: { name, type: 'http' },
    http: { method: 'GET', url: '/api/test' },
  });

  describe('generateQueryKeyStructure', () => {
    it('should generate structure from files with domain', () => {
      const files = [
        {
          path: '/project/bruno/users/get-user.bru',
          parsed: createParsedFile('Get User'),
          domain: 'users',
        },
        {
          path: '/project/bruno/users/post-user.bru',
          parsed: createParsedFile('Post User'),
          domain: 'users',
        },
        {
          path: '/project/bruno/posts/get-posts.bru',
          parsed: createParsedFile('Get Posts'),
          domain: 'posts',
        },
      ];

      const result = generateQueryKeyStructure(files);

      assert.ok(result.users);
      assert.ok(result.posts);
      assert.strictEqual(result.users.getUser, 'users.getUser');
      assert.strictEqual(result.users.postUser, 'users.postUser');
      assert.strictEqual(result.posts.getPosts, 'posts.getPosts');
    });

    it('should extract domain from path when not provided', () => {
      const files = [
        {
          path: '/project/bruno/applications/get-competitors.bru',
          parsed: createParsedFile('Get Competitors'),
        },
      ];

      const result = generateQueryKeyStructure(files);

      assert.ok(result.applications);
      assert.strictEqual(result.applications.getCompetitors, 'applications.getCompetitors');
    });

    it('should convert kebab-case to camelCase', () => {
      const files = [
        {
          path: '/project/bruno/api/get-user-profile.bru',
          parsed: createParsedFile('Get User Profile'),
          domain: 'api',
        },
      ];

      const result = generateQueryKeyStructure(files);

      assert.strictEqual(result.api.getUserProfile, 'api.getUserProfile');
    });

    it('should handle multiple domains', () => {
      const files = [
        { path: 'bruno/auth/login.bru', parsed: createParsedFile('Login'), domain: 'auth' },
        { path: 'bruno/auth/logout.bru', parsed: createParsedFile('Logout'), domain: 'auth' },
        { path: 'bruno/users/get-user.bru', parsed: createParsedFile('Get User'), domain: 'users' },
        { path: 'bruno/posts/get-posts.bru', parsed: createParsedFile('Get Posts'), domain: 'posts' },
      ];

      const result = generateQueryKeyStructure(files);

      assert.deepStrictEqual(Object.keys(result).sort(), ['auth', 'posts', 'users']);
    });
  });

  describe('queryKeyStructureToCode', () => {
    it('should generate valid TypeScript code', () => {
      const structure = {
        users: {
          getUser: 'users.getUser',
          postUser: 'users.postUser',
        },
        posts: {
          getPosts: 'posts.getPosts',
        },
      };

      const code = queryKeyStructureToCode(structure);

      assert.ok(code.includes('export const QueryKeys = {'));
      assert.ok(code.includes("users: {"));
      assert.ok(code.includes("getUser: 'users.getUser' as const,"));
      assert.ok(code.includes("postUser: 'users.postUser' as const,"));
      assert.ok(code.includes("posts: {"));
      assert.ok(code.includes("getPosts: 'posts.getPosts' as const,"));
      assert.ok(code.includes('} as const;'));
      assert.ok(code.includes('export type QueryKey = typeof QueryKeys'));
    });

    it('should include header comments', () => {
      const structure = { test: { key: 'test.key' } };
      const code = queryKeyStructureToCode(structure);

      assert.ok(code.includes('React Query Keys'));
      assert.ok(code.includes('Bruno 폴더 구조를 기반으로 자동 생성됨'));
    });

    it('should handle empty structure', () => {
      const structure = {};
      const code = queryKeyStructureToCode(structure);

      assert.ok(code.includes('export const QueryKeys = {'));
      assert.ok(code.includes('} as const;'));
    });
  });

  describe('generateQueryKeyFile', () => {
    it('should generate complete query key file', () => {
      const files = [
        {
          path: 'bruno/users/get-user.bru',
          parsed: createParsedFile('Get User'),
          domain: 'users',
        },
      ];

      const code = generateQueryKeyFile(files);

      assert.ok(code.includes('export const QueryKeys'));
      assert.ok(code.includes('users'));
      assert.ok(code.includes('getUser'));
    });
  });
});
