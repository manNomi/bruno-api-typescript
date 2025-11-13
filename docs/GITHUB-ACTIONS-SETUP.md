# GitHub Actions 적용 가이드

> **Bruno 별도 저장소를 위한 GitHub Actions 완전 설정**

## 📋 목차

1. [준비 사항](#준비-사항)
2. [Bruno 저장소 설정](#bruno-저장소-설정)
3. [프론트엔드 저장소 설정](#프론트엔드-저장소-설정)
4. [백엔드 저장소 설정 (선택)](#백엔드-저장소-설정-선택)
5. [Secret 설정](#secret-설정)
6. [테스트](#테스트)
7. [문제 해결](#문제-해결)

---

## 준비 사항

### 1. 저장소 3개 생성

```bash
# 1. Bruno 저장소
https://github.com/YOUR-ORG/bruno-api

# 2. 프론트엔드 저장소
https://github.com/YOUR-ORG/frontend-repo

# 3. 백엔드 저장소 (이미 있다면 skip)
https://github.com/YOUR-ORG/backend-repo
```

### 2. Personal Access Token 생성

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" 클릭
3. 이름: `Bruno API Sync Token`
4. 권한 선택:
   - ✅ `repo` (전체)
   - ✅ `workflow`
5. "Generate token" 클릭
6. **Token 복사** (⚠️ 한 번만 표시됨!)

```
예시: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Bruno 저장소 설정

### Step 1: 저장소 구조 생성

```bash
cd bruno-api

# 폴더 구조 생성
mkdir -p .github/workflows
mkdir -p applications users

# bruno.json 생성
cat > bruno.json << 'EOF'
{
  "name": "Our Team API",
  "type": "collection",
  "version": "1.0.0"
}
EOF
```

### Step 2: GitHub Actions 워크플로우 파일 생성

#### 2-1. PR 자동 코멘트

`.github/workflows/api-review.yml` 생성:

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

#### 2-2. GitHub Pages 배포

`.github/workflows/api-docs-deploy.yml` 생성:

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

#### 2-3. 다른 저장소에 알림

`.github/workflows/notify-repos.yml` 생성:

```yaml
name: Notify Other Repos

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
      - name: Notify Frontend Repo
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

  notify-backend:
    runs-on: ubuntu-latest
    if: false  # 백엔드 알림이 필요하면 true로 변경
    steps:
      - name: Notify Backend Repo
        run: |
          curl -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.REPO_ACCESS_TOKEN }}" \
            https://api.github.com/repos/${{ github.repository_owner }}/backend-repo/dispatches \
            -d '{
              "event_type": "bruno_updated",
              "client_payload": {
                "commit_sha": "${{ github.sha }}",
                "commit_message": "${{ github.event.head_commit.message }}"
              }
            }'
```

⚠️ **중요**: `frontend-repo`, `backend-repo`를 실제 저장소 이름으로 변경!

### Step 3: 파일 커밋

```bash
cd bruno-api

git add .github/
git commit -m "ci: add GitHub Actions workflows"
git push
```

---

## 프론트엔드 저장소 설정

### Step 1: 워크플로우 파일 생성

`.github/workflows/sync-bruno.yml` 생성:

```yaml
name: Sync Bruno API

on:
  repository_dispatch:
    types: [bruno_updated]
  workflow_dispatch:  # 수동 실행 가능
  schedule:
    - cron: '0 9 * * 1'  # 매주 월요일 오전 9시 (선택)

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

⚠️ **중요**: `bruno-api`를 실제 Bruno 저장소 이름으로 변경!

### Step 2: 파일 커밋

```bash
cd frontend-repo

mkdir -p .github/workflows
# 위의 sync-bruno.yml 파일 생성

git add .github/
git commit -m "ci: add Bruno sync workflow"
git push
```

---

## 백엔드 저장소 설정 (선택)

백엔드가 Bruno 업데이트 알림을 받으려면 (선택사항):

`.github/workflows/bruno-notification.yml` 생성:

```yaml
name: Bruno Updated

on:
  repository_dispatch:
    types: [bruno_updated]

jobs:
  notify:
    runs-on: ubuntu-latest

    steps:
      - name: Send Slack Notification (선택)
        if: false  # Slack 사용 시 true로 변경
        run: |
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "🔔 Bruno API 업데이트\nCommit: ${{ github.event.client_payload.commit_message }}"
            }'

      - name: Log notification
        run: |
          echo "Bruno API updated!"
          echo "Commit: ${{ github.event.client_payload.commit_sha }}"
          echo "Message: ${{ github.event.client_payload.commit_message }}"
```

---

## Secret 설정

### Bruno 저장소

1. Bruno 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Secret 추가:

| Name | Value |
|------|-------|
| `REPO_ACCESS_TOKEN` | 복사한 Personal Access Token |

### 프론트엔드 저장소

**Secret 추가 불필요!** `GITHUB_TOKEN`이 자동으로 제공됨

### 백엔드 저장소 (Slack 사용 시)

| Name | Value |
|------|-------|
| `SLACK_WEBHOOK` | Slack Webhook URL (선택) |

---

## GitHub Pages 활성화

### Bruno 저장소에서

1. Bruno 저장소 → Settings → Pages
2. Source: **GitHub Actions** 선택
3. Save

**배포 URL**:
```
https://YOUR-ORG.github.io/bruno-api/
```

---

## 테스트

### 1. 로컬에서 Bruno 파일 생성

```bash
cd bruno-api

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
    "email": "john@example.com"
  }
  ```
}
EOF
```

### 2. 테스트 PR 생성

```bash
git checkout -b test/workflow
git add users/get-profile.bru
git commit -m "test: add user profile API"
git push origin test/workflow
```

GitHub에서 PR 생성

### 3. 확인 사항

#### ✅ Bruno 저장소 PR에서
- [ ] PR에 자동 코멘트 달렸는가?
- [ ] 변경사항이 표시되는가?

#### ✅ PR 머지 후
- [ ] GitHub Actions 실행 완료?
- [ ] GitHub Pages 배포 완료?
  - 접속: `https://YOUR-ORG.github.io/bruno-api/`
- [ ] 프론트엔드 저장소에 PR 생성됨?

#### ✅ 프론트엔드 저장소 PR에서
- [ ] `public/openapi.json` 생성됨?
- [ ] `src/types/api.ts` 생성됨?
- [ ] `public/CHANGELOG.md` 생성됨?

### 4. 수동 테스트 (프론트엔드)

프론트엔드 저장소 → Actions → "Sync Bruno API" → "Run workflow"

---

## 문제 해결

### Q1: PR에 코멘트가 안 달려요

**확인사항**:
1. Bruno 저장소 → Actions 탭 확인
2. "API Review" 워크플로우 실행 상태 확인
3. 에러 로그 확인

**해결**:
```bash
# bruno-openapi-sync 설치 확인
npm install -g bruno-openapi-sync
bruno-sync --version
```

### Q2: 프론트엔드 PR이 생성 안 돼요

**확인사항**:
1. Bruno 저장소 → Settings → Secrets
2. `REPO_ACCESS_TOKEN`이 있는지 확인
3. Token 권한 확인 (repo, workflow)

**해결**:
```bash
# Token 테스트
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.github.com/user
```

### Q3: GitHub Pages가 안 열려요

**확인사항**:
1. Bruno 저장소 → Settings → Pages
2. Source가 "GitHub Actions"인지 확인
3. Actions → "Deploy API Docs" 성공했는지 확인

**해결**:
- 5-10분 대기 (첫 배포는 시간 소요)
- Actions 탭에서 "Deploy API Docs" 재실행

### Q4: TypeScript 타입이 생성 안 돼요

**확인사항**:
```bash
# 프론트엔드 저장소에서
npx openapi-typescript --version
```

**해결**:
```bash
# 수동 생성 테스트
npx openapi-typescript ./public/openapi.json -o ./src/types/api.ts
```

### Q5: Repository Dispatch가 안 돼요

**확인사항**:
```bash
# notify-repos.yml 확인
# 저장소 이름이 정확한지 확인
# YOUR-ORG/frontend-repo → 실제 이름으로 변경했는지
```

**테스트**:
```bash
# 수동으로 dispatch 발송
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.github.com/repos/YOUR-ORG/frontend-repo/dispatches \
  -d '{"event_type":"bruno_updated","client_payload":{"test":"true"}}'
```

---

## 체크리스트

### Bruno 저장소
- [ ] `.github/workflows/api-review.yml` 생성
- [ ] `.github/workflows/api-docs-deploy.yml` 생성
- [ ] `.github/workflows/notify-repos.yml` 생성
- [ ] 저장소 이름 수정 (`frontend-repo` → 실제 이름)
- [ ] Secret 추가 (`REPO_ACCESS_TOKEN`)
- [ ] GitHub Pages 활성화
- [ ] 테스트 PR 생성하여 확인

### 프론트엔드 저장소
- [ ] `.github/workflows/sync-bruno.yml` 생성
- [ ] 저장소 이름 수정 (`bruno-api` → 실제 이름)
- [ ] `package.json`에 스크립트 추가
- [ ] 수동 워크플로우 실행하여 테스트

### 백엔드 저장소 (선택)
- [ ] `.github/workflows/bruno-notification.yml` 생성
- [ ] Slack Webhook 설정 (선택)

---

## 다음 단계

1. **팀에 공유**
   - 백엔드 팀: Bruno 파일 작성 방법
   - 프론트엔드 팀: PR 확인 방법

2. **문서화**
   - Confluence/Notion에 워크플로우 정리
   - 온보딩 가이드 작성

3. **모니터링**
   - GitHub Actions 실행 상태 확인
   - 실패 알림 설정 (Slack 등)

---

## 참고 문서

- [BRUNO-SEPARATE-REPO.md](./BRUNO-SEPARATE-REPO.md) - 전체 가이드
- [FRONTEND-TYPE-GENERATION.md](./FRONTEND-TYPE-GENERATION.md) - 타입 생성
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [peter-evans/create-pull-request](https://github.com/peter-evans/create-pull-request)

---

**이제 GitHub Actions가 모두 설정되었습니다!** 🚀

Bruno 파일만 수정하면 모든 것이 자동으로 동작합니다.
