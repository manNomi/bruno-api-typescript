# Bruno 별도 저장소 완전 가이드

> **Bruno를 완전히 독립된 저장소로 관리할 때의 전체 설정**

## 📋 목차

1. [저장소 구조](#저장소-구조)
2. [Bruno 저장소 설정](#bruno-저장소-설정)
3. [백엔드 팀 워크플로우](#백엔드-팀-워크플로우)
4. [프론트엔드 팀 워크플로우](#프론트엔드-팀-워크플로우)
5. [자동화 설정](#자동화-설정)
6. [FAQ](#faq)

---

## 저장소 구조

### 3개의 독립된 저장소

```
1️⃣ bruno-api (Bruno 저장소)
   ├── .github/workflows/
   │   ├── api-review.yml           ← PR 자동 코멘트
   │   ├── api-docs-deploy.yml      ← GitHub Pages 배포
   │   └── notify-repos.yml         ← 백엔드/프론트엔드 알림
   ├── applications/
   │   ├── get-list.bru
   │   └── create.bru
   ├── users/
   │   ├── get-profile.bru
   │   └── update-profile.bru
   ├── bruno.json
   └── README.md

2️⃣ backend-repo (백엔드 저장소)
   ├── src/
   │   ├── controllers/
   │   └── services/
   ├── package.json
   └── README.md

3️⃣ frontend-repo (프론트엔드 저장소)
   ├── .github/workflows/
   │   └── sync-bruno.yml           ← Bruno 자동 동기화
   ├── src/
   │   ├── api/
   │   └── components/
   ├── public/
   │   ├── openapi.json             ← 자동 생성
   │   └── CHANGELOG.md             ← 자동 생성
   └── package.json
```

---

## Bruno 저장소 설정

### Step 1: Bruno 저장소 생성

```bash
# 새 저장소 생성
mkdir bruno-api
cd bruno-api
git init

# 초기 구조 생성
mkdir -p applications users
touch bruno.json README.md

# bruno.json 설정
cat > bruno.json << 'EOF'
{
  "name": "Our Team API",
  "type": "collection",
  "version": "1.0.0"
}
EOF
```

### Step 2: GitHub Actions 워크플로우 추가

#### 2-1. PR 자동 코멘트 (.github/workflows/api-review.yml)

```yaml
name: API Review

on:
  pull_request:
    paths:
      - '**/*.bru'

jobs:
  review:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install bruno-openapi-sync
        run: npm install -g bruno-openapi-sync

      - name: Generate previous version
        run: |
          git checkout origin/${{ github.base_ref }}
          bruno-sync generate -i . -o openapi-old.json || true

      - name: Generate current version
        run: |
          git checkout HEAD
          if [ -f openapi-old.json ]; then
            cp openapi-old.json openapi.json.old
          fi

          bruno-sync generate \
            -i . \
            -o openapi.json \
            --diff \
            --changelog CHANGELOG.md

      - name: Check breaking changes
        id: breaking
        run: |
          if [ -f CHANGELOG.md ] && grep -q "Breaking Changes" CHANGELOG.md; then
            echo "has_breaking=true" >> $GITHUB_OUTPUT
          else
            echo "has_breaking=false" >> $GITHUB_OUTPUT
          fi

      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            let comment = '## 🔄 API 변경사항\n\n';

            const hasBreaking = '${{ steps.breaking.outputs.has_breaking }}' === 'true';
            if (hasBreaking) {
              comment += '### ⚠️ **Breaking Changes 발견!**\n\n';
            }

            if (fs.existsSync('CHANGELOG.md')) {
              const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
              comment += changelog;
            }

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

#### 2-2. GitHub Pages 배포 (.github/workflows/api-docs-deploy.yml)

```yaml
name: Deploy API Docs

on:
  push:
    branches:
      - main
    paths:
      - '**/*.bru'

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install bruno-openapi-sync
        run: npm install -g bruno-openapi-sync

      - name: Generate OpenAPI
        run: |
          mkdir -p docs
          bruno-sync generate \
            -i . \
            -o docs/openapi.json \
            --title "우리팀 API" \
            --diff \
            --changelog docs/CHANGELOG.md \
            --changelog-format html

      - name: Create Swagger UI
        run: |
          cat > docs/index.html << 'EOF'
          <!DOCTYPE html>
          <html>
          <head>
            <title>API Documentation</title>
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
          </head>
          <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
            <script>
              SwaggerUIBundle({
                url: './openapi.json',
                dom_id: '#swagger-ui',
              })
            </script>
          </body>
          </html>
          EOF

      - name: Setup Pages
        uses: actions/configure-pages@v3

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: './docs'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v2
```

#### 2-3. 다른 저장소 알림 (.github/workflows/notify-repos.yml)

```yaml
name: Notify Other Repos

on:
  push:
    branches:
      - main
    paths:
      - '**/*.bru'

jobs:
  notify:
    runs-on: ubuntu-latest

    steps:
      - name: Notify Backend Repo
        run: |
          curl -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.REPO_ACCESS_TOKEN }}" \
            https://api.github.com/repos/YOUR-ORG/backend-repo/dispatches \
            -d '{
              "event_type": "bruno_updated",
              "client_payload": {
                "commit_sha": "${{ github.sha }}",
                "commit_message": "${{ github.event.head_commit.message }}"
              }
            }'

      - name: Notify Frontend Repo
        run: |
          curl -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.REPO_ACCESS_TOKEN }}" \
            https://api.github.com/repos/YOUR-ORG/frontend-repo/dispatches \
            -d '{
              "event_type": "bruno_updated",
              "client_payload": {
                "commit_sha": "${{ github.sha }}",
                "commit_message": "${{ github.event.head_commit.message }}"
              }
            }'
```

### Step 3: GitHub 설정

#### 3-1. Personal Access Token 생성

1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token (classic)"
3. 권한: `repo`, `workflow`
4. Token 복사

#### 3-2. Bruno 저장소에 Secret 등록

1. Bruno 저장소 → Settings → Secrets → Actions
2. "New repository secret"
3. Name: `REPO_ACCESS_TOKEN`
4. Value: 복사한 Token

#### 3-3. GitHub Pages 활성화

1. Bruno 저장소 → Settings → Pages
2. Source: GitHub Actions
3. Save

---

## 백엔드 팀 워크플로우

### 시나리오: API 추가/수정

```bash
# 1. Bruno 저장소 클론
git clone https://github.com/YOUR-ORG/bruno-api.git
cd bruno-api

# 2. 새 브랜치 생성
git checkout -b feature/add-user-api

# 3. Bruno 파일 작성
cat > users/get-profile.bru << 'EOF'
meta {
  name: Get User Profile
  type: http
}

get /users/profile

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-01-01T00:00:00Z"
  }
  ```
}
EOF

# 4. 커밋 & 푸시
git add users/get-profile.bru
git commit -m "feat: add user profile API"
git push origin feature/add-user-api

# 5. PR 생성
# GitHub에서 PR 생성 → 자동으로 코멘트 달림!

# 6. 리뷰 & 머지
# PR 승인 후 main에 머지

# 7. 자동으로 일어나는 일:
#    ✅ GitHub Pages에 Swagger UI 배포
#    ✅ 백엔드 저장소에 알림
#    ✅ 프론트엔드 저장소에 알림 & PR 자동 생성
```

### 백엔드 저장소 설정 (선택사항)

백엔드가 Bruno 업데이트 알림을 받으려면:

```yaml
# backend-repo/.github/workflows/bruno-notification.yml
name: Bruno Updated

on:
  repository_dispatch:
    types: [bruno_updated]

jobs:
  notify:
    runs-on: ubuntu-latest

    steps:
      - name: Send Slack notification
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "🔔 Bruno API가 업데이트되었습니다!\nCommit: ${{ github.event.client_payload.commit_message }}"
            }'
```

---

## 프론트엔드 팀 워크플로우

### Step 1: 프론트엔드 저장소에 자동 동기화 설정

```yaml
# frontend-repo/.github/workflows/sync-bruno.yml
name: Sync Bruno API

on:
  repository_dispatch:
    types: [bruno_updated]
  workflow_dispatch:  # 수동 실행
  schedule:
    - cron: '0 */6 * * *'  # 6시간마다 확인

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
            chore: sync API from Bruno

            Bruno commit: ${{ github.event.client_payload.commit_sha }}
            Message: ${{ github.event.client_payload.commit_message }}
          branch: api-sync-${{ github.run_number }}
          title: "${{ steps.breaking.outputs.has_breaking == 'true' && '⚠️ [BREAKING] ' || '✨ ' }}API 변경사항 동기화"
          body: |
            ## 🔄 Bruno API 자동 동기화

            **Bruno Commit**: ${{ github.event.client_payload.commit_sha }}
            **메시지**: ${{ github.event.client_payload.commit_message }}

            ${{ steps.breaking.outputs.has_breaking == 'true' && '### ⚠️ **Breaking Changes 있음!**\n프론트엔드 코드 수정이 필요할 수 있습니다.\n' || '' }}

            ### 📝 변경사항
            자세한 내용은 [CHANGELOG.md](../blob/api-sync-${{ github.run_number }}/public/CHANGELOG.md) 참조

            ### 🔗 확인하기
            - [OpenAPI 스펙](../blob/api-sync-${{ github.run_number }}/public/openapi.json)
            - [Swagger UI](https://YOUR-ORG.github.io/bruno-api/)

            ### ✅ 체크리스트
            - [ ] Changelog 확인
            - [ ] Breaking changes 대응 (있는 경우)
            - [ ] 테스트 통과 확인
          labels: |
            api-sync
            ${{ steps.breaking.outputs.has_breaking == 'true' && 'breaking-change' || 'enhancement' }}
```

### Step 2: 프론트엔드 개발자 일상 워크플로우

```bash
# 1. Bruno 업데이트 알림 받음 (PR 자동 생성됨)
#    - Slack/Email 알림
#    - GitHub PR 알림

# 2. PR 확인
git fetch origin
git checkout api-sync-123

# 3. Changelog 확인
cat public/CHANGELOG.md

# 4. 자동 생성된 타입 확인
cat src/types/api.ts
# ✅ Bruno 명세에서 자동 생성된 TypeScript 타입!

# 5. Breaking이 있으면 코드 수정
# TypeScript 컴파일러가 자동으로 에러 표시!
npm run build
# ❌ Error: Property 'gpa' is of type 'string', not 'number'

# 6. 코드 수정
# src/components/CompetitorCard.tsx
# const gpa: number = data.gpa;  ← 컴파일 에러!
# const gpa = parseFloat(data.gpa);  ← 수정

# 7. 테스트
npm run test
npm run build  # ✅ 통과!

# 8. PR 승인 & 머지
```

---

## 자동화 설정

### 전체 흐름

```
1️⃣ 백엔드 개발자
   ↓
   Bruno 저장소에서 .bru 파일 수정
   ↓
   PR 생성
   ↓
2️⃣ Bruno 저장소
   ↓
   GitHub Actions 실행
   ├─ PR에 자동 코멘트
   └─ (머지 후)
      ├─ GitHub Pages 배포 (Swagger UI)
      └─ Repository Dispatch 발송
         ├─ 백엔드 저장소에 알림
         └─ 프론트엔드 저장소에 알림
   ↓
3️⃣ 프론트엔드 저장소
   ↓
   Repository Dispatch 수신
   ↓
   GitHub Actions 실행
   ├─ Bruno 최신 버전 가져오기
   ├─ OpenAPI 생성
   ├─ 변경사항 감지
   └─ PR 자동 생성
   ↓
4️⃣ 프론트엔드 개발자
   ↓
   PR 확인 & 대응
```

### 체크리스트

#### Bruno 저장소 설정
- [ ] 저장소 생성
- [ ] `.github/workflows/api-review.yml` 추가
- [ ] `.github/workflows/api-docs-deploy.yml` 추가
- [ ] `.github/workflows/notify-repos.yml` 추가
- [ ] Personal Access Token 생성
- [ ] Secret 등록 (`REPO_ACCESS_TOKEN`)
- [ ] GitHub Pages 활성화

#### 프론트엔드 저장소 설정
- [ ] `.github/workflows/sync-bruno.yml` 추가
- [ ] YOUR-ORG 값 수정
- [ ] peter-evans/create-pull-request 설정

#### 백엔드 저장소 설정 (선택)
- [ ] `.github/workflows/bruno-notification.yml` 추가 (선택)

---

## FAQ

### Q1: Bruno 저장소는 누가 관리하나요?

**A**: 보통 백엔드 팀이 관리하지만, API 설계 단계에서는 프론트엔드도 참여 가능합니다.

### Q2: 프론트엔드가 Bruno 파일을 직접 수정할 수 있나요?

**A**: 네! PR을 만들어서 백엔드 팀의 리뷰를 받으면 됩니다.

```bash
# 프론트엔드 개발자
git clone https://github.com/YOUR-ORG/bruno-api.git
git checkout -b feature/add-filter-param
# .bru 파일 수정
git push
# PR 생성 → 백엔드 리뷰
```

### Q3: 여러 환경(dev/staging/prod)은 어떻게 관리하나요?

**A**: Bruno 저장소에 브랜치 전략 사용:

```
bruno-api/
├── main        → production
├── staging     → staging
└── develop     → development
```

각 환경별로 GitHub Pages도 분리 배포 가능.

### Q4: CI/CD 비용이 많이 드나요?

**A**:
- GitHub Actions는 public 저장소는 무료
- Private 저장소는 월 2000분 무료 (소규모 팀 충분)
- Bruno 파일 변경은 자주 없어서 실제 실행 횟수 적음

### Q5: Bruno 앱으로도 테스트할 수 있나요?

**A**: 네! Bruno 앱 설치 후:

```bash
# Bruno 저장소 클론
git clone https://github.com/YOUR-ORG/bruno-api.git

# Bruno 앱에서 폴더 열기
# File → Open Collection → bruno-api 폴더 선택
```

### Q6: 백엔드 코드와 Bruno를 어떻게 동기화하나요?

**A**: 백엔드 개발 시:

```bash
# 1. API 개발 (backend-repo)
# 2. Bruno 파일 작성 (bruno-api)
# 3. 동시에 PR 생성
#    - backend-repo PR: "feat: add user API"
#    - bruno-api PR: "feat: add user API spec"
# 4. 함께 리뷰 & 머지
```

또는 monorepo 스타일:
```bash
# 한 번에 두 저장소 작업
cd backend-repo && git checkout -b feature/user-api
cd ../bruno-api && git checkout -b feature/user-api
# 개발...
# 두 PR 동시에 생성
```

---

## 장단점

### 장점 ✅

1. **명확한 책임 분리**
   - Bruno = API 명세
   - Backend = 구현
   - Frontend = 소비

2. **독립적인 버전 관리**
   - API 스펙만 따로 태그/릴리즈
   - 각 저장소가 독립적으로 발전

3. **접근 권한 세밀 제어**
   - Bruno: 전체 팀 read, 백엔드 write
   - Backend: 백엔드만
   - Frontend: 프론트엔드만

4. **문서화 중앙화**
   - 모든 팀이 하나의 API 명세 참조
   - GitHub Pages로 공개 가능

### 단점 ❌

1. **초기 설정 복잡**
   - 3개 저장소 설정 필요
   - GitHub Actions 설정 많음

2. **동기화 지연 가능**
   - 백엔드 코드와 Bruno가 일시적으로 불일치 가능
   - 프론트엔드 PR 생성까지 시간 소요

3. **저장소 분산**
   - 여러 저장소 관리 필요
   - Git history 추적 어려움

### 추천 상황

**별도 Bruno 저장소 추천**:
- ✅ 팀 규모 > 10명
- ✅ 백엔드/프론트엔드 완전 분리
- ✅ API 문서를 외부 공개하려는 경우
- ✅ 여러 프론트엔드가 같은 API 사용

**메인 저장소 안에 Bruno 추천**:
- ✅ 팀 규모 < 10명
- ✅ 백엔드/프론트엔드 긴밀 협업
- ✅ 내부 사용만
- ✅ 간단한 설정 선호

---

## TypeScript 타입 자동 생성

### 프론트엔드에서 타입 사용하기

GitHub Actions가 자동으로 생성한 타입을 사용:

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

// src/api/client.ts (수동 작성)
import type { paths } from '../types/api';

type UserProfile = paths['/users/profile']['get']['responses'][200]['content']['application/json'];

export async function getUserProfile(): Promise<UserProfile> {
  const response = await fetch('/users/profile');
  return response.json();
}

// src/components/Profile.tsx (사용)
import { getUserProfile } from '../api/client';

const Profile = () => {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    getUserProfile().then(setUser);
  }, []);

  // ✅ TypeScript가 자동 완성 및 타입 체크!
  return <div>{user?.username}</div>;
};
```

### 더 편한 타입 사용 (openapi-fetch)

```bash
npm install openapi-fetch
```

```typescript
// src/api/client.ts
import createClient from 'openapi-fetch';
import type { paths } from '../types/api';

const client = createClient<paths>({ baseUrl: 'https://api.example.com' });

// src/components/Profile.tsx
const { data, error } = await client.GET('/users/profile');
//     ^? { id: number; username: string; email: string; ... }
//        ✅ 완벽한 타입 추론!

if (data) {
  console.log(data.username);  // ✅ 자동 완성
  console.log(data.invalid);   // ❌ 컴파일 에러!
}
```

### React Query와 함께 사용

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
      //        ✅ 완벽한 타입!
    },
  });
}

// src/components/Profile.tsx
const { data: user } = useUserProfile();
//          ^? { id: number; username: string; ... }

return <div>{user?.username}</div>;  // ✅ 타입 안전!
```

---

## 백엔드 개발자가 해야 할 일

### ✅ 단 하나: Bruno docs 블록 정확하게 작성

```bru
meta {
  name: Get User Profile
  type: http
}

get /users/profile

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-01-01T00:00:00Z"
  }
  ```
}
```

**이것만 하면 끝!** 나머지는 모두 자동:
1. ✅ PR에 자동 코멘트
2. ✅ GitHub Pages에 Swagger UI 배포
3. ✅ 프론트엔드에 알림
4. ✅ OpenAPI 생성
5. ✅ **TypeScript 타입 자동 생성**
6. ✅ 프론트엔드 PR 자동 생성

---

## 프론트엔드 개발자 체크리스트

### Breaking Changes 대응

```typescript
// 1. PR 알림 받음
// "⚠️ [BREAKING] API 변경사항 동기화" PR 생성됨

// 2. PR 체크아웃
git checkout api-sync-123

// 3. 빌드 시도
npm run build

// ❌ 컴파일 에러 발생!
// src/components/CompetitorCard.tsx:15:7 - error TS2322:
// Type 'string' is not assignable to type 'number'.
// 15   const gpa: number = data.gpa;
//           ~~~

// 4. Changelog 확인
cat public/CHANGELOG.md
// ⚠️ Type changed: response.gpa (number → string)

// 5. 자동 생성된 타입 확인
cat src/types/api.ts
// gpa: string;  ← 이미 업데이트됨!

// 6. 코드 수정
// Before:
const gpa: number = data.gpa;

// After:
const gpa = parseFloat(data.gpa);

// 7. 다시 빌드
npm run build  // ✅ 성공!

// 8. 테스트
npm run test  // ✅ 통과!

// 9. 머지
```

### 자동 생성된 파일

```
frontend-repo/
├── public/
│   ├── openapi.json         ← 자동 생성
│   └── CHANGELOG.md         ← 자동 생성
├── src/
│   └── types/
│       └── api.ts           ← 자동 생성 (TypeScript 타입!)
└── package.json
```

**모두 GitHub Actions가 자동으로 생성하고 PR에 포함됩니다!**

---

## 요약: 각 팀의 책임

### 🔧 백엔드 팀
```bash
# 1. Bruno 저장소에서 .bru 파일 작성
vim users/get-profile.bru

# 2. docs 블록에 정확한 응답 예시 작성
docs {
  ```json
  { "id": 1, "username": "john" }
  ```
}

# 3. PR 생성 → 끝!
```

**설정 필요 없음!** 단지 Bruno docs만 정확히 작성

### 🎨 프론트엔드 팀
```bash
# 1. 자동 생성된 PR 확인
# 2. 타입 확인 (src/types/api.ts)
# 3. Breaking 있으면 코드 수정
# 4. 테스트 & 머지
```

**타입이 자동으로 업데이트!** TypeScript 컴파일러가 문제 찾아줌

### 🤖 자동화 (GitHub Actions)
- ✅ Bruno → OpenAPI 변환
- ✅ OpenAPI → TypeScript 타입 생성
- ✅ Breaking Changes 감지
- ✅ PR 자동 생성
- ✅ Changelog 생성

---

## 참고 문서

- [BRUNO-REPO-SETUP.md](./BRUNO-REPO-SETUP.md) - GitHub Actions 워크플로우 상세
- [CROSS-REPO-SYNC.md](./CROSS-REPO-SYNC.md) - Repository Dispatch 상세
- [FRONTEND-SETUP.md](./FRONTEND-SETUP.md) - 프론트엔드 설정
- [openapi-typescript 문서](https://github.com/drwpow/openapi-typescript) - 타입 생성 도구
- [openapi-fetch 문서](https://github.com/drwpow/openapi-typescript/tree/main/packages/openapi-fetch) - 타입 안전 클라이언트

---

**이제 3개의 독립된 저장소로 완벽하게 관리됩니다!** 🚀

Bruno docs만 정확히 작성하면, 나머지는 모두 자동입니다!
