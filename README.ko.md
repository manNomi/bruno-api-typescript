# bruno-openapi-sync

> **Bruno .bru 파일 → OpenAPI 3.0 자동 변환 + API 변경사항 추적**

Bruno API 컬렉션을 OpenAPI 스펙으로 자동 변환하고, 버전 간 변경사항을 자동으로 감지하여 Changelog를 생성합니다.

## ✨ 주요 기능

- **🔄 Bruno → OpenAPI**: .bru 파일을 OpenAPI 3.0으로 자동 변환
- **📊 변경사항 자동 감지**: 이전 버전과 비교하여 변경사항 자동 추출
- **⚠️ Breaking Changes 경고**: 기존 코드를 깨뜨릴 수 있는 변경사항 자동 식별
- **📝 Changelog 자동 생성**: Markdown, JSON, HTML 형식으로 변경 이력 생성
- **🎯 도메인별 그룹화**: 폴더 구조 기반 자동 분류
- **🔍 깊은 스키마 분석**: 중첩 객체 내 필드 레벨 변경사항까지 추적
- **🌐 Swagger UI 자동 배포**: GitHub Pages로 API 문서 자동 게시 🆕
- **🤖 PR 자동 리뷰**: PR에 변경사항 자동 코멘트 🆕

## 📦 설치

```bash
npm install -D bruno-openapi-sync
```

## 🚀 빠른 시작

### 기본 사용법

```bash
# OpenAPI 스펙 생성
npx bruno-sync generate -i ./bruno -o ./openapi.json

# 변경사항 감지
npx bruno-sync generate --diff

# Changelog 생성
npx bruno-sync generate --diff --changelog CHANGELOG.md
```

### package.json에 스크립트 추가

```json
{
  "scripts": {
    "api:generate": "bruno-sync generate -i ./bruno -o ./openapi.json",
    "api:diff": "bruno-sync generate --diff",
    "api:changelog": "bruno-sync generate --diff --changelog CHANGELOG.md",
    "api:changelog:html": "bruno-sync generate --diff --changelog docs/changelog.html --changelog-format html"
  }
}
```

## 📖 사용 방법

### CLI 옵션

```
bruno-sync generate [옵션]

옵션:
  -i, --input <경로>              Bruno 컬렉션 디렉토리 (기본값: "./bruno")
  -o, --output <경로>             출력할 OpenAPI 파일 (기본값: "./openapi.json")
  --title <제목>                  API 제목 (기본값: "API Documentation")
  --version <버전>                API 버전 (기본값: "1.0.0")
  --description <설명>            API 설명
  --base-url <URL>                API Base URL

변경사항 추적:
  --diff                          이전 버전과 비교하여 변경사항 감지
  --changelog <경로>              Changelog 파일 생성
  --changelog-format <형식>       형식: markdown | json | html (기본값: "markdown")
  --breaking-only                 Breaking changes만 표시
```

### 사용 예시

#### 1. OpenAPI 생성

```bash
npx bruno-sync generate \
  --input ./bruno \
  --output ./openapi.json \
  --title "우리팀 API" \
  --version "2.0.0" \
  --base-url "https://api.example.com"
```

#### 2. 변경사항 감지

```bash
npx bruno-sync generate --diff
```

**출력 예시:**
```
🔍 API 변경사항 감지됨

📊 요약:
   ✨ 추가됨:    2
   🗑️  제거됨:   0
   🔄 수정됨:    1
   ⚠️  **Breaking Changes**: 1

📝 상세 변경사항:

⚠️  BREAKING CHANGES:
   GET    /applications/competitors
      ~ response.firstChoice[].gpa (number → string)
      - response.firstChoice[].applicants[].schoolId

✨ 추가됨:
   POST   /applications/submit
   GET    /applications/:id/documents
```

#### 3. Markdown Changelog 생성

```bash
npx bruno-sync generate --diff --changelog CHANGELOG.md
```

**생성 결과: CHANGELOG.md**
```markdown
# API Changelog

**생성일**: 2025-11-12 14:30:00

## 📊 요약

| 타입 | 개수 |
|------|------|
| ✨ 추가됨 | 2 |
| 🗑️ 제거됨 | 0 |
| 🔄 수정됨 | 1 |
| ⚠️ **Breaking Changes** | **1** |

## ⚠️ Breaking Changes

> **주의**: 이 변경사항들은 기존 코드를 깨뜨릴 수 있습니다!

#### ⚠️ `GET /applications/competitors`

**변경사항**:
- 🔄 타입 변경: `response.firstChoice[].gpa`가 `number`에서 `string`으로 변경됨
- 🗑️ 제거됨: `response.firstChoice[].applicants[].schoolId`

**마이그레이션 가이드**:
```typescript
// 이전
const gpa: number = data.firstChoice[0].gpa;
const schoolId = data.firstChoice[0].applicants[0].schoolId;

// 변경 후
const gpa: string = data.firstChoice[0].gpa; // ⚠️ 타입 변경!
// schoolId는 더 이상 사용 불가
```
```

#### 4. HTML 대시보드 생성

```bash
npx bruno-sync generate --diff --changelog docs/changelog.html --changelog-format html
```

다음과 같은 기능을 가진 HTML이 생성됩니다:
- 📊 시각적 요약 카드
- 🎨 색상 코딩 (Breaking = 빨강)
- 🔍 검색/필터링 가능
- 📱 모바일 반응형

#### 5. Breaking Changes만 확인

```bash
npx bruno-sync generate --diff --breaking-only --changelog BREAKING.md
```

## 🏗️ 프로젝트 구조

Bruno 컬렉션을 도메인별로 구조화하세요:

```
bruno/
├── applications/        # 지원서 관련 API
│   ├── get-competitors.bru
│   ├── create-application.bru
│   └── submit-application.bru
├── users/              # 사용자 관련 API
│   ├── get-profile.bru
│   ├── update-profile.bru
│   └── auth/
│       ├── login.bru
│       └── logout.bru
└── bruno.json
```

각 .bru 파일은 `docs` 블록에 JSON 응답 예시를 포함해야 합니다:

```bru
meta {
  name: 경쟁 현황 조회
  type: http
}

get /applications/competitors

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "firstChoice": [
      {
        "koreanName": "데겐도르프대학",
        "gpa": 4.5,
        "applicants": [
          {
            "id": 1,
            "name": "홍길동",
            "gpa": 4.3
          }
        ]
      }
    ]
  }
  ```
}
```

## 🔄 변경사항 감지

### 변경 타입

| 타입 | 설명 | 심각도 | 아이콘 |
|------|------|--------|--------|
| **추가됨** | 새로운 엔드포인트나 필드 | Minor | ✨ |
| **제거됨** | 삭제된 엔드포인트나 필드 | **Breaking** | 🗑️ |
| **수정됨** | 스키마 변경 | Minor/Breaking | 🔄 |

### Breaking Changes 기준

다음 변경사항은 **Breaking**으로 판단됩니다:

- ⚠️ 엔드포인트 제거
- ⚠️ HTTP 메서드 제거
- ⚠️ 응답에서 필드 제거
- ⚠️ 필드 타입 변경 (예: `number` → `string`)
- ⚠️ 요청에 필수 필드 추가

### 안전한 변경사항

다음은 **Minor** 변경사항입니다:

- ✅ 새 엔드포인트 추가
- ✅ 응답에 새 필드 추가
- ✅ 요청에 선택적 필드 추가
- ✅ 문서 업데이트

## 🌐 프론트엔드를 위한 기능

### 📖 Swagger UI 자동 배포

Bruno 파일이 수정되면 자동으로 **Swagger UI**가 GitHub Pages에 배포됩니다!

#### 접속 방법

```
https://your-team.github.io/your-repo/
```

3가지 페이지가 자동 생성됩니다:

1. **📖 API 명세서 (Swagger UI)**
   - 모든 API 엔드포인트 목록
   - 요청/응답 스키마
   - 실제 API 테스트 가능
   - 도메인별 그룹화

2. **🔄 변경사항 시각화 (Changelog HTML)**
   - 시각적 대시보드
   - Breaking changes 강조
   - Before/After 비교
   - 도메인별 변경사항

3. **📥 OpenAPI 다운로드**
   - OpenAPI 3.0 스펙 파일
   - 다른 도구에서 사용 가능

#### 설정 방법

`.github/workflows/api-docs-deploy.yml` 파일이 자동으로:
- main 브랜치에 머지되면 실행
- OpenAPI 생성
- Swagger UI 페이지 생성
- GitHub Pages에 배포

**GitHub Pages 활성화**:
1. Repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: `gh-pages` / `root`
4. Save

### 🤖 PR 자동 리뷰

PR을 생성하면 자동으로 변경사항이 코멘트로 달립니다!

#### PR 코멘트 예시

```markdown
## 🔄 API 변경사항

### ⚠️ **Breaking Changes 발견!**
> 기존 코드를 깨뜨릴 수 있는 변경사항이 있습니다.

### 📝 변경된 Bruno 파일
bruno/applications/get-competitors.bru

### 📊 상세 변경사항
⚠️  BREAKING CHANGES:
   GET    /applications/competitors
      ~ response.gpa (number → string)

### 🔗 유용한 링크
- 📖 [API 명세서 보기](링크)
- 🔄 [변경사항 시각화](링크)
- 📥 [OpenAPI 다운로드](링크)
```

#### 자동으로 수행되는 작업

1. ✅ 변경된 Bruno 파일 감지
2. ✅ OpenAPI 생성 및 비교
3. ✅ Breaking changes 식별
4. ✅ PR에 자동 코멘트
5. ✅ Swagger UI 링크 제공
6. ✅ Changelog HTML 링크 제공

**프론트엔드 개발자는 PR만 보면 모든 변경사항을 5분 안에 파악!**

자세한 사용법은 **[프론트엔드 가이드](./docs/FRONTEND-GUIDE.md)** 참조

## 🔗 CI/CD 연동

### GitHub Actions 예시

```yaml
# .github/workflows/api-sync.yml
name: API 변경사항 추적

on:
  push:
    paths:
      - 'bruno/**'

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 2  # 이전 커밋 비교용

      - name: Node 설정
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: 의존성 설치
        run: npm install

      - name: OpenAPI 생성 및 변경사항 감지
        run: npm run api:changelog

      - name: Breaking changes 확인
        id: breaking
        run: |
          if grep -q "Breaking Changes" CHANGELOG.md; then
            echo "has_breaking=true" >> $GITHUB_OUTPUT
          fi

      - name: PR에 변경사항 코멘트
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🔄 API 변경사항\n\n${changelog}`
            });

      - name: Breaking이 있으면 PR 차단
        if: steps.breaking.outputs.has_breaking == 'true'
        run: |
          echo "⚠️ Breaking changes 발견!"
          echo "Changelog를 확인하고 major 버전을 올려주세요."
          exit 1

      - name: 변경사항 커밋
        run: |
          git config user.email "action@github.com"
          git config user.name "GitHub Action"
          git add openapi.json CHANGELOG.md
          git commit -m "chore: API 스펙 및 changelog 업데이트" || exit 0
          git push
```

## 💡 실전 사용 시나리오

### 1. 백엔드 개발자 워크플로우

```bash
# 1. Bruno 파일 수정
vim bruno/applications/get-competitors.bru

# 2. 변경사항 확인
npm run api:diff

# 3. Changelog 생성
npm run api:changelog

# 4. 커밋
git add bruno/ CHANGELOG.md openapi.json
git commit -m "feat: 경쟁자 조회에 email 필드 추가"
git push
```

### 2. 프론트엔드 개발자 워크플로우

```bash
# 1. 최신 코드 받기
git pull

# 2. Changelog 확인
cat CHANGELOG.md

# 3. Breaking changes 대응
# TypeScript 컴파일러가 자동으로 에러 표시!

# 4. 테스트
npm run test
```

### 3. API 리뷰 프로세스

```bash
# HTML 리포트 생성 (이해관계자 공유용)
npm run api:changelog:html

# 브라우저에서 열기
open docs/changelog.html

# 팀과 공유하여 리뷰
```

## 📚 추가 문서

- **[Bruno 파일 작성 가이드](./docs/BRUNO-GUIDE.md)** - 백엔드 개발자용
  - Bruno 파일 기본 구조
  - 필수 작성 규칙
  - 실전 예시와 템플릿

- **[프론트엔드 가이드](./docs/FRONTEND-GUIDE.md)** - 프론트엔드 개발자용 🆕
  - API 변경사항 확인하는 3가지 방법
  - Swagger UI 사용법
  - Breaking Changes 대응
  - 5분 워크플로우

- **[팀 워크플로우 가이드](./docs/WORKFLOW.md)** - 전체 팀용
  - 백엔드-프론트엔드 협업 프로세스
  - CI/CD 자동화
  - FAQ

- [영문 README](./README.md) - English version

## 🎯 다음 단계 (Roadmap)

- [x] Bruno → OpenAPI 변환
- [x] 변경사항 감지
- [x] Changelog 생성 (MD/JSON/HTML)
- [x] Breaking change 식별
- [x] CLI 도구
- [x] Swagger UI 자동 배포
- [x] PR 자동 리뷰
- [ ] TypeScript 타입 자동 생성
- [ ] API 클라이언트 자동 생성
- [ ] MSW Mock 자동 생성
- [ ] React Query hooks 생성
- [ ] Watch 모드
- [ ] Zod 스키마 생성

## 📄 라이선스

MIT

## 🤝 기여

이슈와 PR은 언제나 환영합니다!

## 📞 문의

- 이슈: [GitHub Issues](https://github.com/your-org/bruno-api-typescript/issues)
- 문서: 이 레포지토리의 docs 폴더 참조

---

**bruno-openapi-sync v0.2.0** - 더 나은 API 협업을 위해 ❤️
