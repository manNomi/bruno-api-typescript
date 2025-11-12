# Bruno 저장소 자동 연동 가이드

> **별도의 Bruno 저장소 → 프론트엔드 저장소 자동 동기화**

## 🎯 문제 상황

```
[Bruno 저장소 (백엔드)]          [프론트엔드 저장소]
    bruno/                           src/
    ├── applications/                ├── api/
    └── users/                       └── components/
```

**백엔드가 Bruno를 수정하면 프론트엔드가 어떻게 알 수 있나요?**

---

## 💡 해결 방법 3가지

### 방법 1: Repository Dispatch (추천) ⭐

Bruno 저장소에서 변경 발생 → 프론트엔드 저장소에 자동 알림 → CI 실행

### 방법 2: Git Submodule

프론트엔드 저장소에 Bruno를 submodule로 포함

### 방법 3: NPM Package

Bruno에서 OpenAPI를 npm 패키지로 배포

---

## 🚀 방법 1: Repository Dispatch (가장 실용적)

### 작동 방식

```
[Bruno 저장소]
    ↓ Bruno 파일 변경
    ↓ Push to main
    ↓
GitHub Action 실행
    ↓
Repository Dispatch 이벤트 발송
    ↓
[프론트엔드 저장소]
    ↓
GitHub Action 자동 실행
    ↓
1. Bruno 저장소에서 최신 파일 가져오기
2. OpenAPI 생성
3. Swagger UI 업데이트
4. 변경사항 감지
5. PR 자동 생성
```

### Step 1: GitHub Personal Access Token 생성

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)" 클릭
3. 권한 선택:
   - `repo` (전체)
   - `workflow`
4. Token 복사 (한 번만 보임!)

### Step 2: Bruno 저장소에 Token 등록

1. Bruno 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret" 클릭
3. Name: `FRONTEND_REPO_TOKEN`
4. Value: 복사한 Token
5. Add secret

### Step 3: Bruno 저장소에 Workflow 추가

`.github/workflows/notify-frontend.yml` 파일 생성:

```yaml
name: Notify Frontend

on:
  push:
    branches:
      - main
    paths:
      - 'bruno/**'

jobs:
  notify:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Notify Frontend Repository
        run: |
          curl -X POST \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${{ secrets.FRONTEND_REPO_TOKEN }}" \
            https://api.github.com/repos/YOUR-ORG/FRONTEND-REPO/dispatches \
            -d '{
              "event_type": "bruno_updated",
              "client_payload": {
                "bruno_repo": "${{ github.repository }}",
                "commit_sha": "${{ github.sha }}",
                "commit_message": "${{ github.event.head_commit.message }}",
                "changed_files": "${{ github.event.commits[0].modified }}"
              }
            }'

      - name: Notify Complete
        run: |
          echo "✅ Frontend repository notified!"
          echo "🔗 Check: https://github.com/YOUR-ORG/FRONTEND-REPO/actions"
```

**주의**: `YOUR-ORG/FRONTEND-REPO`를 실제 프론트엔드 저장소로 변경!

### Step 4: 프론트엔드 저장소에 Workflow 추가

`.github/workflows/sync-bruno.yml` 파일 생성:

```yaml
name: Sync Bruno API

on:
  repository_dispatch:
    types: [bruno_updated]
  workflow_dispatch:  # 수동 실행도 가능

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Frontend
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Clone Bruno Repository
        run: |
          # Bruno 저장소 임시 클론
          git clone https://github.com/YOUR-ORG/BRUNO-REPO.git /tmp/bruno

          # Bruno 파일 복사 (옵션)
          # mkdir -p bruno
          # cp -r /tmp/bruno/bruno/* bruno/

      - name: Install Dependencies
        run: npm install

      - name: Generate OpenAPI
        run: |
          # Bruno 저장소에서 직접 생성
          npx bruno-sync generate \
            -i /tmp/bruno/bruno \
            -o ./public/openapi.json \
            --title "우리팀 API" \
            --diff \
            --changelog ./public/CHANGELOG.md

      - name: Check for changes
        id: changes
        run: |
          git add public/
          if git diff --staged --quiet; then
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            echo "has_changes=true" >> $GITHUB_OUTPUT
          fi

      - name: Create Pull Request
        if: steps.changes.outputs.has_changes == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: |
            chore: update API spec from Bruno

            Bruno commit: ${{ github.event.client_payload.commit_sha }}
            Message: ${{ github.event.client_payload.commit_message }}
          branch: api-sync-${{ github.event.client_payload.commit_sha }}
          title: "🔄 API 변경사항 동기화"
          body: |
            ## 🔄 Bruno API 변경사항 자동 동기화

            **Bruno 저장소**: ${{ github.event.client_payload.bruno_repo }}
            **Commit**: ${{ github.event.client_payload.commit_sha }}
            **메시지**: ${{ github.event.client_payload.commit_message }}

            ### 📝 변경된 파일
            ```
            ${{ github.event.client_payload.changed_files }}
            ```

            ### 🔗 확인하기
            - [OpenAPI 스펙](../blob/${{ steps.cpr.outputs.pull-request-head-sha }}/public/openapi.json)
            - [Changelog](../blob/${{ steps.cpr.outputs.pull-request-head-sha }}/public/CHANGELOG.md)

            ### ⚠️ 리뷰 필요
            - [ ] Breaking changes 확인
            - [ ] 프론트엔드 코드 영향 파악
            - [ ] 테스트 통과 확인

      - name: Notify Success
        if: steps.changes.outputs.has_changes == 'true'
        run: |
          echo "✅ API 동기화 PR 생성 완료!"
          echo "🔗 PR: https://github.com/${{ github.repository }}/pulls"
```

**주의**: `YOUR-ORG/BRUNO-REPO`를 실제 Bruno 저장소로 변경!

---

## 🔄 방법 2: Git Submodule

### 장점
- Bruno 파일을 프론트엔드 저장소에서 직접 확인 가능
- Git 히스토리 추적

### 단점
- Submodule 업데이트 수동 관리
- 팀원들이 submodule 개념 이해 필요

### 설정 방법

```bash
# 프론트엔드 저장소에서
cd frontend-repo

# Bruno 저장소를 submodule로 추가
git submodule add https://github.com/YOUR-ORG/BRUNO-REPO.git bruno-api

# Submodule 초기화
git submodule init
git submodule update

# Commit
git add .gitmodules bruno-api
git commit -m "chore: add bruno as submodule"
git push
```

### 자동 업데이트 Workflow

`.github/workflows/update-submodule.yml`:

```yaml
name: Update Bruno Submodule

on:
  schedule:
    - cron: '0 */6 * * *'  # 6시간마다
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout with submodules
        uses: actions/checkout@v3
        with:
          submodules: recursive
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Update submodule
        run: |
          git submodule update --remote --merge bruno-api

      - name: Check for changes
        id: changes
        run: |
          if git diff --quiet; then
            echo "has_changes=false" >> $GITHUB_OUTPUT
          else
            echo "has_changes=true" >> $GITHUB_OUTPUT
          fi

      - name: Generate OpenAPI
        if: steps.changes.outputs.has_changes == 'true'
        run: |
          npm install
          npx bruno-sync generate \
            -i bruno-api/bruno \
            -o ./public/openapi.json \
            --diff \
            --changelog ./public/CHANGELOG.md

      - name: Create PR
        if: steps.changes.outputs.has_changes == 'true'
        uses: peter-evans/create-pull-request@v5
        with:
          commit-message: "chore: update Bruno submodule"
          title: "🔄 Bruno API 업데이트"
          body: |
            Bruno submodule이 업데이트되었습니다.

            변경사항을 확인하고 머지해주세요.
```

---

## 📦 방법 3: NPM Package

### Bruno 저장소에서 패키지 배포

#### Step 1: Bruno 저장소에 package.json

```json
{
  "name": "@your-org/api-spec",
  "version": "1.0.0",
  "files": ["openapi.json", "bruno/"],
  "scripts": {
    "build": "bruno-sync generate -i ./bruno -o ./openapi.json",
    "prepublishOnly": "npm run build"
  }
}
```

#### Step 2: 자동 배포 Workflow

`.github/workflows/publish.yml`:

```yaml
name: Publish Package

on:
  push:
    branches:
      - main
    paths:
      - 'bruno/**'

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - name: Install
        run: npm install

      - name: Build
        run: npm run build

      - name: Bump version
        run: npm version patch

      - name: Publish
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### Step 3: 프론트엔드에서 사용

```bash
# 설치
npm install @your-org/api-spec

# 업데이트 확인
npm outdated @your-org/api-spec

# 업데이트
npm update @your-org/api-spec
```

```javascript
// 사용
import openapi from '@your-org/api-spec/openapi.json';
```

---

## 🎯 추천 방법 비교

| 방법 | 장점 | 단점 | 추천도 |
|------|------|------|--------|
| **Repository Dispatch** | 완전 자동, PR 자동 생성 | 초기 설정 필요 | ⭐⭐⭐⭐⭐ |
| **Git Submodule** | Git 히스토리 추적 | 수동 업데이트 | ⭐⭐⭐ |
| **NPM Package** | 버전 관리 명확 | NPM 계정 필요 | ⭐⭐⭐⭐ |

**추천**: Repository Dispatch + NPM Package 조합!

---

## 🚀 빠른 시작 (Repository Dispatch)

### 1분 체크리스트

- [ ] GitHub Personal Access Token 생성
- [ ] Bruno 저장소에 Token 등록
- [ ] Bruno 저장소에 `notify-frontend.yml` 추가
- [ ] 프론트엔드 저장소에 `sync-bruno.yml` 추가
- [ ] 저장소 이름 변경 (YOUR-ORG/REPO)
- [ ] Bruno 파일 수정하고 push
- [ ] 프론트엔드 저장소에 PR 자동 생성 확인!

---

## 💡 실제 사용 시나리오

```
[백엔드 팀]
1. Bruno 파일 수정
   vim bruno/users/get-profile.bru

2. Commit & Push
   git add bruno/
   git commit -m "feat: 프로필 API 추가"
   git push origin main

3. GitHub Action 자동 실행 ✅
   - notify-frontend.yml 실행
   - 프론트엔드에 알림 발송

[자동화]
4. 프론트엔드 저장소 Action 실행 ✅
   - Bruno 최신 버전 가져오기
   - OpenAPI 생성
   - 변경사항 감지
   - PR 자동 생성

[프론트엔드 팀]
5. PR 알림 받음 📢
6. PR 확인
   - Breaking changes?
   - Changelog 확인
7. 리뷰 & 머지
8. 완료! 🎉
```

**모든 것이 자동! 아무것도 안 해도 됨!**

---

## ❓ FAQ

### Q: 실시간으로 동기화되나요?
**A**: Bruno 저장소에 push하면 몇 초 안에 프론트엔드에 PR 생성됩니다.

### Q: 수동으로 동기화하려면?
**A**: 프론트엔드 저장소 → Actions → "Sync Bruno API" → "Run workflow"

### Q: Private 저장소도 되나요?
**A**: 네! Personal Access Token만 있으면 됩니다.

### Q: Monorepo에서도 되나요?
**A**: 네! 경로만 적절히 수정하면 됩니다.

---

## 🎉 결과

**Before (별도 저장소 문제)**:
- Bruno 수정 → 프론트가 모름
- 수동으로 알림
- 수동으로 동기화
- 10-30분 소요

**After (자동 연동)**:
- Bruno 수정 → 자동 알림
- PR 자동 생성
- Changelog 자동 생성
- 5분 안에 완료! ⚡

**이제 저장소가 분리되어 있어도 문제없습니다!** 🚀
