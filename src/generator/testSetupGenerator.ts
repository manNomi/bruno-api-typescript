/**
 * 테스트 설정 파일 자동 생성
 * Vitest + MSW 설정
 */

export interface TestSetupFiles {
  vitestConfig: {
    fileName: string;
    content: string;
  };
  testSetup: {
    fileName: string;
    content: string;
  };
  packageJsonUpdates: {
    scripts: Record<string, string>;
    devDependencies: Record<string, string>;
  };
}

/**
 * 테스트 설정 파일 생성
 */
export function generateTestSetup(mswPath: string = './src/mocks'): TestSetupFiles {
  return {
    vitestConfig: {
      fileName: 'vitest.config.ts',
      content: generateVitestConfig(),
    },
    testSetup: {
      fileName: 'src/test/setup.ts',
      content: generateTestSetupFile(mswPath),
    },
    packageJsonUpdates: {
      scripts: {
        'test': 'vitest',
        'test:ui': 'vitest --ui',
        'test:coverage': 'vitest --coverage',
      },
      devDependencies: {
        'vitest': '^1.0.0',
        '@vitest/ui': '^1.0.0',
        '@testing-library/react': '^14.0.0',
        '@testing-library/jest-dom': '^6.1.5',
        'msw': '^2.0.0',
        'happy-dom': '^12.10.3',
      },
    },
  };
}

/**
 * vitest.config.ts 생성
 */
function generateVitestConfig(): string {
  return `import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.generated.ts',
        '**/mocks/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
`;
}

/**
 * src/test/setup.ts 생성
 */
function generateTestSetupFile(mswPath: string): string {
  return `/**
 * Vitest 전역 설정
 * MSW 서버 설정 및 전역 테스트 유틸리티
 */
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '${mswPath}/handlers';

/**
 * MSW 서버 설정
 */
export const server = setupServer(...handlers);

// MSW 서버 시작/종료
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error', // 처리되지 않은 요청 시 에러
  });
});

afterEach(() => {
  server.resetHandlers(); // 각 테스트 후 핸들러 초기화
});

afterAll(() => {
  server.close(); // 모든 테스트 종료 후 서버 닫기
});

/**
 * 전역 테스트 유틸리티
 */
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * React Query 테스트 래퍼
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // 테스트에서는 재시도 비활성화
        cacheTime: 0, // 캐시 비활성화
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function createWrapper() {
  const queryClient = createTestQueryClient();

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
`;
}

/**
 * README 사용법 생성
 */
export function generateTestSetupReadme(): string {
  return `# 테스트 설정 가이드

## 🚀 빠른 시작

\`\`\`bash
# 의존성 설치
npm install

# 테스트 실행
npm test

# UI 모드로 테스트
npm run test:ui

# 커버리지 확인
npm run test:coverage
\`\`\`

## 📖 사용법

### 기본 테스트

\`\`\`typescript
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createWrapper } from '@/test/setup';
import { useGetUsers } from '@/apis/users';

describe('useGetUsers', () => {
  it('사용자 목록을 가져온다', async () => {
    const { result } = renderHook(() => useGetUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});
\`\`\`

### MSW 핸들러 오버라이드

\`\`\`typescript
import { server } from '@/test/setup';
import { http, HttpResponse } from 'msw';

it('에러 처리', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json(
        { error: 'Server Error' },
        { status: 500 }
      );
    })
  );

  // 테스트 코드...
});
\`\`\`

## 🎯 테스트 커버리지 목표

- **최소**: 80%
- **목표**: 90%+

## 📚 추가 자료

- [Vitest 문서](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [MSW 문서](https://mswjs.io/)
`;
}
