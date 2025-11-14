/**
 * React Query 훅 생성기
 * Bruno 파일로부터 useQuery, useMutation, useInfiniteQuery 훅 생성
 */

import { ParsedBrunoFile, extractJsonFromDocs } from '../parser/bruParser';
import { generateTypeScriptInterface, urlToFunctionName, functionNameToTypeName, toCamelCase } from './typeGenerator';
import { ApiFunction, generateApiFunction } from './apiClientGenerator';

export interface ReactQueryHook {
  fileName: string;
  content: string;
  domain: string;
}

/**
 * React Query 훅 생성
 */
export function generateReactQueryHook(
  parsed: ParsedBrunoFile,
  apiFunc: ApiFunction,
  domain: string,
  axiosInstancePath: string = '@/utils/axiosInstance'
): ReactQueryHook {
  const { method } = apiFunc;

  // GET -> useQuery, POST/PUT/PATCH/DELETE -> useMutation
  const isQuery = method === 'GET';

  const content = isQuery
    ? generateUseQueryHook(parsed, apiFunc, domain, axiosInstancePath)
    : generateUseMutationHook(parsed, apiFunc, domain, axiosInstancePath);

  const fileName = `${method.toLowerCase()}-${apiFunc.name}.ts`;

  return {
    fileName,
    content,
    domain,
  };
}

/**
 * useQuery 훅 생성
 */
function generateUseQueryHook(
  parsed: ParsedBrunoFile,
  apiFunc: ApiFunction,
  domain: string,
  axiosInstancePath: string
): string {
  const { name, responseType, hasParams } = apiFunc;
  const hookName = `use${name.charAt(0).toUpperCase()}${name.slice(1)}`;

  const lines: string[] = [
    `import { AxiosError } from "axios";`,
    `import { axiosInstance } from "${axiosInstancePath}";`,
    `import { QueryKeys } from "../queryKeys";`,
    `import { useQuery } from "@tanstack/react-query";`,
    ``,
  ];

  // Response 타입 생성
  if (parsed.docs) {
    const jsonData = extractJsonFromDocs(parsed.docs);
    if (jsonData) {
      const typeDefs = generateTypeScriptInterface(jsonData, responseType);
      for (const typeDef of typeDefs) {
        lines.push(typeDef.content);
        lines.push('');
      }
    }
  } else {
    // docs가 없으면 기본 타입
    lines.push(`export interface ${responseType} {`);
    lines.push(`  // TODO: Define response type`);
    lines.push(`}`);
    lines.push('');
  }

  // API 함수 생성
  lines.push(generateApiFunction(apiFunc, domain));
  lines.push('');

  // 훅 파라미터
  const urlParams = extractUrlParams(apiFunc.url);
  const hookParams = urlParams.map(p => `${p}: string | number`);
  const optionalParams: string[] = ['params?: Record<string, any>'];

  const allParams = [...hookParams, ...optionalParams];
  const paramsStr = allParams.length > 0 ? allParams.join(', ') : '';

  // queryKey 생성 - request의 모든 값 포함 (URL params + query params)
  const queryKeyDomain = toCamelCase(domain);
  const queryKeyEndpoint = toCamelCase(apiFunc.name);
  let queryKeyStr = `[QueryKeys.${queryKeyDomain}.${queryKeyEndpoint}`;
  if (urlParams.length > 0) {
    queryKeyStr += `, ${urlParams.join(', ')}`;
  }
  // query params도 queryKey에 포함
  queryKeyStr += `, params]`;

  // 훅 생성
  lines.push(`const ${hookName} = (${paramsStr}) => {`);
  lines.push(`  return useQuery<${responseType}, AxiosError>({`);
  lines.push(`    queryKey: ${queryKeyStr},`);

  // queryFn
  const fnParams = [...urlParams.map(p => p), 'params'].filter(Boolean);
  const fnCallParams = fnParams.length > 0 ? `{ ${fnParams.join(', ')} }` : '';
  lines.push(`    queryFn: () => ${name}(${fnCallParams}),`);

  // 추가 옵션
  if (urlParams.length > 0) {
    const enableCondition = urlParams.map(p => `!!${p}`).join(' && ');
    lines.push(`    enabled: ${enableCondition},`);
  }

  lines.push(`  });`);
  lines.push(`};`);
  lines.push('');
  lines.push(`export default ${hookName};`);

  return lines.join('\n');
}

/**
 * useMutation 훅 생성
 */
function generateUseMutationHook(
  parsed: ParsedBrunoFile,
  apiFunc: ApiFunction,
  domain: string,
  axiosInstancePath: string
): string {
  const { name, responseType, method } = apiFunc;
  const hookName = `use${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  const requestType = responseType.replace('Response', 'Request');

  const lines: string[] = [
    `import { AxiosError } from "axios";`,
    `import { axiosInstance } from "${axiosInstancePath}";`,
    `import { useMutation } from "@tanstack/react-query";`,
    ``,
  ];

  // Request/Response 타입 생성
  if (parsed.body?.content) {
    try {
      const bodyData = JSON.parse(parsed.body.content);
      const requestTypeDefs = generateTypeScriptInterface(bodyData, requestType);
      for (const typeDef of requestTypeDefs) {
        lines.push(typeDef.content);
        lines.push('');
      }
    } catch {
      lines.push(`export interface ${requestType} {`);
      lines.push(`  // TODO: Define request type`);
      lines.push(`}`);
      lines.push('');
    }
  } else {
    lines.push(`export interface ${requestType} {`);
    lines.push(`  // TODO: Define request type`);
    lines.push(`}`);
    lines.push('');
  }

  if (parsed.docs) {
    const jsonData = extractJsonFromDocs(parsed.docs);
    if (jsonData) {
      const typeDefs = generateTypeScriptInterface(jsonData, responseType);
      for (const typeDef of typeDefs) {
        lines.push(typeDef.content);
        lines.push('');
      }
    }
  } else {
    lines.push(`export interface ${responseType} {`);
    lines.push(`  // TODO: Define response type`);
    lines.push(`}`);
    lines.push('');
  }

  // API 함수 생성
  lines.push(generateApiFunction(apiFunc, domain));
  lines.push('');

  // 훅 생성
  const urlParams = extractUrlParams(apiFunc.url);
  const mutationVariables = urlParams.length > 0
    ? `{ ${urlParams.map(p => `${p}: string | number;`).join(' ')} data: ${requestType} }`
    : requestType;

  lines.push(`const ${hookName} = () => {`);
  lines.push(`  return useMutation<${responseType}, AxiosError, ${mutationVariables}>({`);

  if (urlParams.length > 0) {
    lines.push(`    mutationFn: (variables) => ${name}(variables),`);
  } else {
    lines.push(`    mutationFn: (data) => ${name}({ data }),`);
  }

  lines.push(`  });`);
  lines.push(`};`);
  lines.push('');
  lines.push(`export default ${hookName};`);

  return lines.join('\n');
}

/**
 * URL에서 파라미터 추출
 */
function extractUrlParams(url: string): string[] {
  const params: string[] = [];
  const matches = url.matchAll(/:(\w+)|\{(\w+)\}/g);
  for (const match of matches) {
    const paramName = match[1] || match[2];
    params.push(paramName);
  }
  return params;
}

/**
 * useInfiniteQuery 훅 생성 (페이지네이션용)
 */
export function generateUseInfiniteQueryHook(
  parsed: ParsedBrunoFile,
  apiFunc: ApiFunction,
  domain: string,
  axiosInstancePath: string,
  pageParamName: string = 'page',
  nextPageField: string = 'nextPageNumber'
): string {
  const { name, responseType } = apiFunc;
  const hookName = `use${name.charAt(0).toUpperCase()}${name.slice(1)}`;

  const lines: string[] = [
    `import { AxiosError } from "axios";`,
    `import { axiosInstance } from "${axiosInstancePath}";`,
    `import { QueryKeys } from "../queryKeys";`,
    `import { useInfiniteQuery } from "@tanstack/react-query";`,
    ``,
  ];

  // Response 타입 생성
  if (parsed.docs) {
    const jsonData = extractJsonFromDocs(parsed.docs);
    if (jsonData) {
      const typeDefs = generateTypeScriptInterface(jsonData, responseType);
      for (const typeDef of typeDefs) {
        lines.push(typeDef.content);
        lines.push('');
      }
    }
  }

  // API 함수 생성 (페이지 파라미터 포함)
  lines.push(generateApiFunction(apiFunc, domain));
  lines.push('');

  // 훅 파라미터
  const urlParams = extractUrlParams(apiFunc.url);
  const hookParams = urlParams.map(p => `${p}: string | number`);
  const allParams = [...hookParams, 'size?: number'];
  const paramsStr = allParams.length > 0 ? allParams.join(', ') : '';

  // queryKey - request의 모든 값 포함 (URL params + query params)
  const queryKeyDomain = toCamelCase(domain);
  const queryKeyEndpoint = toCamelCase(apiFunc.name);
  let queryKeyStr = `[QueryKeys.${queryKeyDomain}.${queryKeyEndpoint}`;
  if (urlParams.length > 0) {
    queryKeyStr += `, ${urlParams.join(', ')}`;
  }
  // size는 pagination params이므로 queryKey에 포함
  queryKeyStr += `, size]`;

  // 훅 생성
  lines.push(`const ${hookName} = (${paramsStr}) => {`);
  lines.push(`  return useInfiniteQuery<${responseType}, AxiosError>({`);
  lines.push(`    queryKey: ${queryKeyStr},`);
  lines.push(`    queryFn: ({ pageParam = 0 }) => ${name}({ ${urlParams.join(', ')}, params: { size, ${pageParamName}: pageParam } }),`);
  lines.push(`    initialPageParam: 0,`);
  lines.push(`    getNextPageParam: (lastPage: ${responseType}) => {`);
  lines.push(`      return (lastPage as any).${nextPageField} === -1 ? undefined : (lastPage as any).${nextPageField};`);
  lines.push(`    },`);

  if (urlParams.length > 0) {
    const enableCondition = urlParams.map(p => `!!${p}`).join(' && ');
    lines.push(`    enabled: ${enableCondition},`);
  }

  lines.push(`  });`);
  lines.push(`};`);
  lines.push('');
  lines.push(`export default ${hookName};`);

  return lines.join('\n');
}
