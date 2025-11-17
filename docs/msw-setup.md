# MSW (Mock Service Worker) 설정 가이드

Bruno 파일에서 자동 생성된 MSW 핸들러를 프론트엔드 프로젝트에 통합하는 가이드입니다.

## 목차

1. [개요](#개요)
2. [MSW 설치](#msw-설치)
3. [핸들러 생성](#핸들러-생성)
4. [브라우저 설정](#브라우저-설정)
5. [React 프로젝트 통합](#react-프로젝트-통합)
6. [Next.js 설정](#nextjs-설정)
7. [Vite 설정](#vite-설정)
8. [조건부 활성화](#조건부-활성화)
9. [커스텀 핸들러](#커스텀-핸들러)
10. [디버깅](#디버깅)

---

## 개요

### MSW란?

MSW(Mock Service Worker)는 Service Worker를 사용해 네트워크 요청을 가로채고 모킹하는 라이브러리입니다.

### 자동 생성 핸들러의 특징

- `meta.done: false` 또는 생략된 Bruno 파일만 MSW 핸들러 생성
- `docs` 블록의 JSON 응답을 그대로 반환
- 모든 HTTP 메서드 지원 (GET, POST, PUT, DELETE 등)
- 경로 파라미터 자동 처리

### 생성되는 파일 구조

```
src/mocks/
├── handlers.ts           # 전체 핸들러 통합
├── users/
│   ├── get-api-users-id.ts
│   ├── post-api-users.ts
│   └── index.ts
└── posts/
    ├── get-api-posts.ts
    └── index.ts
```

---

## MSW 설치

### npm

```bash
npm install msw --save-dev
```

### yarn

```bash
yarn add msw --dev
```

### pnpm

```bash
pnpm add -D msw
```

### Service Worker 파일 생성

```bash
npx msw init public/ --save
```

이 명령은 `public/mockServiceWorker.js` 파일을 생성합니다.

---

## 핸들러 생성

### 기본 생성

```bash
npx bruno-api generate-hooks \
  -i ./bruno \
  -o ./src/apis \
  --msw-output ./src/mocks
```

### 생성되는 핸들러 예시

```typescript
// src/mocks/users/get-api-users-id.ts
import { http, HttpResponse } from 'msw';

/**
 * GET /api/users/:id
 * Auto-generated MSW handler
 */
export const handler = http.get('/api/users/:id', () => {
  return HttpResponse.json({
    id: 1,
    name: "홍길동",
    email: "hong@example.com"
  });
});
```

### 도메인별 통합 파일

```typescript
// src/mocks/users/index.ts
import { handler as handler1 } from './get-api-users-id';
import { handler as handler2 } from './post-api-users';

export const usersHandlers = [
  handler1,
  handler2
];
```

### 전체 핸들러 통합

```typescript
// src/mocks/handlers.ts
import { usersHandlers } from './users';
import { postsHandlers } from './posts';

export const handlers = [
  ...usersHandlers,
  ...postsHandlers
];
```

---

## 브라우저 설정

### Worker 설정 파일 생성

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### 기본 시작 옵션

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

export const startWorker = async () => {
  await worker.start({
    onUnhandledRequest: 'bypass',  // 처리되지 않은 요청은 실제 서버로
  });
};
```

---

## React 프로젝트 통합

### Create React App

```typescript
// src/index.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

async function prepare() {
  if (process.env.NODE_ENV === 'development') {
    const { worker } = await import('./mocks/browser');
    await worker.start();
  }
}

prepare().then(() => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

### Environment Variable로 제어

```typescript
// src/index.tsx
async function enableMocking() {
  if (process.env.REACT_APP_ENABLE_MSW !== 'true') {
    return;
  }

  const { worker } = await import('./mocks/browser');
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
  // React 앱 시작
});
```

```bash
# .env.development
REACT_APP_ENABLE_MSW=true
```

---

## Next.js 설정

### App Router (Next.js 13+)

```typescript
// src/app/providers.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [isMswReady, setIsMswReady] = useState(false);

  useEffect(() => {
    async function enableMocking() {
      if (process.env.NODE_ENV !== 'development') {
        setIsMswReady(true);
        return;
      }

      const { worker } = await import('@/mocks/browser');
      await worker.start({
        onUnhandledRequest: 'bypass',
      });
      setIsMswReady(true);
    }

    enableMocking();
  }, []);

  if (!isMswReady) {
    return null; // 또는 로딩 스피너
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

```typescript
// src/app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Pages Router

```typescript
// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';

function MyApp({ Component, pageProps }: AppProps) {
  const [isMswReady, setIsMswReady] = useState(false);

  useEffect(() => {
    async function initMsw() {
      if (process.env.NODE_ENV === 'development') {
        const { worker } = await import('@/mocks/browser');
        await worker.start();
      }
      setIsMswReady(true);
    }

    initMsw();
  }, []);

  if (!isMswReady) {
    return <div>Loading...</div>;
  }

  return <Component {...pageProps} />;
}

export default MyApp;
```

---

## Vite 설정

### 기본 설정

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

async function enableMocking() {
  if (import.meta.env.MODE !== 'development') {
    return;
  }

  const { worker } = await import('./mocks/browser');
  return worker.start({
    onUnhandledRequest: 'bypass',
  });
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

### 환경 변수 사용

```typescript
// .env.development
VITE_ENABLE_MSW=true
```

```typescript
// src/main.tsx
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') {
    return;
  }

  const { worker } = await import('./mocks/browser');
  return worker.start();
}
```

---

## 조건부 활성화

### 특정 API만 모킹

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { usersHandlers } from './users';
// postsHandlers는 제외 - 실제 서버 사용

export const worker = setupWorker(...usersHandlers);
```

### 환경별 핸들러 분리

```typescript
// src/mocks/handlers.ts
import { usersHandlers } from './users';
import { postsHandlers } from './posts';

const devHandlers = [
  ...usersHandlers,
  ...postsHandlers,
];

const stagingHandlers = [
  ...usersHandlers,
  // posts는 실제 서버 사용
];

export const handlers =
  process.env.NODE_ENV === 'development'
    ? devHandlers
    : stagingHandlers;
```

### done 필드로 제어

Bruno 파일에서 `done: true`로 설정하면 해당 API의 MSW 핸들러가 생성되지 않습니다:

```bru
meta {
  name: Get User
  type: http
  done: true  # ← 백엔드 완료, MSW 생성 안 함
}
```

재생성 시:
```bash
npx bruno-api generate-hooks --msw-output ./src/mocks
```

---

## 커스텀 핸들러

### 생성된 핸들러 확장

자동 생성된 핸들러는 정적 응답만 반환합니다. 동적 로직이 필요하면 커스텀 핸들러를 추가하세요:

```typescript
// src/mocks/custom-handlers.ts
import { http, HttpResponse } from 'msw';

// 동적 ID 생성
export const createUserHandler = http.post('/api/users', async ({ request }) => {
  const body = await request.json() as { name: string; email: string };

  return HttpResponse.json({
    id: Date.now(),
    name: body.name,
    email: body.email,
    createdAt: new Date().toISOString(),
  });
});

// 조건부 응답
export const getUserHandler = http.get('/api/users/:id', ({ params }) => {
  const { id } = params;

  if (id === 'not-found') {
    return new HttpResponse(null, { status: 404 });
  }

  return HttpResponse.json({
    id: Number(id),
    name: `User ${id}`,
    email: `user${id}@example.com`,
  });
});

// 에러 시뮬레이션
export const errorHandler = http.get('/api/error', () => {
  return HttpResponse.json(
    { error: 'Internal Server Error' },
    { status: 500 }
  );
});

// 딜레이 추가
export const slowHandler = http.get('/api/slow', async () => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  return HttpResponse.json({ data: 'slow response' });
});
```

### 커스텀 핸들러 통합

```typescript
// src/mocks/handlers.ts
import { usersHandlers } from './users';
import { postsHandlers } from './posts';
import {
  createUserHandler,
  getUserHandler,
  errorHandler,
  slowHandler,
} from './custom-handlers';

export const handlers = [
  // 커스텀 핸들러가 우선 (먼저 매칭됨)
  createUserHandler,
  getUserHandler,
  errorHandler,
  slowHandler,

  // 자동 생성된 핸들러
  ...usersHandlers,
  ...postsHandlers,
];
```

### 상태 관리 (인메모리 DB)

```typescript
// src/mocks/db.ts
interface User {
  id: number;
  name: string;
  email: string;
}

let users: User[] = [
  { id: 1, name: '홍길동', email: 'hong@example.com' },
  { id: 2, name: '김철수', email: 'kim@example.com' },
];

let nextId = 3;

export const db = {
  users: {
    getAll: () => users,
    getById: (id: number) => users.find(u => u.id === id),
    create: (data: Omit<User, 'id'>) => {
      const user = { ...data, id: nextId++ };
      users.push(user);
      return user;
    },
    update: (id: number, data: Partial<User>) => {
      const index = users.findIndex(u => u.id === id);
      if (index === -1) return null;
      users[index] = { ...users[index], ...data };
      return users[index];
    },
    delete: (id: number) => {
      const index = users.findIndex(u => u.id === id);
      if (index === -1) return false;
      users.splice(index, 1);
      return true;
    },
  },
};
```

```typescript
// src/mocks/custom-handlers.ts
import { http, HttpResponse } from 'msw';
import { db } from './db';

export const statefulHandlers = [
  http.get('/api/users', () => {
    return HttpResponse.json({ users: db.users.getAll() });
  }),

  http.get('/api/users/:id', ({ params }) => {
    const user = db.users.getById(Number(params.id));
    if (!user) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json() as { name: string; email: string };
    const user = db.users.create(body);
    return HttpResponse.json(user, { status: 201 });
  }),

  http.delete('/api/users/:id', ({ params }) => {
    const deleted = db.users.delete(Number(params.id));
    if (!deleted) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ success: true });
  }),
];
```

---

## 디버깅

### 콘솔 로그 활성화

```typescript
// src/mocks/browser.ts
export const worker = setupWorker(...handlers);

worker.events.on('request:start', ({ request }) => {
  console.log('[MSW] Request:', request.method, request.url);
});

worker.events.on('request:match', ({ request }) => {
  console.log('[MSW] Matched:', request.method, request.url);
});

worker.events.on('request:unhandled', ({ request }) => {
  console.warn('[MSW] Unhandled:', request.method, request.url);
});
```

### 처리되지 않은 요청 처리

```typescript
await worker.start({
  onUnhandledRequest(request, print) {
    // 특정 URL 패턴 무시
    if (request.url.includes('hot-update')) {
      return;
    }

    // 경고 출력
    print.warning();
  },
});
```

### DevTools에서 확인

1. 브라우저 DevTools 열기 (F12)
2. Application 탭 → Service Workers
3. `mockServiceWorker.js` 활성화 확인
4. Network 탭에서 요청에 `(from service worker)` 표시 확인

### 일반적인 문제

#### Service Worker가 등록되지 않음

```bash
# public 폴더에 mockServiceWorker.js 파일 확인
ls public/mockServiceWorker.js

# 없으면 재생성
npx msw init public/ --save
```

#### 요청이 가로채지지 않음

```typescript
// URL 경로 확인 - baseURL 포함 여부
const axiosInstance = axios.create({
  baseURL: '/api',  // MSW 핸들러의 URL과 일치해야 함
});

// MSW 핸들러
http.get('/api/users', ...)  // ✅ baseURL 포함
http.get('/users', ...)       // ❌ baseURL 미포함
```

#### TypeScript 타입 에러

```bash
npm install @types/msw --save-dev
```

---

## 테스트와 통합

### Jest/Vitest에서 MSW 사용

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```typescript
// src/setupTests.ts
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 테스트별 핸들러 오버라이드

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

test('handles server error', async () => {
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
```

---

## 다음 단계

- [Bruno 파일 작성법](bruno-file-guide.md) - MSW 핸들러 생성을 위한 Bruno 파일 작성
- [GitHub Actions 설정](github-actions-setup.md) - CI/CD에서 MSW 핸들러 자동 생성
- [문제 해결](troubleshooting.md) - MSW 관련 문제 해결

---

**[← 문서 목록으로](README.md)**
