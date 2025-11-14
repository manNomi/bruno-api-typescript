/**
 * MSW (Mock Service Worker) 핸들러 생성
 * Bruno 파일에서 MSW 핸들러를 자동 생성
 */

import { ParsedBrunoFile, extractJsonFromDocs } from '../parser/bruParser';

export interface MSWHandler {
  domain: string;
  fileName: string;
  content: string;
}

/**
 * MSW 핸들러 생성
 * meta.done이 true이면 null 반환
 */
export function generateMSWHandler(
  parsed: ParsedBrunoFile,
  filePath: string,
  domain: string
): MSWHandler | null {
  // done 필드가 true이면 MSW 생성하지 않음
  if (parsed.meta.done === true) {
    return null;
  }

  // docs 블록에서 JSON 추출
  if (!parsed.docs) {
    console.warn(`⚠️  No docs block in ${filePath}, skipping MSW generation`);
    return null;
  }

  const responseJson = extractJsonFromDocs(parsed.docs);
  if (!responseJson) {
    console.warn(`⚠️  Invalid JSON in docs block in ${filePath}, skipping MSW generation`);
    return null;
  }

  const { method, url } = parsed.http;
  const handlerName = generateHandlerName(method, url);

  // MSW 핸들러 코드 생성
  const content = generateHandlerCode(method, url, responseJson);

  return {
    domain,
    fileName: `${handlerName}.ts`,
    content,
  };
}

/**
 * 핸들러 파일명 생성
 */
function generateHandlerName(method: string, url: string): string {
  // URL에서 경로 추출 및 클린업
  const cleanUrl = url
    .split('?')[0] // 쿼리 파라미터 제거
    .replace(/^\//, '') // 시작 슬래시 제거
    .replace(/\//g, '-') // 슬래시를 하이픈으로
    .replace(/:/g, '') // 콜론 제거 (path param)
    .replace(/\{|\}/g, ''); // 중괄호 제거

  return `${method.toLowerCase()}-${cleanUrl}`;
}

/**
 * MSW 핸들러 코드 생성
 */
function generateHandlerCode(method: string, url: string, responseData: any): string {
  const httpMethod = method.toLowerCase();
  const normalizedUrl = normalizeUrl(url);
  const responseJsonStr = JSON.stringify(responseData, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `    ${line}`))
    .join('\n');

  return `import { http, HttpResponse } from 'msw';

/**
 * ${method.toUpperCase()} ${url}
 * Auto-generated MSW handler
 */
export const handler = http.${httpMethod}('${normalizedUrl}', () => {
  return HttpResponse.json(
    ${responseJsonStr}
  );
});
`;
}

/**
 * URL 정규화
 * :param -> {param} 형식으로 변환 (MSW에서 사용)
 */
function normalizeUrl(url: string): string {
  // :param을 :param 형식으로 유지 (MSW는 :param 형식 지원)
  return url;
}

/**
 * 도메인별 핸들러 통합 파일 생성
 */
export function generateDomainHandlersIndex(
  domain: string,
  handlers: { fileName: string; handlerName: string }[]
): string {
  const imports = handlers
    .map((h, index) => {
      const varName = `handler${index + 1}`;
      const importPath = `./${h.fileName.replace('.ts', '')}`;
      return `import { handler as ${varName} } from '${importPath}';`;
    })
    .join('\n');

  const exportArray = handlers
    .map((_, index) => `  handler${index + 1}`)
    .join(',\n');

  return `${imports}

/**
 * ${domain} domain MSW handlers
 * Auto-generated from Bruno files
 */
export const ${domain}Handlers = [
${exportArray}
];
`;
}

/**
 * 전체 핸들러 통합 파일 생성
 */
export function generateMSWIndex(domains: string[]): string {
  const imports = domains
    .map(domain => `import { ${domain}Handlers } from './${domain}';`)
    .join('\n');

  const exportArray = domains
    .map(domain => `  ...${domain}Handlers`)
    .join(',\n');

  return `${imports}

/**
 * All MSW handlers
 * Auto-generated from Bruno files
 */
export const handlers = [
${exportArray}
];
`;
}
