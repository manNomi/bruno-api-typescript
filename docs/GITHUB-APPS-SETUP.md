# GitHub Apps를 이용한 자동 동기화 가이드

> Bruno 리포지토리의 .bru 파일이 변경되면 자동으로 프론트엔드 리포지토리에 React Query 훅을 생성하고 PR을 만드는 완전 자동화 가이드

## 📋 목차

- [개요](#개요)
- [왜 GitHub Apps를 사용하나요?](#왜-github-apps를-사용하나요)
- [1단계: GitHub App 생성](#1단계-github-app-생성)
- [2단계: App 설치](#2단계-app-설치)
- [3단계: Secrets 설정](#3단계-secrets-설정)
- [4단계: GitHub Actions 설정](#4단계-github-actions-설정)
- [5단계: 테스트](#5단계-테스트)
- [문제 해결](#문제-해결)

---

## 개요

### 자동화 플로우

```
Bruno 리포 (.bru 파일 변경)
    ↓ Push to main
GitHub Actions 트리거
    ↓
bruno-api generate-hooks 실행
    ↓
프론트엔드 리포에 코드 생성
    ↓
자동으로 PR 생성
    ↓
팀원이 리뷰 후 머지
```

### 필요한 리포지토리

1. **Bruno 리포** (소스): .bru 파일이 있는 리포
2. **프론트엔드 리포** (타겟): React Query 훅이 생성될 리포

---

## 왜 GitHub Apps를 사용하나요?

| 항목 | Personal Access Token | GitHub Apps ✅ |
|------|----------------------|----------------|
| **보안** | 개인 계정 전체 권한 | App별 세밀한 권한 설정 |
| **토큰 만료** | 수동 갱신 필요 | 자동 갱신 (1시간마다) |
| **감사 로그** | 개인 활동으로 기록 | Bot 활동으로 명확히 구분 |
| **Rate Limit** | 5,000 requests/hour | 15,000 requests/hour |
| **권한 범위** | 넓고 통제 어려움 | 필요한 것만 정확히 부여 |
| **조직 관리** | 개인에 의존 | 조직에서 중앙 관리 |
| **멤버 퇴사 시** | 토큰 무효화 위험 | 영향 없음 |

---

## 1단계: GitHub App 생성

### 1.1 GitHub에서 App 생성

1. GitHub 계정 → **Settings** 이동
2. 왼쪽 메뉴에서 **Developer settings** 클릭
3. **GitHub Apps** → **New GitHub App** 클릭

### 1.2 기본 정보 입력

**GitHub App name:**
```
Bruno API Sync Bot
```
*또는 원하는 이름 (전역적으로 유니크해야 함)*

**Homepage URL:**
```
https://github.com/YOUR_USERNAME/bruno-api-typescript
```

**Webhook:**
- ❌ **Active** 체크 해제 (이 자동화에는 webhook 불필요)

**Permissions (Repository permissions):**

다음 권한을 설정하세요:

| 권한 | 레벨 | 이유 |
|------|------|------|
| **Contents** | Read and write | 코드 읽기/쓰기 |
| **Pull requests** | Read and write | PR 생성 |
| **Metadata** | Read-only | 기본 메타데이터 (필수) |
| **Workflows** | Read and write | (선택) Actions 실행 |

**Where can this GitHub App be installed?**
- 🔘 **Only on this account** 선택

### 1.3 App 생성 완료

**Create GitHub App** 버튼 클릭

---

## 2단계: App 설치

### 2.1 App ID 복사

생성 완료 후 나타나는 페이지에서:

1. **App ID** 찾기 (예: `123456`)
2. 메모장에 복사 (나중에 사용)

### 2.2 Private Key 생성

같은 페이지 하단에서:

1. **Private keys** 섹션 찾기
2. **Generate a private key** 버튼 클릭
3. `.pem` 파일 자동 다운로드
4. **안전한 곳에 보관** (재다운로드 불가!)

### 2.3 App 설치

1. 왼쪽 메뉴에서 **Install App** 클릭
2. 설치할 계정 선택 (본인 계정 또는 조직)
3. **Install** 클릭
4. 리포지토리 선택:
   - 🔘 **Only select repositories** 선택
   - ✅ **Bruno 리포** 체크
   - ✅ **프론트엔드 리포** 체크
5. **Install** 클릭

---

## 3단계: Secrets 설정

### 3.1 Bruno 리포에 Secrets 추가

1. **Bruno 리포** → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭

### 3.2 APP_ID 추가

**Name:**
```
APP_ID
```

**Secret:**
```
123456
```
*2단계에서 복사한 App ID*

**Add secret** 클릭

### 3.3 APP_PRIVATE_KEY 추가

**Name:**
```
APP_PRIVATE_KEY
```

**Secret:**
다운로드한 `.pem` 파일을 텍스트 에디터로 열어서 **전체 내용** 복사:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA1234567890abcdefghijklmnopqrstuvwxyz...
(여러 줄...)
...xyz1234567890
-----END RSA PRIVATE KEY-----
```

**⚠️ 주의:**
- 전체 내용 복사 (BEGIN/END 포함)
- 줄바꿈 그대로 유지
- 앞뒤 공백 없이

**Add secret** 클릭

### 3.4 확인

Secrets 목록에 다음 2개가 있어야 합니다:
- ✅ `APP_ID`
- ✅ `APP_PRIVATE_KEY`

---

## 4단계: GitHub Actions 설정

### 4.1 워크플로우 파일 생성

Bruno 리포에서 다음 파일을 생성합니다:

**파일 경로:**
```
.github/workflows/sync-to-frontend.yml
```

**내용:** (아래 전체 복사)

```yaml
name: Sync API Hooks to Frontend

on:
  push:
    branches:
      - main  # main 브랜치 푸시 시
    paths:
      - '**.bru'  # .bru 파일 변경 시만
  workflow_dispatch:  # 수동 실행 가능

jobs:
  generate-and-sync:
    runs-on: ubuntu-latest

    steps:
      # 1. GitHub App 토큰 생성
      - name: Generate GitHub App Token
        id: generate-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}
          owner: YOUR_GITHUB_USERNAME  # ⚠️ 여기를 본인 GitHub 사용자명으로 변경
          repositories: "bruno-repo-name,frontend-repo-name"  # ⚠️ 실제 리포 이름으로 변경

      # 2. Bruno 리포 체크아웃
      - name: Checkout Bruno Repo
        uses: actions/checkout@v4
        with:
          path: bruno-repo

      # 3. 프론트엔드 리포 체크아웃
      - name: Checkout Frontend Repo
        uses: actions/checkout@v4
        with:
          repository: YOUR_USERNAME/YOUR_FRONTEND_REPO  # ⚠️ 실제 리포 경로로 변경
          token: ${{ steps.generate-token.outputs.token }}
          path: frontend-repo

      # 4. Node.js 설정
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'

      # 5. bruno-api-typescript 설치
      - name: Install bruno-api-typescript
        run: |
          cd frontend-repo
          npm install -D github:manNomi/bruno-api-typescript
        env:
          GITHUB_TOKEN: ${{ steps.generate-token.outputs.token }}

      # 6. React Query 훅 생성
      - name: Generate React Query Hooks
        run: |
          cd frontend-repo
          npx bruno-api generate-hooks \
            -i ../bruno-repo/bruno \
            -o ./src/apis \
            --axios-path "@/utils/axiosInstance"

      # 7. 변경사항 확인
      - name: Check for changes
        id: git-check
        run: |
          cd frontend-repo
          if [[ -n $(git status -s) ]]; then
            echo "has_changes=true" >> $GITHUB_OUTPUT
            echo "✅ Changes detected"
          else
            echo "has_changes=false" >> $GITHUB_OUTPUT
            echo "ℹ️ No changes"
          fi

      # 8. 브랜치 생성 및 커밋
      - name: Commit and Push Changes
        if: steps.git-check.outputs.has_changes == 'true'
        run: |
          cd frontend-repo

          # Git 설정
          git config user.name "bruno-api-sync-bot[bot]"
          git config user.email "bruno-api-sync-bot[bot]@users.noreply.github.com"

          # 브랜치 생성
          BRANCH_NAME="auto/update-api-hooks-$(date +%Y%m%d-%H%M%S)"
          git checkout -b $BRANCH_NAME

          # 커밋
          git add src/apis
          git commit -m "chore: update API hooks from Bruno

          🤖 Auto-generated by bruno-api-typescript

          Source: ${{ github.repository }}@${{ github.sha }}
          Triggered by: ${{ github.actor }}"

          # 푸시
          git push origin $BRANCH_NAME

          echo "branch_name=$BRANCH_NAME" >> $GITHUB_OUTPUT
        id: commit

      # 9. PR 생성
      - name: Create Pull Request
        if: steps.git-check.outputs.has_changes == 'true'
        working-directory: frontend-repo
        run: |
          gh pr create \
            --title "🔄 Update API Hooks from Bruno" \
            --body "## 🤖 Auto-generated PR

          React Query 훅이 Bruno API 변경사항을 반영하여 업데이트되었습니다.

          ### 📋 Source Information
          - **Repository**: \`${{ github.repository }}\`
          - **Commit**: [\`${GITHUB_SHA:0:7}\`](https://github.com/${{ github.repository }}/commit/${{ github.sha }})
          - **Triggered by**: @${{ github.actor }}

          ### 📦 Generated Files
          - \`src/apis/**/*.ts\` - React Query hooks
          - \`src/apis/queryKeys.ts\` - Query key constants

          ### ✅ Review Checklist
          - [ ] Breaking changes 확인
          - [ ] 변경된 API 사용하는 컴포넌트 업데이트
          - [ ] \`npm run type-check\` 실행
          - [ ] 테스트 실행 (\`npm test\`)

          ---
          *Generated by [bruno-api-typescript](https://github.com/manNomi/bruno-api-typescript)*
          " \
            --base main \
            --head ${{ steps.commit.outputs.branch_name }} \
            --label "auto-generated" \
            --label "api-update"
        env:
          GH_TOKEN: ${{ steps.generate-token.outputs.token }}

      # 10. 결과 요약
      - name: Summary
        run: |
          echo "## 🎉 Workflow Completed" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          if [[ "${{ steps.git-check.outputs.has_changes }}" == "true" ]]; then
            echo "✅ PR created successfully!" >> $GITHUB_STEP_SUMMARY
            echo "- Branch: \`${{ steps.commit.outputs.branch_name }}\`" >> $GITHUB_STEP_SUMMARY
          else
            echo "ℹ️ No changes detected. PR not created." >> $GITHUB_STEP_SUMMARY
          fi
```

### 4.2 변경해야 할 부분

워크플로우 파일에서 다음 부분을 본인의 정보로 수정하세요:

**Line 19-20:**
```yaml
owner: YOUR_GITHUB_USERNAME  # 예: manNomi
repositories: "bruno-repo-name,frontend-repo-name"  # 예: "bruno-api,my-frontend"
```

**Line 30:**
```yaml
repository: YOUR_USERNAME/YOUR_FRONTEND_REPO  # 예: manNomi/my-frontend-app
```

### 4.3 커밋 및 푸시

```bash
git add .github/workflows/sync-to-frontend.yml
git commit -m "feat: add GitHub Actions workflow for auto-sync"
git push
```

---

## 5단계: 테스트

### 5.1 수동 실행으로 테스트

1. **Bruno 리포** → **Actions** 탭
2. **Sync API Hooks to Frontend** 워크플로우 클릭
3. **Run workflow** → **Run workflow** 클릭
4. 실행 완료 대기 (1-2분)

### 5.2 결과 확인

**성공 시:**
- ✅ 모든 단계가 녹색 체크
- 프론트엔드 리포에 새 PR 생성됨
- PR에 자동 생성된 코드 포함

**실패 시:**
- 빨간 X 표시된 단계 클릭
- 로그 확인하여 문제 해결

### 5.3 자동 실행 테스트

1. Bruno 리포에서 `.bru` 파일 수정
2. `main` 브랜치에 커밋 & 푸시
3. Actions 탭에서 자동 실행 확인

---

## 문제 해결

### ❌ "Resource not accessible by integration"

**원인:** GitHub App 권한 부족

**해결:**
1. GitHub Apps 설정 페이지 이동
2. Permissions 확인:
   - Contents: Read and write ✅
   - Pull requests: Read and write ✅
3. 권한 변경 후 **Save** 클릭
4. 조직에서 요청 승인 필요 (조직인 경우)

### ❌ "Bad credentials"

**원인:** APP_PRIVATE_KEY가 잘못됨

**해결:**
1. `.pem` 파일 다시 열기
2. 전체 내용 복사 (BEGIN/END 포함)
3. Secrets에 다시 입력
4. 앞뒤 공백 제거

### ❌ "repository not found"

**원인:** App이 리포에 설치 안 됨

**해결:**
1. GitHub Apps 설정 → Install App
2. 해당 계정/조직 클릭
3. Repository access에서 리포 추가
4. **Save** 클릭

### ❌ PR 생성 실패

**원인:** gh CLI 인증 문제

**해결:**
워크플로우에서 `GH_TOKEN` 환경변수 확인:
```yaml
env:
  GH_TOKEN: ${{ steps.generate-token.outputs.token }}
```

### ❌ 훅 생성 실패

**원인:** bruno-api-typescript 설치 실패

**해결:**
1. 프론트엔드 리포 `package.json` 확인
2. 수동으로 설치 테스트:
```bash
npm install -D github:manNomi/bruno-api-typescript
```

---

## 고급 설정

### Slack 알림 추가

워크플로우 끝에 추가:

```yaml
- name: Notify Slack
  if: steps.git-check.outputs.has_changes == 'true'
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "🔄 API hooks updated in frontend repo",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*API Hooks Updated* :rocket:\n\nTriggered by: ${{ github.actor }}"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Breaking Changes 감지

훅 생성 전에 추가:

```yaml
- name: Check Breaking Changes
  run: |
    cd frontend-repo
    npx bruno-api generate --diff --breaking-only
    if [ $? -eq 1 ]; then
      echo "⚠️ Breaking changes detected!" >> $GITHUB_STEP_SUMMARY
      echo "breaking=true" >> $GITHUB_OUTPUT
    fi
  id: breaking-check
```

---

## 참고 자료

- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [bruno-api-typescript GitHub](https://github.com/manNomi/bruno-api-typescript)

---

## 도움이 필요하신가요?

- 🐛 [Issue 생성](https://github.com/manNomi/bruno-api-typescript/issues)
- 📧 Email: support@example.com

---

**Last Updated:** 2025-01-14
**Version:** 1.0.0
