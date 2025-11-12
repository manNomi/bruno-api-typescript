/**
 * Bruno 파일들을 OpenAPI 스펙으로 변환
 */

import { readdirSync, statSync } from 'fs';
import { join, relative, dirname, basename } from 'path';
import { parseBrunoFile, extractJsonFromDocs } from '../parser/bruParser';
import { inferSchema } from './schemaBuilder';

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components?: {
    schemas?: Record<string, any>;
    securitySchemes?: Record<string, any>;
  };
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

export interface ConversionOptions {
  title?: string;
  version?: string;
  description?: string;
  baseUrl?: string;
}

/**
 * Bruno 컬렉션을 OpenAPI로 변환
 */
export function convertBrunoToOpenAPI(
  brunoDir: string,
  options: ConversionOptions = {}
): OpenAPISpec {
  const spec: OpenAPISpec = {
    openapi: '3.0.0',
    info: {
      title: options.title || 'API',
      version: options.version || '1.0.0',
      description: options.description,
    },
    paths: {},
    components: {
      schemas: {},
    },
    tags: [],
  };

  if (options.baseUrl) {
    spec.servers = [{ url: options.baseUrl }];
  }

  // Bruno 파일들 수집
  const brunoFiles = collectBrunoFiles(brunoDir);

  // 도메인별로 그룹화
  const domainMap = new Map<string, any[]>();

  for (const file of brunoFiles) {
    try {
      const parsed = parseBrunoFile(file);
      const domain = extractDomain(file, brunoDir);

      if (!domainMap.has(domain)) {
        domainMap.set(domain, []);
      }

      domainMap.get(domain)!.push({
        file,
        parsed,
      });

      // OpenAPI 경로 추가
      addPathToSpec(spec, parsed, domain);
    } catch (error: any) {
      console.warn(`Failed to parse ${file}:`, error.message);
    }
  }

  // 태그 추가
  for (const domain of domainMap.keys()) {
    spec.tags!.push({
      name: domain,
      description: `${domain} related endpoints`,
    });
  }

  return spec;
}

/**
 * .bru 파일들 수집
 */
function collectBrunoFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (entry.endsWith('.bru')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * 파일 경로에서 도메인 추출
 */
function extractDomain(filePath: string, brunoDir: string): string {
  const rel = relative(brunoDir, filePath);
  const parts = rel.split('/');
  return parts[0] || 'default';
}

/**
 * OpenAPI 스펙에 경로 추가
 */
function addPathToSpec(spec: OpenAPISpec, parsed: any, domain: string): void {
  const { method, url } = parsed.http;
  const path = normalizeUrl(url);

  if (!spec.paths[path]) {
    spec.paths[path] = {};
  }

  const operation: any = {
    tags: [domain],
    summary: parsed.meta.name || `${method} ${path}`,
    operationId: generateOperationId(method, path, domain),
    parameters: [],
    responses: {
      '200': {
        description: 'Successful response',
      },
    },
  };

  // Headers
  if (parsed.headers) {
    for (const [key, value] of Object.entries(parsed.headers)) {
      operation.parameters.push({
        name: key,
        in: 'header',
        required: false,
        schema: { type: 'string' },
        example: value,
      });
    }
  }

  // Request body
  if (parsed.body && parsed.body.content) {
    try {
      const bodyJson = JSON.parse(parsed.body.content);
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: inferSchema(bodyJson),
          },
        },
      };
    } catch (error) {
      // Invalid JSON
    }
  }

  // Response from docs
  if (parsed.docs) {
    const responseJson = extractJsonFromDocs(parsed.docs);
    if (responseJson) {
      operation.responses['200'] = {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: inferSchema(responseJson),
          },
        },
      };
    }
  }

  spec.paths[path][method.toLowerCase()] = operation;
}

/**
 * URL 정규화 (OpenAPI 경로 형식으로)
 */
function normalizeUrl(url: string): string {
  // Query parameters 제거
  const withoutQuery = url.split('?')[0];

  // :param -> {param} 변환
  return withoutQuery.replace(/:(\w+)/g, '{$1}');
}

/**
 * Operation ID 생성
 */
function generateOperationId(method: string, path: string, domain: string): string {
  const cleanPath = path
    .replace(/\{|\}/g, '')
    .replace(/\//g, '-')
    .replace(/^-|-$/g, '');

  return `${method.toLowerCase()}-${domain}-${cleanPath}`;
}
