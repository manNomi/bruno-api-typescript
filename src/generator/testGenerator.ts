/**
 * MSW 테스트 코드 자동 생성
 * React Query 훅을 MSW로 테스트하는 코드 생성
 */

import { ParsedBrunoFile } from '../parser/bruParser';

export interface TestFile {
  fileName: string;
  content: string;
}

/**
 * React Query 훅 테스트 코드 생성
 */
export function generateTest(
  parsed: ParsedBrunoFile,
  hookName: string,
  domain: string,
  responseData: any
): TestFile | null {
  const { method, url } = parsed.http;

  // Mutation인지 Query인지 판단
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

  const testContent = isMutation
    ? generateMutationTest(hookName, method, url, responseData, domain)
    : generateQueryTest(hookName, method, url, responseData, domain);

  return {
    fileName: `${hookName}.test.ts`,
    content: testContent,
  };
}

/**
 * Query 훅 테스트 생성 (GET)
 */
function generateQueryTest(
  hookName: string,
  method: string,
  url: string,
  responseData: any,
  domain: string
): string {
  const hookPath = `./${hookName}`;
  const responseJson = JSON.stringify(responseData, null, 4)
    .split('\n')
    .map((line, idx) => (idx === 0 ? line : `      ${line}`))
    .join('\n');

  return `import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { handlers } from '@/mocks/handlers';
import ${hookName} from '${hookPath}';

/**
 * MSW 서버 설정
 */
const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * React Query Wrapper
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('${hookName}', () => {
  it('성공: 데이터를 성공적으로 가져온다', async () => {
    const { result } = renderHook(() => ${hookName}(), {
      wrapper: createWrapper(),
    });

    // 로딩 상태 확인
    expect(result.current.isLoading).toBe(true);

    // 데이터 로드 대기
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 응답 데이터 검증
    expect(result.current.data).toEqual(
      ${responseJson}
    );
  });

  it('에러: 500 Internal Server Error', async () => {
    // MSW 핸들러 오버라이드
    server.use(
      http.${method.toLowerCase()}('${url}', () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => ${hookName}(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('에러: 404 Not Found', async () => {
    server.use(
      http.${method.toLowerCase()}('${url}', () => {
        return HttpResponse.json(
          { error: 'Not Found' },
          { status: 404 }
        );
      })
    );

    const { result } = renderHook(() => ${hookName}(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
`;
}

/**
 * Mutation 훅 테스트 생성 (POST, PUT, PATCH, DELETE)
 */
function generateMutationTest(
  hookName: string,
  method: string,
  url: string,
  responseData: any,
  domain: string
): string {
  const hookPath = `./${hookName}`;
  const responseJson = JSON.stringify(responseData, null, 4)
    .split('\n')
    .map((line, idx) => (idx === 0 ? line : `      ${line}`))
    .join('\n');

  return `import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { handlers } from '@/mocks/handlers';
import ${hookName} from '${hookPath}';

/**
 * MSW 서버 설정
 */
const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/**
 * React Query Wrapper
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('${hookName}', () => {
  it('성공: 요청이 성공적으로 처리된다', async () => {
    const { result } = renderHook(() => ${hookName}(), {
      wrapper: createWrapper(),
    });

    // mutate 호출
    result.current.mutate({
      // 요청 데이터 (필요시 수정)
    });

    // 성공 대기
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 응답 데이터 검증
    expect(result.current.data).toEqual(
      ${responseJson}
    );
  });

  it('성공: mutateAsync 사용', async () => {
    const { result } = renderHook(() => ${hookName}(), {
      wrapper: createWrapper(),
    });

    // mutateAsync 호출
    const response = await result.current.mutateAsync({
      // 요청 데이터 (필요시 수정)
    });

    expect(response).toEqual(
      ${responseJson}
    );
  });

  it('에러: 500 Internal Server Error', async () => {
    server.use(
      http.${method.toLowerCase()}('${url}', () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    const { result } = renderHook(() => ${hookName}(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({});

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('에러: 400 Bad Request', async () => {
    server.use(
      http.${method.toLowerCase()}('${url}', () => {
        return HttpResponse.json(
          { error: 'Bad Request', message: 'Invalid data' },
          { status: 400 }
        );
      })
    );

    const { result } = renderHook(() => ${hookName}(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({});

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('로딩: isPending 상태 확인', async () => {
    const { result } = renderHook(() => ${hookName}(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(false);

    result.current.mutate({});

    // mutate 직후에는 pending이어야 함
    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });
});
`;
}
