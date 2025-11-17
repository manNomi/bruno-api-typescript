# GitHub Actions 설정 가이드

Bruno API 자동화를 위한 GitHub Actions 설정 가이드입니다.

## 목차

1. [개요](#개요)
2. [사전 준비](#사전-준비)
3. [기본 워크플로우](#기본-워크플로우)
4. [PR 자동 리뷰](#pr-자동-리뷰)
5. [프론트엔드 자동 동기화](#프론트엔드-자동-동기화)
6. [Breaking Change 차단](#breaking-change-차단)
7. [스케줄 실행](#스케줄-실행)
8. [Secrets 설정](#secrets-설정)
9. [문제 해결](#문제-해결)

---

## 개요

### 자동화 시나리오

1. **PR 리뷰 자동화** - Bruno 파일 변경 시 API 변경사항 자동 코멘트
2. **Breaking Change 차단** - Breaking change 감지 시 PR 머지 차단
3. **프론트엔드 동기화** - API 변경 시 프론트엔드 레포에 자동 PR 생성
4. **문서 자동 생성** - OpenAPI 스펙 및 Changelog 자동 커밋

---

## 사전 준비

### 1. 저장소 구조 확인

```
your-project/
├── .github/
│   └── workflows/           # GitHub Actions 워크플로우
│       ├── api-review.yml
│       ├── api-sync.yml
│       └── breaking-check.yml
├── bruno/                   # Bruno 파일들
│   ├── users/
│   │   ├── get-user.bru
│   │   └── post-user.bru
│   └── bruno.json
├── package.json
└── README.md
```

### 2. package.json 설정

```json
{
  "name": "your-project",
  "scripts": {
    "api:generate": "bruno-api generate -i ./bruno -o ./openapi.json",
    "api:hooks": "bruno-api generate-hooks -i ./bruno -o ./src/apis",
    "api:diff": "bruno-api generate --diff",
    "api:changelog": "bruno-api generate --diff --changelog CHANGELOG.md"
  },
  "devDependencies": {
    "bruno-api-typescript": "^0.3.0"
  }
}
```

### 3. GitHub 권한 설정

Repository Settings → Actions → General:

- [x] Allow all actions and reusable workflows
- [x] Read and write permissions (Workflow permissions)
- [x] Allow GitHub Actions to create and approve pull requests

---

## 기본 워크플로우

### Bruno 파일 변경 감지 및 OpenAPI 생성

`.github/workflows/api-generate.yml`:

```yaml
name: Generate API Spec

on:
  push:
    branches: [main, develop]
    paths:
      - 'bruno/**/*.bru'
      - 'bruno/**/bruno.json'
  pull_request:
    paths:
      - 'bruno/**/*.bru'

jobs:
  generate:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 전체 히스토리 필요 (diff용)

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate OpenAPI spec
        run: npm run api:generate

      - name: Generate React Query hooks
        run: npm run api:hooks

      - name: Check for changes
        id: changes
        run: |
          if [[ -n $(git status --porcelain) ]]; then
            echo "has_changes=true" >> $GITHUB_OUTPUT
          else
            echo "has_changes=false" >> $GITHUB_OUTPUT
          fi

      - name: Commit changes
        if: steps.changes.outputs.has_changes == 'true' && github.event_name == 'push'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git commit -m "chore: auto-generate API spec and hooks [skip ci]"
          git push
```

---

## PR 자동 리뷰

### API 변경사항 PR 코멘트 자동 추가

`.github/workflows/api-review.yml`:

```yaml
name: API Review

on:
  pull_request:
    paths:
      - 'bruno/**/*.bru'

permissions:
  contents: read
  pull-requests: write

jobs:
  review:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout PR
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate current version
        run: |
          npx bruno-api generate -i ./bruno -o ./openapi-new.json

      - name: Checkout base branch
        run: |
          git checkout ${{ github.base_ref }} -- bruno/
          npx bruno-api generate -i ./bruno -o ./openapi-old.json || echo "{}" > openapi-old.json
          git checkout ${{ github.head_ref }} -- bruno/

      - name: Detect changes
        id: diff
        run: |
          npx bruno-api generate --diff --changelog CHANGELOG.md

          # Markdown 내용을 환경변수로 저장
          {
            echo 'CHANGELOG<<EOF'
            cat CHANGELOG.md
            echo EOF
          } >> $GITHUB_ENV

      - name: Check for breaking changes
        id: breaking
        run: |
          if grep -q "Breaking Changes" CHANGELOG.md 2>/dev/null; then
            echo "has_breaking=true" >> $GITHUB_OUTPUT
            echo "⚠️ Breaking changes detected!"
          else
            echo "has_breaking=false" >> $GITHUB_OUTPUT
            echo "✅ No breaking changes"
          fi

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            let changelog = '';
            try {
              changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
            } catch (e) {
              changelog = 'No API changes detected.';
            }

            const hasBreaking = '${{ steps.breaking.outputs.has_breaking }}' === 'true';
            const header = hasBreaking
              ? '## ⚠️ API Review - Breaking Changes Detected'
              : '## 🔍 API Review';

            const body = `${header}

${changelog}

---
*Auto-generated by bruno-api-typescript*`;

            // 기존 코멘트 찾기
            const comments = await github.rest.issues.listComments({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
            });

            const botComment = comments.data.find(
              c => c.user.type === 'Bot' && c.body.includes('API Review')
            );

            if (botComment) {
              // 기존 코멘트 업데이트
              await github.rest.issues.updateComment({
                comment_id: botComment.id,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: body
              });
            } else {
              // 새 코멘트 생성
              await github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: body
              });
            }

      - name: Add breaking change label
        if: steps.breaking.outputs.has_breaking == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.issues.addLabels({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              labels: ['breaking-change', 'needs-review']
            });
```

---

## 프론트엔드 자동 동기화

### Bruno 저장소 → 프론트엔드 저장소 자동 PR

`.github/workflows/frontend-sync.yml`:

```yaml
name: Sync to Frontend

on:
  push:
    branches: [main]
    paths:
      - 'bruno/**/*.bru'

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Bruno repo
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate hooks
        run: |
          npx bruno-api generate-hooks \
            -i ./bruno \
            -o ./generated/apis \
            --force

      - name: Generate types
        run: |
          npx bruno-api generate \
            -i ./bruno \
            -o ./generated/openapi.json

      - name: Clone frontend repo
        env:
          FRONTEND_REPO: ${{ secrets.FRONTEND_REPO }}
          GITHUB_TOKEN: ${{ secrets.FRONTEND_TOKEN }}
        run: |
          git clone https://${GITHUB_TOKEN}@github.com/${FRONTEND_REPO}.git frontend

      - name: Copy generated files
        run: |
          # API 훅 복사
          rm -rf frontend/src/apis
          cp -r generated/apis frontend/src/apis

          # OpenAPI 스펙 복사
          cp generated/openapi.json frontend/docs/

      - name: Create PR in frontend repo
        env:
          GITHUB_TOKEN: ${{ secrets.FRONTEND_TOKEN }}
        run: |
          cd frontend

          # 브랜치 생성
          BRANCH_NAME="api-sync/$(date +%Y%m%d-%H%M%S)"
          git checkout -b $BRANCH_NAME

          # 변경사항 확인
          if [[ -z $(git status --porcelain) ]]; then
            echo "No changes to sync"
            exit 0
          fi

          # 커밋
          git config user.name "api-sync-bot"
          git config user.email "api-sync@bot.noreply.github.com"
          git add .
          git commit -m "chore: sync API hooks from Bruno"

          # 푸시
          git push origin $BRANCH_NAME

          # PR 생성
          gh pr create \
            --title "🔄 API Sync: $(date +%Y-%m-%d)" \
            --body "## Auto-generated API sync

This PR was automatically generated from Bruno API changes.

### Changes
- Updated React Query hooks
- Updated TypeScript types
- Updated OpenAPI spec

### Source
Commit: ${{ github.sha }}
Branch: ${{ github.ref_name }}

---
*Auto-generated by bruno-api-typescript*" \
            --base main \
            --head $BRANCH_NAME
```

### Secrets 설정

Repository Settings → Secrets and variables → Actions:

1. **FRONTEND_REPO**: `your-org/frontend-repo`
2. **FRONTEND_TOKEN**: Personal Access Token (repo, workflow 권한)

---

## Breaking Change 차단

### Breaking Change 시 머지 차단

`.github/workflows/breaking-check.yml`:

```yaml
name: Breaking Change Check

on:
  pull_request:
    paths:
      - 'bruno/**/*.bru'

jobs:
  check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check for breaking changes
        id: breaking
        run: |
          # 이전 버전 생성
          git checkout ${{ github.base_ref }} -- bruno/ 2>/dev/null || true
          npx bruno-api generate -i ./bruno -o ./openapi-old.json 2>/dev/null || echo "{}" > openapi-old.json

          # 현재 버전 복원 및 생성
          git checkout ${{ github.head_ref }} -- bruno/
          npx bruno-api generate -i ./bruno -o ./openapi-new.json

          # 변경사항 감지
          npx bruno-api generate --diff --breaking-only --changelog BREAKING.md || true

          if grep -q "Breaking Changes" BREAKING.md 2>/dev/null; then
            echo "has_breaking=true" >> $GITHUB_OUTPUT
            echo "::error::⚠️ Breaking changes detected! Please review carefully."
            cat BREAKING.md
            exit 1
          else
            echo "has_breaking=false" >> $GITHUB_OUTPUT
            echo "✅ No breaking changes detected"
          fi

      - name: Upload breaking changes report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: breaking-changes-report
          path: BREAKING.md
```

### Branch Protection Rule 설정

Repository Settings → Branches → Add rule:

- Branch name pattern: `main`
- [x] Require a pull request before merging
- [x] Require status checks to pass before merging
  - [x] Breaking Change Check (필수 체크)
- [x] Require conversation resolution before merging

---

## 스케줄 실행

### 매일 API 문서 자동 업데이트

`.github/workflows/daily-docs.yml`:

```yaml
name: Daily API Documentation

on:
  schedule:
    - cron: '0 9 * * *'  # 매일 오전 9시 (UTC)
  workflow_dispatch:  # 수동 실행 가능

jobs:
  generate-docs:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Generate documentation
        run: |
          # OpenAPI 스펙 생성
          npm run api:generate

          # HTML Changelog 생성
          npx bruno-api generate --diff \
            --changelog docs/api-changelog.html \
            --changelog-format html

      - name: Commit and push
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

          git add .
          git diff --staged --quiet || git commit -m "docs: daily API documentation update"
          git push
```

---

## Secrets 설정

### Personal Access Token 생성

1. GitHub → Settings → Developer settings
2. Personal access tokens → Tokens (classic)
3. Generate new token
4. 권한 선택:
   - [x] repo (전체)
   - [x] workflow
   - [x] write:packages (필요시)
5. Token 복사 (한 번만 표시됨!)

### Repository Secrets 추가

Repository Settings → Secrets and variables → Actions → New repository secret:

| Secret Name | Value | 용도 |
|------------|-------|------|
| `FRONTEND_TOKEN` | `ghp_xxxx...` | 프론트엔드 레포 접근 |
| `FRONTEND_REPO` | `org/repo-name` | 프론트엔드 레포 경로 |
| `SLACK_WEBHOOK` | `https://hooks.slack.com/...` | Slack 알림 (선택) |

### Organization Secrets (팀 프로젝트)

Organization Settings → Secrets and variables → Actions:
- Repository access: All repositories 또는 Selected repositories

---

## 문제 해결

### 1. Permission Denied 에러

```
Error: Permission denied to github-actions[bot]
```

**해결:**
Repository Settings → Actions → General:
- Workflow permissions: Read and write permissions ✅

### 2. Push 실패

```
error: failed to push some refs
```

**해결:**
```yaml
- name: Push changes
  run: |
    git pull --rebase origin ${{ github.ref_name }}
    git push
```

### 3. npm ci 실패

```
npm ERR! package-lock.json
```

**해결:**
```yaml
- name: Install dependencies
  run: |
    npm install  # package-lock.json 없을 때
    # 또는
    npm ci --legacy-peer-deps  # 의존성 충돌 시
```

### 4. Checkout 권한 문제

```yaml
- uses: actions/checkout@v4
  with:
    token: ${{ secrets.GITHUB_TOKEN }}  # 기본 토큰
    # 또는
    token: ${{ secrets.PAT_TOKEN }}  # 커스텀 토큰 (더 많은 권한)
```

### 5. 캐시 문제

```yaml
- name: Clear npm cache
  run: npm cache clean --force

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

### 6. 타임아웃

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # 기본값: 360분
```

---

## 전체 워크플로우 예시

### 모든 기능 통합

`.github/workflows/api-complete.yml`:

```yaml
name: Complete API Workflow

on:
  push:
    branches: [main]
    paths:
      - 'bruno/**'
  pull_request:
    paths:
      - 'bruno/**'

permissions:
  contents: write
  pull-requests: write

jobs:
  validate:
    name: Validate Bruno Files
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx bruno-api generate --dry-run

  generate:
    name: Generate API Artifacts
    needs: validate
    runs-on: ubuntu-latest
    outputs:
      has_breaking: ${{ steps.check.outputs.has_breaking }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      - name: Generate all
        run: |
          npm run api:generate
          npm run api:hooks
          npm run api:changelog

      - name: Check breaking changes
        id: check
        run: |
          if grep -q "Breaking Changes" CHANGELOG.md; then
            echo "has_breaking=true" >> $GITHUB_OUTPUT
          else
            echo "has_breaking=false" >> $GITHUB_OUTPUT
          fi

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: api-artifacts
          path: |
            openapi.json
            CHANGELOG.md
            src/apis/

  review:
    name: PR Review
    needs: generate
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with:
          name: api-artifacts

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
            const hasBreaking = '${{ needs.generate.outputs.has_breaking }}' === 'true';

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## ${hasBreaking ? '⚠️' : '✅'} API Changes\n\n${changelog}`
            });

  deploy:
    name: Deploy Changes
    needs: [generate]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: api-artifacts

      - name: Commit changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add .
          git diff --staged --quiet || git commit -m "chore: update API artifacts [skip ci]"
          git push
```

---

## 다음 단계

- [MSW 설정 가이드](msw-setup.md) - 프론트엔드 모킹 설정
- [Bruno 파일 작성법](bruno-file-guide.md) - .bru 파일 작성 가이드
- [문제 해결](troubleshooting.md) - 일반적인 문제 해결

---

**[← 문서 목록으로](README.md)**
