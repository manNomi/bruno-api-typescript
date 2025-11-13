# 프론트엔드 타입 자동 생성 가이드

> **Bruno 명세 → OpenAPI → TypeScript 타입 자동 생성**

## 📋 목차

1. [개요](#개요)
2. [자동 생성 워크플로우](#자동-생성-워크플로우)
3. [타입 사용 방법](#타입-사용-방법)
4. [실전 예시](#실전-예시)
5. [FAQ](#faq)

---

## 개요

### 🎯 목표

Bruno 명세를 수정하면:
1. ✅ **OpenAPI 자동 생성**
2. ✅ **TypeScript 타입 자동 생성**
3. ✅ **PR 자동 생성** (타입 포함)
4. ✅ **컴파일러가 Breaking 자동 감지**

### 전체 흐름

```
1️⃣ 백엔드: Bruno docs 작성
   ↓
   docs {
     ```json
     { "id": 1, "username": "john" }
     ```
   }
   ↓
2️⃣ GitHub Actions 자동 실행
   ↓
   bruno-openapi-sync generate → openapi.json
   ↓
   openapi-typescript → src/types/api.ts
   ↓
3️⃣ 프론트엔드 PR 자동 생성
   ↓
   public/openapi.json       ✅ 생성됨
   src/types/api.ts          ✅ 생성됨
   public/CHANGELOG.md       ✅ 생성됨
   ↓
4️⃣ 프론트엔드: 타입 사용
   ↓
   import type { UserProfile } from './types/api';
   ✅ 완벽한 타입 안전성!
```

---

## 자동 생성 워크플로우

### Step 1: 프론트엔드 저장소 설정

#### 1-1. 의존성 설치

```bash
cd frontend-repo

# TypeScript 타입 생성 도구
npm install -D openapi-typescript

# (선택) 타입 안전 API 클라이언트
npm install openapi-fetch
```

#### 1-2. package.json 스크립트 추가

```json
{
  "scripts": {
    "types:generate": "openapi-typescript ./public/openapi.json -o ./src/types/api.ts",
    "types:watch": "openapi-typescript ./public/openapi.json -o ./src/types/api.ts --watch",
    "build": "npm run types:generate && vite build"
  }
}
```

#### 1-3. .gitignore 업데이트

```gitignore
# 자동 생성 파일은 커밋하지 않음 (선택)
# 또는 커밋해서 타입을 저장소에 포함
# src/types/api.ts

# OpenAPI 파일은 커밋 (권장)
# public/openapi.json
```

### Step 2: GitHub Actions 워크플로우

`.github/workflows/sync-bruno.yml`:

```yaml
name: Sync Bruno API

on:
  repository_dispatch:
    types: [bruno_updated]
  workflow_dispatch:
  schedule:
    - cron: '0 */6 * * *'

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Clone Bruno Repository
        run: |
          git clone https://github.com/YOUR-ORG/bruno-api.git /tmp/bruno-api

      - name: Install Dependencies
        run: npm install

      - name: Generate OpenAPI
        run: |
          npx bruno-openapi-sync generate \
            -i /tmp/bruno-api \
            -o ./public/openapi.json \
            --diff \
            --changelog ./public/CHANGELOG.md

      - name: Generate TypeScript Types
        run: |
          mkdir -p src/types
          npx openapi-typescript ./public/openapi.json -o ./src/types/api.ts

      - name: Check for changes
        id: changes
        run: |
          git add public/ src/types/
          if git diff --staged --quiet; then
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            echo "has_changes=true" >> $GITHUB_OUTPUT
          fi

      - name: Check breaking changes
        if: steps.changes.outputs.has_changes == 'true'
        id: breaking
        run: |
          if grep -q "Breaking Changes" public/CHANGELOG.md; then
            echo "has_breaking=true" >> $GITHUB_OUTPUT
          else
            echo "has_breaking=false" >> $GITHUB_OUTPUT
          fi

      - name: Create Pull Request
        if: steps.changes.outputs.has_changes == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: |
            chore: sync API types from Bruno

            - OpenAPI spec updated
            - TypeScript types regenerated
            ${{ steps.breaking.outputs.has_breaking == 'true' && '- ⚠️ Breaking changes detected' || '' }}
          branch: api-sync-${{ github.run_number }}
          title: "${{ steps.breaking.outputs.has_breaking == 'true' && '⚠️ [BREAKING] ' || '✨ ' }}API 타입 동기화"
          body: |
            ## 🔄 Bruno API 자동 동기화

            ### 📝 변경된 파일
            - `public/openapi.json` - OpenAPI 스펙
            - `src/types/api.ts` - **TypeScript 타입** ✨
            - `public/CHANGELOG.md` - 변경사항 상세

            ${{ steps.breaking.outputs.has_breaking == 'true' && '### ⚠️ Breaking Changes 있음!\n\nTypeScript 컴파일러가 자동으로 에러를 표시합니다.\n`npm run build`를 실행하여 확인하세요.\n' || '' }}

            ### 🔍 타입 확인
            ```typescript
            // src/types/api.ts (자동 생성됨)
            import type { paths } from './types/api';

            // 모든 API 경로의 타입이 자동으로 생성되었습니다!
            ```

            ### ✅ 체크리스트
            - [ ] 생성된 타입 확인 (`src/types/api.ts`)
            - [ ] Changelog 확인 (`public/CHANGELOG.md`)
            - [ ] Breaking changes 대응 (있는 경우)
            - [ ] 빌드 테스트 (`npm run build`)
            - [ ] 단위 테스트 통과 (`npm run test`)
          labels: |
            api-sync
            typescript
            ${{ steps.breaking.outputs.has_breaking == 'true' && 'breaking-change' || 'enhancement' }}
```

---

## 타입 사용 방법

### 방법 1: 기본 타입 사용

```typescript
// src/types/api.ts (자동 생성됨)
export interface paths {
  "/users/profile": {
    get: {
      responses: {
        200: {
          content: {
            "application/json": {
              id: number;
              username: string;
              email: string;
              createdAt: string;
            };
          };
        };
      };
    };
  };
}

// src/api/users.ts (수동 작성)
import type { paths } from '../types/api';

type UserProfileResponse =
  paths['/users/profile']['get']['responses'][200]['content']['application/json'];

export async function getUserProfile(): Promise<UserProfileResponse> {
  const response = await fetch('/users/profile');
  return response.json();
}

// src/components/Profile.tsx
import { getUserProfile } from '../api/users';

const Profile = () => {
  const [user, setUser] = useState<UserProfileResponse | null>(null);

  useEffect(() => {
    getUserProfile().then(setUser);
  }, []);

  return (
    <div>
      {/* ✅ TypeScript 자동 완성! */}
      <h1>{user?.username}</h1>
      <p>{user?.email}</p>
    </div>
  );
};
```

### 방법 2: openapi-fetch 사용 (권장)

```bash
npm install openapi-fetch
```

```typescript
// src/api/client.ts
import createClient from 'openapi-fetch';
import type { paths } from '../types/api';

export const client = createClient<paths>({
  baseUrl: 'https://api.example.com',
});

// src/components/Profile.tsx
import { client } from '../api/client';

const Profile = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // ✅ 완벽한 타입 추론!
    client.GET('/users/profile').then(({ data, error }) => {
      if (error) {
        console.error(error);
        return;
      }
      setUser(data);
      //   ^? { id: number; username: string; email: string; ... }
    });
  }, []);

  return <div>{user?.username}</div>;
};
```

### 방법 3: React Query + openapi-fetch

```typescript
// src/hooks/useUserProfile.ts
import { useQuery } from '@tanstack/react-query';
import { client } from '../api/client';

export function useUserProfile() {
  return useQuery({
    queryKey: ['user', 'profile'],
    queryFn: async () => {
      const { data, error } = await client.GET('/users/profile');
      if (error) throw error;
      return data;
      //     ^? { id: number; username: string; ... }
    },
  });
}

// src/components/Profile.tsx
import { useUserProfile } from '../hooks/useUserProfile';

const Profile = () => {
  const { data: user, isLoading, error } = useUserProfile();
  //          ^? { id: number; username: string; ... } | undefined

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error!</div>;

  return (
    <div>
      {/* ✅ 완벽한 타입 안전성! */}
      <h1>{user.username}</h1>
      <p>{user.email}</p>
    </div>
  );
};
```

### 방법 4: 커스텀 타입 헬퍼

```typescript
// src/types/helpers.ts
import type { paths } from './api';

// 응답 타입 추출 헬퍼
export type ApiResponse<
  Path extends keyof paths,
  Method extends keyof paths[Path]
> = paths[Path][Method] extends { responses: { 200: { content: { 'application/json': infer T } } } }
  ? T
  : never;

// 요청 타입 추출 헬퍼
export type ApiRequest<
  Path extends keyof paths,
  Method extends keyof paths[Path]
> = paths[Path][Method] extends { requestBody: { content: { 'application/json': infer T } } }
  ? T
  : never;

// 사용
export type UserProfile = ApiResponse<'/users/profile', 'get'>;
export type CreateUserRequest = ApiRequest<'/users', 'post'>;

// src/components/Profile.tsx
import type { UserProfile } from '../types/helpers';

const Profile = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  //                                ^? { id: number; username: string; ... }

  return <div>{user?.username}</div>;
};
```

---

## 실전 예시

### 시나리오: Breaking Change 대응

#### 1. 백엔드가 Bruno 수정

```bru
# bruno-api/users/get-profile.bru (수정 전)
docs {
  ```json
  {
    "id": 1,
    "username": "john",
    "age": 25
  }
  ```
}

# bruno-api/users/get-profile.bru (수정 후)
docs {
  ```json
  {
    "id": 1,
    "username": "john",
    "age": "25"  ← number에서 string으로 변경!
  }
  ```
}
```

#### 2. GitHub Actions 자동 실행

```
✅ OpenAPI 생성
✅ TypeScript 타입 생성
✅ Breaking Changes 감지
✅ 프론트엔드 PR 생성
```

#### 3. 프론트엔드 개발자가 PR 확인

```bash
git checkout api-sync-123

# 빌드 시도
npm run build
```

```
❌ 컴파일 에러!

src/components/Profile.tsx:15:7 - error TS2322:
Type 'string' is not assignable to type 'number'.

15   const age: number = user.age;
           ~~~

src/types/api.ts:42:7
  42     age: string;
           ~~~
  The expected type comes from property 'age' which is declared here
```

#### 4. Changelog 확인

```bash
cat public/CHANGELOG.md
```

```markdown
## ⚠️ Breaking Changes

### `GET /users/profile`

**변경사항**:
- 🔄 Type changed: `response.age` from `number` to `string`

**마이그레이션 가이드**:
```typescript
// Before
const age: number = user.age;
const nextYear = age + 1;

// After
const age: string = user.age;
const nextYear = parseInt(age) + 1;
```
```

#### 5. 코드 수정

```typescript
// src/components/Profile.tsx

// ❌ Before
const Profile = () => {
  const [user, setUser] = useState<UserProfile | null>(null);

  const age: number = user.age;  // ← 컴파일 에러!
  const canDrink = age >= 21;

  return <div>Age: {age}</div>;
};

// ✅ After
const Profile = () => {
  const [user, setUser] = useState<UserProfile | null>(null);

  const age = parseInt(user.age);  // ← 타입 변환
  const canDrink = age >= 21;

  return <div>Age: {age}</div>;
};
```

#### 6. 테스트 & 머지

```bash
npm run build  # ✅ 성공!
npm run test   # ✅ 통과!

git add .
git commit -m "fix: handle age as string"
git push
```

---

## Breaking Changes 감지

### TypeScript 컴파일러가 자동으로 감지

#### 타입 변경

```typescript
// 수정 전: age는 number
const age: number = user.age;  // ✅ OK

// 수정 후: age는 string
const age: number = user.age;  // ❌ 컴파일 에러!
//    ^^^
// Type 'string' is not assignable to type 'number'
```

#### 필드 제거

```typescript
// 수정 전: email 필드 존재
const email = user.email;  // ✅ OK

// 수정 후: email 필드 제거
const email = user.email;  // ❌ 컴파일 에러!
//                 ^^^^^
// Property 'email' does not exist on type 'UserProfile'
```

#### 필드 추가 (Non-breaking)

```typescript
// 수정 전: phone 필드 없음
const phone = user.phone;  // ❌ 컴파일 에러

// 수정 후: phone 필드 추가
const phone = user.phone;  // ✅ OK (자동으로 타입 업데이트됨)
```

### VSCode에서 실시간 확인

```typescript
const Profile = () => {
  const { data: user } = useUserProfile();

  // ✅ 자동 완성
  user.
  //   ^
  //   id
  //   username
  //   email
  //   age

  // ❌ 존재하지 않는 필드는 에러
  user.invalidField;
  //   ^^^^^^^^^^^^
  // Property 'invalidField' does not exist
};
```

---

## FAQ

### Q1: 타입은 커밋해야 하나요?

**A**: 두 가지 옵션:

**옵션 1: 커밋 안 함 (권장)**
- `.gitignore`에 `src/types/api.ts` 추가
- 장점: Git diff가 깔끔함
- 단점: 로컬에서 `npm run types:generate` 필요

**옵션 2: 커밋함**
- Git에 포함
- 장점: clone 후 바로 사용 가능
- 단점: PR에 타입 변경 diff가 많이 보임

### Q2: 기존 코드와 충돌하면?

**A**: 점진적 마이그레이션:

```typescript
// 1. 기존 수동 타입과 자동 타입 공존
import type { UserProfile as AutoUserProfile } from './types/api';

// 2. 하나씩 마이그레이션
// Before
type UserProfile = {
  id: number;
  username: string;
};

// After
type UserProfile = AutoUserProfile;

// 3. 결국 자동 타입만 사용
import type { UserProfile } from './types/api';
```

### Q3: 타입이 복잡해서 사용하기 어려워요

**A**: 타입 헬퍼 함수 사용:

```typescript
// src/types/helpers.ts
import type { paths } from './api';

// 간단한 헬퍼
export type Get<Path extends keyof paths> =
  paths[Path]['get']['responses'][200]['content']['application/json'];

export type Post<Path extends keyof paths> =
  paths[Path]['post']['requestBody']['content']['application/json'];

// 사용
import type { Get } from './types/helpers';

type UserProfile = Get<'/users/profile'>;
//   ^? { id: number; username: string; ... }
```

### Q4: OpenAPI에 없는 필드는?

**A**: 백엔드에서 Bruno docs를 수정해야 합니다:

```bru
# bruno-api/users/get-profile.bru

docs {
  ```json
  {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "newField": "value"  ← 추가!
  }
  ```
}
```

그러면 자동으로:
1. OpenAPI 업데이트
2. TypeScript 타입 업데이트
3. 프론트엔드 PR 생성

### Q5: 로컬에서 타입을 즉시 생성하려면?

**A**:

```bash
# 1. Bruno 저장소에서 최신 파일 받기
cd /tmp
git clone https://github.com/YOUR-ORG/bruno-api.git

# 2. OpenAPI 생성
npx bruno-openapi-sync generate \
  -i /tmp/bruno-api \
  -o ./public/openapi.json

# 3. TypeScript 타입 생성
npx openapi-typescript ./public/openapi.json \
  -o ./src/types/api.ts

# 4. 즉시 사용!
```

또는 watch 모드:

```bash
npm run types:watch
# 파일 변경 감지하여 자동 재생성
```

---

## 참고 문서

- [openapi-typescript](https://github.com/drwpow/openapi-typescript) - 타입 생성 도구
- [openapi-fetch](https://github.com/drwpow/openapi-typescript/tree/main/packages/openapi-fetch) - 타입 안전 클라이언트
- [BRUNO-SEPARATE-REPO.md](./BRUNO-SEPARATE-REPO.md) - 전체 워크플로우
- [FRONTEND-GUIDE.md](./FRONTEND-GUIDE.md) - 프론트엔드 가이드

---

**Bruno 명세만 정확히 작성하면, TypeScript 타입이 자동으로 생성됩니다!** 🚀
