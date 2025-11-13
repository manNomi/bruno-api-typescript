# Bruno 별도 저장소 GitHub Actions 설정

> **별도 Bruno 저장소를 만들 때 필요한 워크플로우**

## 📋 필요한 파일

Bruno 저장소의 `.github/workflows/` 폴더에 다음 파일들을 생성하세요:

### 1. api-review.yml - PR 자동 코멘트

```yaml
name: API 변경사항 리뷰

on:
  pull_request:
    paths:
      - '**/*.bru'

jobs:
  review:
    runs-on: ubuntu-latest

    steps:
      - name: 체크아웃
        uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Node 설정
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: bruno-openapi-sync 설치
        run: npm install -g bruno-openapi-sync

      - name: 이전 버전 OpenAPI 생성
        run: |
          git checkout origin/${{ github.base_ref }} || true
          bruno-sync generate -i . -o ./openapi-old.json

      - name: 현재 버전으로 복원
        run: |
          git checkout HEAD

      - name: 현재 버전 OpenAPI 생성 및 변경사항 감지
        run: |
          # 이전 버전 파일 복사
          if [ -f openapi-old.json ]; then
            cp openapi-old.json openapi.json.old
          fi

          # 현재 버전 생성
          bruno-sync generate \
            -i . \
            -o ./openapi.json \
            --diff \
            --changelog ./CHANGELOG.md

      - name: Breaking Changes 확인
        id: breaking
        run: |
          if [ -f CHANGELOG.md ] && grep -q "Breaking Changes" CHANGELOG.md; then
            echo "has_breaking=true" >> $GITHUB_OUTPUT
            echo "⚠️ Breaking changes 발견!"
          else
            echo "has_breaking=false" >> $GITHUB_OUTPUT
          fi

      - name: 변경된 .bru 파일 확인
        id: bruno_changes
        run: |
          CHANGED_FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep '\.bru$' || echo "")
          if [ -n "$CHANGED_FILES" ]; then
            echo "changed_files<<EOF" >> $GITHUB_OUTPUT
            echo "$CHANGED_FILES" >> $GITHUB_OUTPUT
            echo "EOF" >> $GITHUB_OUTPUT
          fi

      - name: PR에 변경사항 코멘트
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');

            let comment = '## 🔄 API 변경사항\n\n';

            // Breaking 경고
            const hasBreaking = '${{ steps.breaking.outputs.has_breaking }}' === 'true';
            if (hasBreaking) {
              comment += '### ⚠️ **Breaking Changes 발견!**\n\n';
              comment += '> 기존 코드를 깨뜨릴 수 있는 변경사항이 있습니다.\n\n';
            }

            // 변경된 파일
            const changedFiles = `${{ steps.bruno_changes.outputs.changed_files }}`;
            if (changedFiles) {
              comment += '### 📝 변경된 Bruno 파일\n\n';
              comment += '```\n' + changedFiles + '\n```\n\n';
            }

            // Changelog
            if (fs.existsSync('CHANGELOG.md')) {
              const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
              comment += '### 📊 상세 변경사항\n\n';
              comment += changelog;
            }

            // PR 코멘트 작성
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: comment
            });
```

### 2. notify-frontend.yml - 프론트엔드 알림

```yaml
name: Notify Frontend

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
                "commit_message": "${{ github.event.head_commit.message }}"
              }
            }'

      - name: Notify Complete
        run: echo "✅ Frontend repository notified!"
```

### 3. api-docs-deploy.yml - GitHub Pages 배포

```yaml
name: Deploy API Docs

on:
  push:
    branches:
      - main
    paths:
      - '**/*.bru'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install bruno-openapi-sync
        run: npm install -g bruno-openapi-sync

      - name: Generate OpenAPI
        run: |
          bruno-sync generate \
            -i . \
            -o ./docs/openapi.json \
            --title "우리팀 API" \
            --diff \
            --changelog ./docs/CHANGELOG.md \
            --changelog-format html

      - name: Create Swagger UI
        run: |
          mkdir -p docs
          cat > docs/api-viewer.html << 'EOF'
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

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

## 🔧 설정 방법

### Step 1: GitHub Personal Access Token 생성

1. GitHub → Settings → Developer settings → Personal access tokens
2. "Generate new token (classic)"
3. 권한: `repo`, `workflow`
4. Token 복사

### Step 2: Bruno 저장소에 Secret 등록

1. Bruno 저장소 → Settings → Secrets and variables → Actions
2. "New repository secret"
3. Name: `FRONTEND_REPO_TOKEN`
4. Value: 복사한 Token

### Step 3: GitHub Pages 활성화

1. Bruno 저장소 → Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` / `root`
4. Save

### Step 4: 워크플로우 파일 커밋

```bash
cd bruno-repo
mkdir -p .github/workflows

# 위의 3개 파일 생성
vim .github/workflows/api-review.yml
vim .github/workflows/notify-frontend.yml
vim .github/workflows/api-docs-deploy.yml

# YOUR-ORG/FRONTEND-REPO를 실제 값으로 변경!

git add .github/
git commit -m "ci: add GitHub Actions workflows"
git push
```

## ✅ 완료!

이제 Bruno 저장소에서:
- ✅ PR 생성 → 자동 코멘트
- ✅ main에 머지 → 프론트엔드 자동 알림
- ✅ GitHub Pages에 Swagger UI 배포

## 🔗 관련 문서

- [CROSS-REPO-SYNC.md](./CROSS-REPO-SYNC.md) - 저장소 간 동기화 상세
- [FRONTEND-SETUP.md](./FRONTEND-SETUP.md) - 프론트엔드 설정
