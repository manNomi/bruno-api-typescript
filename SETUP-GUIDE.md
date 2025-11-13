# 🚀 완전 설정 가이드

> **Bruno 독립 저장소 → 프론트엔드 자동 연동 완전 설정**

## 📋 목차

- [QuickStart: 5분 개요](#quickstart-5분-개요)
- [1단계: Bruno 저장소 설정](#1단계-bruno-저장소-설정)
- [2단계: 프론트엔드 저장소 설정](#2단계-프론트엔드-저장소-설정)
- [3단계: 백엔드 개발자 작업](#3단계-백엔드-개발자-작업)
- [4단계: 프론트엔드 개발자 작업](#4단계-프론트엔드-개발자-작업)

---

## QuickStart: 5분 개요

### 전체 플로우

```
백엔드 개발자                Bruno 저장소              프론트엔드 개발자
     │                           │                           │
     ├─ .bru 파일 작성          │                           │
     │                           │                           │
     ├─ PR 생성 ─────────────> 🤖 PR 자동 코멘트          │
     │                           │  - 변경사항                │
     │                           │  - Breaking 여부           │
     │                           │                           │
     ├─ PR 머지 ─────────────> 🤖 GitHub Actions           │
     │                           │                           │
     │                           ├─ OpenAPI 생성             │
     │                           ├─ Swagger UI 배포          │
     │                           ├─ 프론트에 알림 ────────> 🤖 GitHub Actions
     │                           │                           │
     │                           │                           ├─ TypeScript 타입 생성
     │                           │                           ├─ PR 자동 생성
     │                           │                           │
     │                           │                      <─── 📬 PR 확인
     │                           │                           │
     │                           │                           ├─ Changelog 확인
     │                           │                           ├─ 필요시 코드 수정
     │                           │                           ├─ 테스트
     │                           │                           └─ PR 머지 ✅
```

### 필요한 것

- GitHub Personal Access Token
- 2개의 저장소:
  - `bruno-api` (Bruno 독립 저장소)
  - `frontend-repo` (프론트엔드 저장소)

---

## 1단계: Bruno 저장소 설정

> **담당**: DevOps / 백엔드 리드
> **소요 시간**: 15분

### 1-1. Personal Access Token 생성

```bash
# GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# "Generate new token (classic)" 클릭

# 권한 선택:
✅ repo (전체)
✅ workflow

# Token 복사 (한 번만 표시됨!)
ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 1-2. Bruno 저장소 생성

```bash
# 1. 새 저장소 생성
https://github.com/YOUR-ORG/bruno-api

# 2. 로컬에 클론
git clone https://github.com/YOUR-ORG/bruno-api.git
cd bruno-api

# 3. 폴더 구조 생성
mkdir -p .github/workflows
mkdir -p users applications

# 4. bruno.json 생성
cat > bruno.json << 'EOF'
{
  "name": "Our Team API",
  "type": "collection",
  "version": "1.0.0"
}
EOF
```

### 1-3. GitHub Actions 워크플로우 생성

#### 📄 `.github/workflows/api-review.yml`

<details>
<summary>클릭하여 전체 코드 보기</summary>

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

      - name: Get changed files
        id: files
        run: |
          FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep '\.bru$' || echo "")
          echo "changed_files<<EOF" >> $GITHUB_OUTPUT
          echo "$FILES" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Comment on PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            let comment = '## 🔄 API 변경사항\n\n';

            const hasBreaking = '${{ steps.breaking.outputs.has_breaking }}' === 'true';
            if (hasBreaking) {
              comment += '### ⚠️ **Breaking Changes 발견!**\n\n';
              comment += '> 프론트엔드 팀과 상의 후 머지해주세요.\n\n';
            }

            const files = `${{ steps.files.outputs.changed_files }}`;
            if (files) {
              comment += '### 📝 변경된 파일\n```\n' + files + '\n```\n\n';
            }

            if (fs.existsSync('CHANGELOG.md')) {
              const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
              comment += '### 📊 상세 변경사항\n\n' + changelog;
            }

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

</details>

#### 📄 `.github/workflows/api-docs-deploy.yml`

<details>
<summary>클릭하여 전체 코드 보기</summary>

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
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

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
            <meta charset="utf-8"/>
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
          </head>
          <body>
            <div id="swagger-ui"></div>
            <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
            <script>
              window.onload = () => {
                SwaggerUIBundle({
                  url: './openapi.json',
                  dom_id: '#swagger-ui',
                });
              };
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

</details>

#### 📄 `.github/workflows/notify-frontend.yml`

```yaml
name: Notify Frontend

on:
  push:
    branches:
      - main
    paths:
      - '**/*.bru'

jobs:
  notify-frontend:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Frontend Repository
        run: |
          curl -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.REPO_ACCESS_TOKEN }}" \
            https://api.github.com/repos/${{ github.repository_owner }}/frontend-repo/dispatches \
            -d '{
              "event_type": "bruno_updated",
              "client_payload": {
                "commit_sha": "${{ github.sha }}",
                "commit_message": "${{ github.event.head_commit.message }}",
                "pusher": "${{ github.event.pusher.name }}"
              }
            }'
```

⚠️ **중요**: `frontend-repo`를 실제 프론트엔드 저장소 이름으로 변경!

### 1-4. Secret 설정

```bash
# Bruno 저장소 → Settings → Secrets and variables → Actions
# "New repository secret" 클릭

Name: REPO_ACCESS_TOKEN
Value: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (1-1에서 복사한 토큰)
```

### 1-5. GitHub Pages 활성화

```bash
# Bruno 저장소 → Settings → Pages
# Source: GitHub Actions 선택
# Save

# 배포 URL 확인:
# https://YOUR-ORG.github.io/bruno-api/
```

### 1-6. 커밋 & 푸시

```bash
git add .github/
git commit -m "ci: add GitHub Actions workflows"
git push origin main
```

### ✅ 1단계 완료 체크리스트

- [ ] Personal Access Token 생성됨
- [ ] Bruno 저장소 생성됨
- [ ] 3개의 workflow 파일 생성됨
- [ ] Secret 설정됨 (`REPO_ACCESS_TOKEN`)
- [ ] GitHub Pages 활성화됨
- [ ] 커밋 & 푸시 완료

---

## 2단계: 프론트엔드 저장소 설정

> **담당**: 프론트엔드 리드
> **소요 시간**: 10분

### 2-1. GitHub Actions 워크플로우 생성

```bash
cd frontend-repo
mkdir -p .github/workflows
```

#### 📄 `.github/workflows/sync-bruno.yml`

<details>
<summary>클릭하여 전체 코드 보기</summary>

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
          git clone https://github.com/${{ github.repository_owner }}/bruno-api.git /tmp/bruno-api

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

            Bruno commit: ${{ github.event.client_payload.commit_sha }}
            By: ${{ github.event.client_payload.pusher }}
          branch: api-sync-${{ github.run_number }}
          delete-branch: true
          title: "${{ steps.breaking.outputs.has_breaking == 'true' && '⚠️ [BREAKING] ' || '✨ ' }}API 타입 동기화"
          body: |
            ## 🔄 Bruno API 자동 동기화

            **Bruno Commit**: `${{ github.event.client_payload.commit_sha }}`
            **변경자**: ${{ github.event.client_payload.pusher }}
            **메시지**: ${{ github.event.client_payload.commit_message }}

            ${{ steps.breaking.outputs.has_breaking == 'true' && '### ⚠️ Breaking Changes 있음!\n\nTypeScript 컴파일러가 자동으로 에러를 표시합니다.\n```bash\nnpm run build\n```\n' || '' }}

            ### 📝 변경된 파일
            - `public/openapi.json` - OpenAPI 스펙
            - `src/types/api.ts` - TypeScript 타입 ✨
            - `public/CHANGELOG.md` - 변경사항 상세

            ### 📖 확인하기
            - [Changelog](../blob/api-sync-${{ github.run_number }}/public/CHANGELOG.md)
            - [OpenAPI Spec](../blob/api-sync-${{ github.run_number }}/public/openapi.json)
            - [Swagger UI](https://${{ github.repository_owner }}.github.io/bruno-api/)

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

</details>

⚠️ **중요**: `bruno-api`를 실제 Bruno 저장소 이름으로 변경!

### 2-2. package.json에 스크립트 추가

```json
{
  "scripts": {
    "types:generate": "openapi-typescript ./public/openapi.json -o ./src/types/api.ts",
    "types:watch": "openapi-typescript ./public/openapi.json -o ./src/types/api.ts --watch"
  },
  "devDependencies": {
    "openapi-typescript": "^6.0.0",
    "openapi-fetch": "^0.8.0"
  }
}
```

### 2-3. 커밋 & 푸시

```bash
git add .github/ package.json
git commit -m "ci: add Bruno sync workflow"
git push origin main
```

### ✅ 2단계 완료 체크리스트

- [ ] `sync-bruno.yml` 생성됨
- [ ] `package.json`에 스크립트 추가됨
- [ ] 커밋 & 푸시 완료
- [ ] Actions 탭에서 워크플로우 확인됨

---

## 3단계: 백엔드 개발자 작업

> **담당**: 백엔드 개발자
> **소요 시간**: API 작성마다 5분

### 3-1. Bruno 파일 작성

```bash
# 1. Bruno 저장소 클론
git clone https://github.com/YOUR-ORG/bruno-api.git
cd bruno-api

# 2. 브랜치 생성
git checkout -b feature/add-user-profile

# 3. Bruno 파일 작성
mkdir -p users
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
```

### 3-2. 로컬 테스트

```bash
# OpenAPI 생성 테스트
npm install -g bruno-openapi-sync
bruno-sync generate -i . -o openapi.json

# 생성된 OpenAPI 확인
cat openapi.json
```

### 3-3. PR 생성

```bash
# 커밋
git add users/get-profile.bru
git commit -m "feat: add user profile API"

# 푸시
git push origin feature/add-user-profile

# GitHub에서 PR 생성
# 제목: feat: add user profile API
```

### 3-4. PR 코멘트 확인

PR을 생성하면 자동으로 코멘트가 달립니다:

```markdown
## 🔄 API 변경사항

### 📝 변경된 파일
users/get-profile.bru

### 📊 상세 변경사항
✨ Added:
   GET /users/profile
```

### 3-5. PR 머지

```bash
# 리뷰 완료 후
# GitHub에서 "Merge pull request" 클릭
```

### ✅ 3단계 완료 체크리스트

- [ ] Bruno 파일 작성 (docs 블록 필수!)
- [ ] 로컬 테스트 완료
- [ ] PR 생성됨
- [ ] PR 코멘트 확인됨
- [ ] PR 머지됨
- [ ] GitHub Pages 배포 확인 (main 머지 후 5분)

---

## 4단계: 프론트엔드 개발자 작업

> **담당**: 프론트엔드 개발자
> **소요 시간**: Breaking 없으면 1분, 있으면 5~10분

### 4-1. 자동 생성된 PR 확인

Bruno 저장소에서 main에 머지되면, 약 1~2분 후 프론트엔드 저장소에 PR이 자동 생성됩니다.

```
제목: ✨ API 타입 동기화
또는
제목: ⚠️ [BREAKING] API 타입 동기화
```

### 4-2. PR 내용 확인

```markdown
## 🔄 Bruno API 자동 동기화

### 📝 변경된 파일
- `public/openapi.json` - OpenAPI 스펙
- `src/types/api.ts` - TypeScript 타입 ✨
- `public/CHANGELOG.md` - 변경사항 상세
```

### 4-3-A. Breaking이 없는 경우 (1분)

```bash
# 1. PR 체크아웃
git fetch origin
git checkout api-sync-123

# 2. 빌드 확인
npm run build
# ✅ 에러 없음!

# 3. 테스트
npm run test
# ✅ 통과!

# 4. GitHub에서 PR 머지
```

### 4-3-B. Breaking이 있는 경우 (5~10분)

```bash
# 1. PR 체크아웃
git fetch origin
git checkout api-sync-123

# 2. Changelog 확인
cat public/CHANGELOG.md
```

```markdown
## ⚠️ Breaking Changes

### `GET /users/profile`

**변경사항**:
- 🔄 Type changed: `response.age` from `number` to `string`

**마이그레이션 가이드**:
// Before
const age: number = user.age;

// After
const age: string = user.age;
```

```bash
# 3. 빌드 시도 (컴파일 에러 확인)
npm run build
```

```
❌ src/components/Profile.tsx:15:7 - error TS2322:
Type 'string' is not assignable to type 'number'.

15   const age: number = user.age;
```

```bash
# 4. 영향 범위 파악
grep -r "\.age" src/

# 출력:
# src/components/Profile.tsx:15:  const age: number = user.age;
# src/pages/UserList.tsx:42:  return user.age > 18;
```

```bash
# 5. 코드 수정
```

```typescript
// src/components/Profile.tsx
// ❌ Before
const age: number = user.age;

// ✅ After
const age = parseInt(user.age);

// src/pages/UserList.tsx
// ❌ Before
return user.age > 18;

// ✅ After
return parseInt(user.age) > 18;
```

```bash
# 6. 테스트
npm run build  # ✅ 성공!
npm run test   # ✅ 통과!

# 7. 커밋 & 푸시
git add .
git commit -m "fix: handle age as string"
git push

# 8. GitHub에서 PR 머지
```

### 4-4. 타입 사용 (개발)

이제 새로운 타입을 사용할 수 있습니다:

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
      //   ^? { id: number; username: string; email: string; createdAt: string }
    });
  }, []);

  return <div>{user?.username}</div>;
};
```

### ✅ 4단계 완료 체크리스트

- [ ] 자동 생성된 PR 확인됨
- [ ] Changelog 읽음
- [ ] Breaking 있으면 코드 수정 완료
- [ ] 빌드 테스트 통과
- [ ] 단위 테스트 통과
- [ ] PR 머지됨
- [ ] 새 타입으로 개발 진행

---

## 📊 전체 플로우 요약

| 단계 | 담당자 | 소요 시간 | 주요 작업 |
|------|--------|----------|----------|
| 1단계 | DevOps/백엔드 리드 | 15분 (1회) | Bruno 저장소 설정 |
| 2단계 | 프론트엔드 리드 | 10분 (1회) | 프론트엔드 저장소 설정 |
| 3단계 | 백엔드 개발자 | 5분 (매번) | Bruno 파일 작성 & PR |
| 4단계 | 프론트엔드 개발자 | 1~10분 (매번) | PR 확인 & 머지 |

---

## 🎯 최종 결과

### Before (수동)
```
백엔드: API 수정
   ↓
백엔드: Slack으로 알림 "API 바뀌었어요~"
   ↓
프론트: "뭐가 바뀌었어요?"
   ↓
백엔드: 문서 찾아서 설명
   ↓
프론트: 타입 수동 작성
   ↓
**총 소요 시간: 30분~1시간**
```

### After (자동)
```
백엔드: Bruno 파일 작성 & PR 머지 (5분)
   ↓
🤖 자동 실행
   ↓
프론트: PR 확인 & 머지 (1~10분)
   ↓
**총 소요 시간: 6~15분**
```

**시간 절약: 50~80%** 🚀

---

## 🔗 참고 문서

- [Bruno 파일 작성 가이드](./docs/BRUNO-GUIDE.md) - 백엔드용
- [프론트엔드 완전 가이드](./docs/FRONTEND-GUIDE.md) - 프론트용
- [GitHub Actions 설정 가이드](./docs/GITHUB-ACTIONS-SETUP.md) - 자동화 설정

---

**이제 시작하세요!** 🎉
