# 프론트엔드 개발자 완전 가이드

> **Bruno 독립 저장소에서 TypeScript 타입 자동 생성 및 API 변경사항 관리**

## 📋 목차

1. [개요](#개요)
2. [초기 설정](#초기-설정)
3. [TypeScript 타입 자동 생성](#typescript-타입-자동-생성)
4. [API 변경사항 확인](#api-변경사항-확인)
5. [타입 사용 방법](#타입-사용-방법)
6. [Breaking Changes 대응](#breaking-changes-대응)
7. [일상적인 워크플로우](#일상적인-워크플로우)
8. [FAQ](#faq)

---

## 개요

### 🎯 목표

프론트엔드 개발자는:
- ✅ **Bruno 저장소**에서 API 명세 자동 수신
- ✅ **TypeScript 타입** 자동 생성
- ✅ **Breaking Changes** 자동 감지
- ✅ **안전한 마이그레이션** 가이드 제공
- ✅ **컴파일러**가 에러 자동 감지

### 🔄 전체 흐름

```
1️⃣ 백엔드: Bruno 독립 저장소에 .bru 파일 작성
   ↓
   bruno-api/
   └── users/
       └── get-profile.bru (docs 블록 포함)
   ↓
2️⃣ GitHub Actions 자동 실행 (Bruno 저장소)
   ↓
   ✅ OpenAPI 생성
   ✅ Swagger UI 배포 (GitHub Pages)
   ✅ 프론트엔드 저장소에 알림
   ↓
3️⃣ GitHub Actions 자동 실행 (프론트엔드 저장소)
   ↓
   ✅ Bruno 저장소에서 OpenAPI 가져오기
   ✅ TypeScript 타입 생성 (src/types/api.ts)
   ✅ PR 자동 생성 (Breaking Changes 표시)
   ↓
4️⃣ 프론트엔드 개발자: PR 확인 및 코드 수정
   ↓
   ✅ Changelog 확인
   ✅ TypeScript 컴파일러가 에러 표시
   ✅ 코드 수정
   ✅ 테스트 & 머지
```

**총 소요 시간**: 5~10분

---

## 초기 설정

### Step 1: 프론트엔드 저장소에 GitHub Actions 설정

프론트엔드 저장소에 다음 워크플로우를 추가합니다:

`.github/workflows/sync-bruno.yml` 생성:

```yaml
name: Sync Bruno API

on:
  repository_dispatch:
    types: [bruno_updated]
  workflow_dispatch:

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
          delete-branch: true
          title: "${{ steps.breaking.outputs.has_breaking == 'true' && '⚠️ [BREAKING] ' || '✨ ' }}API 타입 동기화"
          body: |
            ## 🔄 Bruno API 자동 동기화

            ### 📝 변경된 파일
            - `public/openapi.json` - OpenAPI 스펙
            - `src/types/api.ts` - TypeScript 타입 ✨
            - `public/CHANGELOG.md` - 변경사항 상세

            ${{ steps.breaking.outputs.has_breaking == 'true' && '### ⚠️ Breaking Changes 있음!\n\nTypeScript 컴파일러가 자동으로 에러를 표시합니다.\n```bash\nnpm run build\n```\n' || '' }}

            ### 📖 확인하기
            - [Changelog](../blob/api-sync-${{ github.run_number }}/public/CHANGELOG.md)
            - [OpenAPI Spec](../blob/api-sync-${{ github.run_number }}/public/openapi.json)

            ### ✅ 체크리스트
            - [ ] Changelog 확인
            - [ ] 타입 확인 (`src/types/api.ts`)
            - [ ] Breaking changes 대응
            - [ ] 빌드 테스트 (`npm run build`)
            - [ ] 단위 테스트 (`npm test`)
          labels: |
            api-sync
            typescript
            ${{ steps.breaking.outputs.has_breaking == 'true' && 'breaking-change' || 'enhancement' }}
```

⚠️ **중요**: `YOUR-ORG/bruno-api`를 실제 Bruno 저장소 URL로 변경하세요.

자세한 GitHub Actions 설정은 [GITHUB-ACTIONS-SETUP.md](./GITHUB-ACTIONS-SETUP.md)를 참조하세요.

### Step 2: package.json에 스크립트 추가

```json
{
  "scripts": {
    "types:generate": "openapi-typescript ./public/openapi.json -o ./src/types/api.ts",
    "types:watch": "openapi-typescript ./public/openapi.json -o ./src/types/api.ts --watch",
    "build": "npm run types:generate && vite build"
  },
  "devDependencies": {
    "openapi-typescript": "^6.0.0",
    "openapi-fetch": "^0.8.0"
  }
}
```

---

## TypeScript 타입 자동 생성

### 자동 생성 워크플로우

Bruno 저장소에서 API가 변경되면:

1. ✅ Bruno 저장소에서 OpenAPI 자동 생성
2. ✅ 프론트엔드 저장소로 알림 (Repository Dispatch)
3. ✅ 프론트엔드 GitHub Actions 실행
4. ✅ TypeScript 타입 자동 생성 (`src/types/api.ts`)
5. ✅ PR 자동 생성

### 생성되는 타입 예시

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
```

---

## API 변경사항 확인

### 방법 1: PR 자동 코멘트 확인 (가장 빠름, 30초)

프론트엔드 저장소에 자동으로 PR이 생성되며, 다음 정보를 포함합니다:

```markdown
## 🔄 Bruno API 자동 동기화

### ⚠️ Breaking Changes 있음!

TypeScript 컴파일러가 자동으로 에러를 표시합니다.

### 📝 변경된 파일
- `public/openapi.json` - OpenAPI 스펙
- `src/types/api.ts` - TypeScript 타입 ✨
- `public/CHANGELOG.md` - 변경사항 상세

### 📖 확인하기
- Changelog
- OpenAPI Spec
```

### 방법 2: Swagger UI 확인 (2분)

Bruno 저장소의 GitHub Pages에서 전체 API 구조 확인:

```
https://YOUR-ORG.github.io/bruno-api/
```

**Swagger UI에서 할 수 있는 것:**
- 모든 API 엔드포인트 목록 확인
- 요청/응답 스키마 확인
- 타입 정보 확인 (string, number, array, object)
- 필수 필드 확인
- 직접 API 테스트 (Try it out)

### 방법 3: Changelog 확인 (3분)

```bash
# PR 체크아웃
git checkout api-sync-123

# Changelog 확인
cat public/CHANGELOG.md
```

**Changelog에 포함된 정보:**
- 📊 요약 (Added/Modified/Removed 개수)
- ⚠️ Breaking Changes 목록
- 🔄 타입 변경 상세 (number → string 등)
- 📝 마이그레이션 가이드

---

## 타입 사용 방법

### 방법 1: openapi-fetch 사용 (권장)

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

### 방법 2: React Query + openapi-fetch

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

### 방법 3: 타입 헬퍼 사용

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

// 사용
export type UserProfile = ApiResponse<'/users/profile', 'get'>;
//           ^? { id: number; username: string; email: string; ... }

// src/components/Profile.tsx
import type { UserProfile } from '../types/helpers';

const Profile = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  return <div>{user?.username}</div>;
};
```

---

## Breaking Changes 대응

### TypeScript 컴파일러가 자동 감지

#### 시나리오: 타입 변경

**1. 백엔드가 Bruno 수정**

```bru
# bruno-api/users/get-profile.bru (수정 전)
docs {
  ```json
  {
    "id": 1,
    "age": 25
  }
  ```
}

# bruno-api/users/get-profile.bru (수정 후)
docs {
  ```json
  {
    "id": 1,
    "age": "25"  ← number → string
  }
  ```
}
```

**2. 프론트엔드 PR 자동 생성**

```
⚠️ [BREAKING] API 타입 동기화
```

**3. 빌드 시도**

```bash
git checkout api-sync-123
npm run build
```

**4. TypeScript 컴파일 에러 발생**

```
❌ src/components/Profile.tsx:15:7 - error TS2322:
Type 'string' is not assignable to type 'number'.

15   const age: number = user.age;
           ~~~

src/types/api.ts:42:7
  42     age: string;
           ~~~
```

**5. Changelog 확인**

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

**6. 코드 수정**

```typescript
// ❌ Before
const age: number = user.age;  // 컴파일 에러!
const canDrink = age >= 21;

// ✅ After
const age = parseInt(user.age);  // 타입 변환
const canDrink = age >= 21;
```

**7. 테스트 & 머지**

```bash
npm run build  # ✅ 성공!
npm run test   # ✅ 통과!

git add .
git commit -m "fix: handle age as string"
git push
```

---

## 일상적인 워크플로우

### Breaking이 없는 경우

```bash
# 1. PR 확인
# GitHub에서 "✨ API 타입 동기화" PR 확인

# 2. 체크아웃
git checkout api-sync-123

# 3. 빌드 확인
npm run build  # ✅ 에러 없음

# 4. 머지
# GitHub에서 PR 승인 & 머지

# 끝! (총 1분)
```

### Breaking이 있는 경우

```bash
# 1. PR 확인
# GitHub에서 "⚠️ [BREAKING] API 타입 동기화" PR 확인

# 2. 체크아웃
git checkout api-sync-123

# 3. Changelog 확인 (2분)
cat public/CHANGELOG.md

# 4. 빌드 시도 (컴파일 에러 확인)
npm run build

# 5. 영향 범위 파악 (1분)
grep -r "\.age" src/  # 변경된 필드 검색

# 6. 코드 수정 (3분)
# TypeScript 에러 메시지 따라 수정

# 7. 테스트 (1분)
npm run build
npm run test

# 8. 커밋 & 푸시
git add .
git commit -m "fix: handle age as string"
git push

# 9. 머지
# GitHub에서 PR 승인 & 머지

# 끝! (총 8분)
```

---

## FAQ

### Q1: 타입 파일은 커밋해야 하나요?

**A**: 두 가지 옵션:

**옵션 1: 커밋 안 함**
- `.gitignore`에 `src/types/api.ts` 추가
- 장점: Git diff가 깔끔함
- 단점: 로컬에서 `npm run types:generate` 필요

**옵션 2: 커밋함 (권장)**
- Git에 포함
- 장점: clone 후 바로 사용 가능, PR에서 타입 변경 확인 가능
- 단점: PR에 타입 변경 diff가 많이 보임

### Q2: 로컬에서 타입을 즉시 생성하려면?

**A**:

```bash
# 1. Bruno 저장소 클론
git clone https://github.com/YOUR-ORG/bruno-api.git /tmp/bruno-api

# 2. OpenAPI 생성
npx bruno-openapi-sync generate \
  -i /tmp/bruno-api \
  -o ./public/openapi.json

# 3. TypeScript 타입 생성
npx openapi-typescript ./public/openapi.json \
  -o ./src/types/api.ts

# 즉시 사용 가능!
```

또는 watch 모드:

```bash
npm run types:watch
# 파일 변경 감지하여 자동 재생성
```

### Q3: OpenAPI에 없는 필드가 필요하면?

**A**: 백엔드 팀에게 Bruno docs 업데이트 요청:

```bru
# bruno-api/users/get-profile.bru

docs {
  ```json
  {
    "id": 1,
    "username": "john",
    "email": "john@example.com",
    "newField": "value"  ← 추가 요청!
  }
  ```
}
```

그러면 자동으로:
1. OpenAPI 업데이트
2. TypeScript 타입 업데이트
3. 프론트엔드 PR 생성

### Q4: Breaking Changes는 어떻게 감지되나요?

**A**: 자동으로 감지됩니다:

- ⚠️ 엔드포인트 제거
- ⚠️ 필드 제거
- ⚠️ 타입 변경 (number → string)
- ⚠️ 필수 필드 추가

TypeScript 컴파일러가 해당 부분을 에러로 표시합니다.

### Q5: Swagger UI는 어디서 보나요?

**A**: Bruno 저장소의 GitHub Pages:

```
https://YOUR-ORG.github.io/bruno-api/
```

여기서 모든 API 문서를 볼 수 있습니다.

### Q6: CI/CD에서 자동화하려면?

**A**: 이미 설정되어 있습니다!

Bruno 저장소에서 API가 변경되면:
1. ✅ 프론트엔드 PR 자동 생성
2. ✅ TypeScript 타입 자동 생성
3. ✅ Breaking Changes 자동 감지
4. ✅ Changelog 자동 생성

프론트엔드 개발자는 PR만 확인하고 머지하면 됩니다.

---

## 참고 문서

- **[GitHub Actions 설정 가이드](./GITHUB-ACTIONS-SETUP.md)**: 초기 설정 완전 가이드
- **[Bruno 파일 작성 가이드](./BRUNO-GUIDE.md)**: 백엔드 개발자용 Bruno 작성법
- **[빠른 시작 가이드](../QUICKSTART.md)**: 5분 안에 시작하기

---

## 마무리

이 가이드를 따르면:

✅ **TypeScript 타입 자동 생성**
✅ **Breaking Changes 자동 감지**
✅ **안전한 마이그레이션**
✅ **컴파일러가 에러 자동 표시**
✅ **5분 안에 대응 완료**

**백엔드와의 협업이 이렇게 쉬워집니다!** 🚀
