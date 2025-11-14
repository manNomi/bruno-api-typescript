# MSW (Mock Service Worker) 사용 가이드

> **Bruno 파일에서 MSW 핸들러를 자동으로 생성하여 프론트엔드 개발을 가속화하세요**

## 📋 목차

1. [MSW란?](#msw란)
2. [왜 MSW를 사용하나요?](#왜-msw를-사용하나요)
3. [시작하기](#시작하기)
4. [MSW 핸들러 생성](#msw-핸들러-생성)
5. [생성된 파일 구조](#생성된-파일-구조)
6. [프로젝트에 적용하기](#프로젝트에-적용하기)
7. [done 필드로 제어하기](#done-필드로-제어하기)
8. [고급 사용법](#고급-사용법)
9. [문제 해결](#문제-해결)

---

## MSW란?

MSW (Mock Service Worker)는 Service Worker API를 사용하여 네트워크 요청을 가로채고 모의 응답을 제공하는 라이브러리입니다.

**주요 특징:**
- 실제 HTTP 요청을 가로챔 (네트워크 레벨에서 동작)
- 프로덕션 코드 변경 없이 사용 가능
- 브라우저와 Node.js 모두 지원
- TypeScript 지원

---

## 왜 MSW를 사용하나요?

### ❌ 기존 방식의 문제점

**1. 백엔드 의존성**
```typescript
// 백엔드가 준비될 때까지 개발 불가
const { data } = await fetch('/api/users');
```

**2. 하드코딩된 Mock 데이터**
```typescript
// 프로덕션 코드에 Mock 데이터가 침투
const mockData = isDev ? fakeUsers : await fetchUsers();
```

**3. API 클라이언트 교체**
```typescript
// Mock용 클라이언트와 실제 클라이언트를 교체해야 함
const api = isDev ? mockApi : realApi;
```

### ✅ MSW의 장점

**1. 백엔드 독립적 개발**
```typescript
// 백엔드가 없어도 실제 API 호출로 개발
const { data } = await fetch('/api/users'); // MSW가 가로챔
```

**2. 깨끗한 코드**
```typescript
// 프로덕션 코드는 그대로, Mock은 별도 관리
const { data } = await fetch('/api/users');
```

**3. 실제와 동일한 흐름**
```typescript
// 실제 네트워크 스택 사용
axios.get('/api/users'); // MSW가 응답 제공
```

---

## 시작하기

### 1. MSW 설치

```bash
npm install -D msw
```

### 2. Service Worker 생성

```bash
npx msw init public/ --save
```

이 명령은 `public/mockServiceWorker.js` 파일을 생성합니다.

---

## MSW 핸들러 생성

### 기본 사용법

```bash
npx bruno-api generate-hooks \
  -i ./bruno \
  -o ./src/apis \
  --msw-output ./src/mocks
```

**옵션:**
- `-i, --input`: Bruno 파일 디렉토리
- `-o, --output`: React Query 훅 출력 디렉토리
- `--msw-output`: **MSW 핸들러 출력 디렉토리**

### package.json 스크립트

```json
{
  "scripts": {
    "api:generate": "bruno-api generate-hooks -i ./bruno -o ./src/apis --msw-output ./src/mocks",
    "api:hooks": "bruno-api generate-hooks -i ./bruno -o ./src/apis",
    "api:mocks-only": "bruno-api generate-hooks -i ./bruno -o ./src/apis --msw-output ./src/mocks"
  }
}
```

---

## 생성된 파일 구조

### 디렉토리 구조

```
src/mocks/
├── admin/                    # 도메인별 디렉토리
│   ├── get-list.ts          # GET /api/admin/list
│   ├── post-create.ts       # POST /api/admin/create
│   ├── put-update-id.ts     # PUT /api/admin/update/:id
│   └── index.ts             # admin 도메인 핸들러 통합
├── users/
│   ├── get-profile.ts       # GET /api/users/profile
│   ├── post-login.ts        # POST /api/users/login
│   └── index.ts             # users 도메인 핸들러 통합
└── handlers.ts              # 모든 핸들러 통합
```

### 생성된 핸들러 예시

**admin/get-list.ts:**
```typescript
import { http, HttpResponse } from 'msw';

/**
 * GET /api/admin/list
 * Auto-generated MSW handler
 */
export const handler = http.get('/api/admin/list', () => {
  return HttpResponse.json(
    {
      "users": [
        {
          "id": 1,
          "name": "홍길동",
          "email": "hong@example.com",
          "role": "admin"
        },
        {
          "id": 2,
          "name": "김철수",
          "email": "kim@example.com",
          "role": "user"
        }
      ],
      "total": 2,
      "page": 1
    }
  );
});
```

**admin/index.ts:**
```typescript
import { handler as handler1 } from './get-list';
import { handler as handler2 } from './post-create';

/**
 * admin domain MSW handlers
 * Auto-generated from Bruno files
 */
export const adminHandlers = [
  handler1,
  handler2
];
```

**handlers.ts:**
```typescript
import { adminHandlers } from './admin';
import { usersHandlers } from './users';

/**
 * All MSW handlers
 * Auto-generated from Bruno files
 */
export const handlers = [
  ...adminHandlers,
  ...usersHandlers
];
```

---

## 프로젝트에 적용하기

### 1. 브라우저 Worker 설정

**src/mocks/browser.ts 생성:**
```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

### 2. 앱 진입점에서 시작

**React (Vite) - src/main.tsx:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

async function enableMocking() {
  if (import.meta.env.MODE !== 'development') {
    return;
  }

  const { worker } = await import('./mocks/browser');

  // `onUnhandledRequest: 'bypass'`를 사용하여
  // Mock되지 않은 요청은 실제 서버로 전달
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

**React (CRA) - src/index.tsx:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

if (process.env.NODE_ENV === 'development') {
  const { worker } = require('./mocks/browser');
  worker.start({
    onUnhandledRequest: 'bypass',
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Next.js - app/layout.tsx:**
```typescript
'use client';

import { useEffect } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const { worker } = require('@/mocks/browser');
      worker.start({
        onUnhandledRequest: 'bypass',
      });
    }
  }, []);

  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

### 3. 환경별 제어

**.env.development:**
```bash
VITE_ENABLE_MSW=true
```

**.env.production:**
```bash
VITE_ENABLE_MSW=false
```

**조건부 MSW 시작:**
```typescript
async function enableMocking() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') {
    return;
  }

  const { worker } = await import('./mocks/browser');
  return worker.start();
}
```

---

## done 필드로 제어하기

### 언제 done을 사용하나요?

| 상황 | done 설정 | MSW 생성 | 이유 |
|------|----------|---------|------|
| 백엔드 개발 중 | ❌ (생략) | ✅ 생성 | 프론트엔드가 Mock으로 개발 |
| 백엔드 완료 | ✅ `done: true` | ❌ 건너뛰기 | 실제 API 사용 |
| 레거시 API | ✅ `done: true` | ❌ 건너뛰기 | 이미 운영 중 |
| 외부 API | ✅ `done: true` | ❌ 건너뛰기 | 외부 서비스 사용 |

### 사용 예시

**백엔드 개발 중 (MSW 필요):**
```bru
meta {
  name: Get Admin List
  type: http
  seq: 1
}

get /api/admin/list

docs {
  ```json
  {
    "users": [
      { "id": 1, "name": "홍길동" }
    ]
  }
  ```
}
```
→ **MSW 핸들러 생성됨** (`mocks/admin/get-list.ts`)

**백엔드 완료 (MSW 불필요):**
```bru
meta {
  name: Get User Profile
  type: http
  seq: 1
  done: true  # 백엔드 완료!
}

get /api/users/profile

docs {
  ```json
  {
    "id": 1,
    "name": "홍길동"
  }
  ```
}
```
→ **MSW 핸들러 생성 건너뜀**

### 하이브리드 개발

일부 API는 Mock, 일부는 실제 서버 사용:

```
bruno/
├── 관리자 [admin]/
│   ├── get-list.bru        # done 없음 → MSW 생성
│   └── post-create.bru     # done 없음 → MSW 생성
└── 사용자 [users]/
    ├── get-profile.bru     # done: true → 실제 API
    └── post-login.bru      # done: true → 실제 API
```

이 경우:
- `/api/admin/*` → MSW가 응답
- `/api/users/*` → 실제 백엔드 서버가 응답

---

## 고급 사용법

### 1. 동적 응답

생성된 핸들러를 수정하여 동적 응답 추가:

```typescript
import { http, HttpResponse } from 'msw';

export const handler = http.get('/api/admin/list', ({ request }) => {
  const url = new URL(request.url);
  const page = url.searchParams.get('page') || '1';
  const limit = url.searchParams.get('limit') || '10';

  const users = generateMockUsers(Number(page), Number(limit));

  return HttpResponse.json({
    users,
    total: 100,
    page: Number(page),
    limit: Number(limit)
  });
});

function generateMockUsers(page: number, limit: number) {
  return Array.from({ length: limit }, (_, i) => ({
    id: (page - 1) * limit + i + 1,
    name: `사용자 ${(page - 1) * limit + i + 1}`,
    email: `user${(page - 1) * limit + i + 1}@example.com`
  }));
}
```

### 2. 지연 시뮬레이션

네트워크 지연을 시뮬레이션:

```typescript
import { http, HttpResponse, delay } from 'msw';

export const handler = http.get('/api/admin/list', async () => {
  // 2초 지연
  await delay(2000);

  return HttpResponse.json({
    users: [/* ... */]
  });
});
```

### 3. 에러 응답

에러 케이스 테스트:

```typescript
import { http, HttpResponse } from 'msw';

export const handler = http.get('/api/admin/list', ({ request }) => {
  const url = new URL(request.url);
  const simulateError = url.searchParams.get('error');

  if (simulateError === '401') {
    return new HttpResponse(null, { status: 401 });
  }

  if (simulateError === '500') {
    return new HttpResponse(null, { status: 500 });
  }

  return HttpResponse.json({
    users: [/* ... */]
  });
});
```

### 4. 상태 저장

In-memory 데이터베이스 구현:

```typescript
// src/mocks/db.ts
export const db = {
  users: [
    { id: 1, name: '홍길동', email: 'hong@example.com' },
    { id: 2, name: '김철수', email: 'kim@example.com' }
  ]
};

// src/mocks/admin/get-list.ts
import { http, HttpResponse } from 'msw';
import { db } from '../db';

export const handler = http.get('/api/admin/list', () => {
  return HttpResponse.json({
    users: db.users
  });
});

// src/mocks/admin/post-create.ts
import { http, HttpResponse } from 'msw';
import { db } from '../db';

export const handler = http.post('/api/admin/create', async ({ request }) => {
  const body = await request.json();
  const newUser = {
    id: db.users.length + 1,
    ...body
  };

  db.users.push(newUser);

  return HttpResponse.json(newUser, { status: 201 });
});
```

---

## 문제 해결

### Q1: MSW가 작동하지 않아요

**해결책:**

1. Service Worker 파일 확인:
```bash
ls public/mockServiceWorker.js
```

2. Worker 시작 확인:
```typescript
worker.start({
  onUnhandledRequest: 'warn' // 경고 활성화
});
```

3. 브라우저 콘솔 확인:
```
[MSW] Mocking enabled.
```

### Q2: 핸들러가 생성되지 않아요

**가능한 원인:**

1. **`docs` 블록 없음**
```bru
# ❌ docs 블록이 없으면 생성 안됨
meta {
  name: Get List
  type: http
}

get /api/list
```

**해결:** docs 블록 추가
```bru
meta {
  name: Get List
  type: http
}

get /api/list

docs {
  ```json
  {
    "items": []
  }
  ```
}
```

2. **`done: true` 설정**
```bru
meta {
  name: Get List
  type: http
  done: true  # MSW 생성 건너뜀
}
```

**해결:** `done` 제거 또는 `false`로 변경

### Q3: 실제 API와 Mock을 같이 사용하고 싶어요

**해결책:**

Worker 설정에서 `onUnhandledRequest: 'bypass'` 사용:

```typescript
worker.start({
  onUnhandledRequest: 'bypass' // Mock 없는 요청은 실제 서버로
});
```

**예시:**
```typescript
// MSW 핸들러가 있음 → Mock 응답
await fetch('/api/admin/list');

// MSW 핸들러가 없음 → 실제 서버 응답
await fetch('/api/external/data');
```

### Q4: TypeScript 타입 오류

**문제:**
```typescript
// Property 'users' does not exist on type 'unknown'
const { users } = await response.json();
```

**해결:**

React Query 훅 사용 (자동 타입 생성):
```typescript
import { useGetAdminList } from '@/apis/admin';

const { data } = useGetAdminList();
// data는 자동으로 타입이 지정됨
```

### Q5: 핸들러 재생성 시 수정사항이 사라져요

**해결책:**

1. **Custom 핸들러는 별도 파일로 관리:**

```typescript
// src/mocks/custom/admin-list-custom.ts
import { http, HttpResponse, delay } from 'msw';

export const customAdminListHandler = http.get('/api/admin/list', async () => {
  await delay(1000);
  return HttpResponse.json({
    users: [/* custom data */]
  });
});
```

2. **handlers.ts에서 덮어쓰기:**

```typescript
import { handlers } from './handlers'; // 자동 생성
import { customAdminListHandler } from './custom/admin-list-custom';

// Custom 핸들러로 교체
export const allHandlers = [
  ...handlers.filter(h => !h.info.path.includes('/api/admin/list')),
  customAdminListHandler
];
```

---

## 참고 자료

- [MSW 공식 문서](https://mswjs.io/)
- [Bruno 파일 작성 가이드](./bruno-guide.md)
- [React Query 가이드](./frontend-guide.md)

---

**bruno-api-typescript v0.3.0** - MSW로 더 빠른 개발을 🚀
