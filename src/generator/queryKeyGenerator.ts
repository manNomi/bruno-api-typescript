/**
 * React Query Key 생성기
 * Bruno 폴더 구조를 기반으로 Query Key 생성
 */

import { ParsedBrunoFile } from '../parser/bruParser';
import { toCamelCase } from './typeGenerator';

export interface QueryKeyStructure {
  [domain: string]: {
    [endpoint: string]: string;
  };
}

/**
 * Bruno 파일들로부터 Query Key 구조 생성
 */
export function generateQueryKeyStructure(
  files: Array<{ path: string; parsed: ParsedBrunoFile; domain?: string }>
): QueryKeyStructure {
  const structure: QueryKeyStructure = {};

  for (const file of files) {
    const { path, parsed, domain: fileDomain } = file;

    // domain이 제공되면 사용, 아니면 경로에서 추출
    let domain = fileDomain;
    if (!domain) {
      // 파일 경로에서 도메인 추출 (예: bruno/applications/get-competitors.bru -> applications)
      const pathParts = path.split('/');
      const brunoIndex = pathParts.findIndex(part => part === 'bruno' || part.startsWith('bruno-'));

      if (brunoIndex === -1 || brunoIndex === pathParts.length - 1) continue;

      domain = pathParts[brunoIndex + 1];
    }

    const fileName = path.split('/').pop()?.replace('.bru', '') || '';

    if (!structure[domain]) {
      structure[domain] = {};
    }

    // 파일명을 camelCase로 변환
    const keyName = toCamelCase(fileName);
    structure[domain][keyName] = `${domain}.${keyName}`;
  }

  return structure;
}

/**
 * Query Key 구조를 TypeScript 코드로 변환
 */
export function queryKeyStructureToCode(structure: QueryKeyStructure): string {
  const lines: string[] = [
    '/**',
    ' * React Query Keys',
    ' * Bruno 폴더 구조를 기반으로 자동 생성됨',
    ' */',
    '',
    'export const QueryKeys = {',
  ];

  for (const [domain, endpoints] of Object.entries(structure)) {
    lines.push(`  ${domain}: {`);

    for (const [endpoint, value] of Object.entries(endpoints)) {
      lines.push(`    ${endpoint}: '${value}' as const,`);
    }

    lines.push('  },');
  }

  lines.push('} as const;');
  lines.push('');
  lines.push('export type QueryKey = typeof QueryKeys[keyof typeof QueryKeys];');

  return lines.join('\n');
}

/**
 * Query Key 파일 생성
 */
export function generateQueryKeyFile(
  files: Array<{ path: string; parsed: ParsedBrunoFile }>
): string {
  const structure = generateQueryKeyStructure(files);
  return queryKeyStructureToCode(structure);
}
