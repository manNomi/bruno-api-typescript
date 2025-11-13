# 프론트엔드 개발자를 위한 Bruno 설정 가이드

> **Bruno 폴더만 받아서 독립적으로 사용하기**

## 📋 목차

1. [개요](#개요)
2. [방법 1: Git Sparse Checkout (권장)](#방법-1-git-sparse-checkout-권장)
3. [방법 2: 별도 Bruno 저장소 사용](#방법-2-별도-bruno-저장소-사용)
4. [전역 명령어 설정](#전역-명령어-설정)
5. [사용 방법](#사용-방법)
6. [FAQ](#faq)

---

## 개요

### 🎯 목표

프론트엔드 개발자는:
- ✅ **Bruno 폴더만** 클론/풀
- ✅ **전체 백엔드 코드 없이** 독립적으로 사용
- ✅ **전역 명령어**로 간편하게 실행
- ✅ 백엔드 코드 변경 없이 **자동 동기화**

### 백엔드 vs 프론트엔드

| 역할 | 저장소 구조 | 작업 방법 |
|------|-----------|----------|
| **백엔드** | 전체 프로젝트 | bruno 폴더에서 .bru 파일 작성 |
| **프론트엔드** | bruno 폴더만 | bruno 폴더만 클론, 전역 명령어 사용 |

---

## 방법 1: Git Sparse Checkout (권장)

Git의 **sparse checkout** 기능을 사용하면 bruno 폴더만 클론할 수 있습니다.

### 1.1 초기 설정

```bash
# 1. 빈 저장소 클론
git clone --no-checkout https://github.com/your-org/your-repo.git bruno-api
cd bruno-api

# 2. Sparse checkout 활성화
git sparse-checkout init --cone

# 3. bruno 폴더만 체크아웃
git sparse-checkout set bruno

# 4. 파일 가져오기
git checkout main
```

**결과**:
```
bruno-api/
└── bruno/           # bruno 폴더만 존재!
    ├── applications/
    ├── users/
    └── bruno.json
```

### 1.2 업데이트

```bash
# bruno 폴더 최신화
cd bruno-api
git pull
```

### 1.3 전역 명령어 설정

```bash
# bruno-openapi-sync 전역 설치
npm install -g bruno-openapi-sync

# 또는 프로젝트에 설치
npm install -D bruno-openapi-sync
```

### 1.4 사용

```bash
cd bruno-api

# OpenAPI 생성
bruno-sync generate -i ./bruno -o ./openapi.json

# 변경사항 확인
bruno-sync generate --diff

# Changelog 생성
bruno-sync generate --diff --changelog CHANGELOG.md
```

---

## 방법 2: 별도 Bruno 저장소 사용

백엔드가 **별도 Bruno 저장소**를 자동 동기화하는 경우 사용합니다.

### 2.1 Bruno 저장소 클론

```bash
# Bruno 전용 저장소 클론
git clone https://github.com/your-org/your-repo-bruno.git
cd your-repo-bruno
```

**폴더 구조**:
```
your-repo-bruno/
├── applications/
├── users/
├── bruno.json
└── README.md
```

### 2.2 전역 명령어 설정

```bash
# bruno-openapi-sync 전역 설치
npm install -g bruno-openapi-sync
```

### 2.3 사용

```bash
cd your-repo-bruno

# OpenAPI 생성
bruno-sync generate -i . -o ./openapi.json

# 변경사항 확인
bruno-sync generate --diff

# Swagger UI 생성
bruno-sync generate -i . -o ./openapi.json
# openapi.json을 Swagger UI에 업로드
```

### 2.4 자동 업데이트

별도 저장소는 백엔드가 수정하면 **자동으로 동기화**됩니다.

```bash
# 최신 변경사항 받기
git pull
```

---

## 전역 명령어 설정

### Option 1: npm 전역 설치

```bash
npm install -g bruno-openapi-sync
```

**사용**:
```bash
bruno-sync generate -i ./bruno -o ./openapi.json
```

### Option 2: package.json 스크립트

프로젝트에 `package.json` 생성:

```bash
cd bruno-api  # 또는 your-repo-bruno
npm init -y
npm install -D bruno-openapi-sync
```

**package.json**:
```json
{
  "name": "api-client",
  "version": "1.0.0",
  "scripts": {
    "api:generate": "bruno-sync generate -i ./bruno -o ./openapi.json",
    "api:diff": "bruno-sync generate --diff",
    "api:changelog": "bruno-sync generate --diff --changelog CHANGELOG.md",
    "api:watch": "bruno-sync generate -i ./bruno -o ./openapi.json --watch"
  },
  "devDependencies": {
    "bruno-openapi-sync": "^0.2.0"
  }
}
```

**사용**:
```bash
npm run api:generate
npm run api:diff
npm run api:changelog
```

### Option 3: npx (설치 없이 사용)

```bash
npx bruno-openapi-sync generate -i ./bruno -o ./openapi.json
```

---

## 사용 방법

### 일반적인 워크플로우

```bash
# 1. 최신 변경사항 받기
git pull

# 2. 변경사항 확인
npm run api:diff
# 또는
bruno-sync generate --diff

# 3. Breaking이 있는지 확인
# 콘솔 출력에서 "⚠️ BREAKING CHANGES" 찾기

# 4. Changelog 생성 (선택)
npm run api:changelog
cat CHANGELOG.md

# 5. OpenAPI 생성
npm run api:generate

# 6. Swagger UI에서 확인
# openapi.json을 https://editor.swagger.io/ 에 업로드
```

### Breaking Changes 대응

```bash
# 1. 변경사항 확인
git pull
npm run api:diff

# 출력:
# ⚠️  BREAKING CHANGES:
#    GET /applications/competitors
#       ~ response.gpa (number → string)

# 2. Changelog에서 마이그레이션 가이드 확인
cat CHANGELOG.md

# 3. 프론트엔드 코드 수정
# Before: const gpa: number = data.gpa;
# After:  const gpa: string = data.gpa;

# 4. 테스트
npm run test
```

---

## 프로젝트 설정 예시

### 프론트엔드 프로젝트 구조

```
my-frontend/
├── src/
│   ├── api/              # API 클라이언트
│   ├── components/
│   └── pages/
├── bruno-api/            # Bruno 폴더 (sparse checkout)
│   └── bruno/
│       ├── applications/
│       └── users/
├── openapi.json          # 생성된 OpenAPI 스펙
└── package.json
```

### package.json 설정

```json
{
  "name": "my-frontend",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",

    "api:update": "cd bruno-api && git pull && cd ..",
    "api:generate": "bruno-sync generate -i ./bruno-api/bruno -o ./openapi.json",
    "api:diff": "bruno-sync generate -i ./bruno-api/bruno --diff",
    "api:sync": "npm run api:update && npm run api:generate"
  },
  "devDependencies": {
    "bruno-openapi-sync": "^0.2.0",
    "vite": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 사용

```bash
# API 업데이트 및 OpenAPI 생성 (한 번에)
npm run api:sync

# 개발 시작
npm run dev
```

---

## 자동화 스크립트

### setup-bruno.sh

프론트엔드 팀원을 위한 자동 설정 스크립트:

```bash
#!/bin/bash

echo "🚀 Bruno API 설정 시작..."

# 1. Bruno 폴더 클론 (sparse checkout)
if [ -d "bruno-api" ]; then
  echo "✅ bruno-api 폴더가 이미 존재합니다."
else
  echo "📥 Bruno 폴더 클론 중..."
  git clone --no-checkout https://github.com/your-org/your-repo.git bruno-api
  cd bruno-api
  git sparse-checkout init --cone
  git sparse-checkout set bruno
  git checkout main
  cd ..
fi

# 2. bruno-openapi-sync 설치
echo "📦 bruno-openapi-sync 설치 중..."
npm install -D bruno-openapi-sync

# 3. OpenAPI 생성
echo "🔄 OpenAPI 생성 중..."
npx bruno-sync generate -i ./bruno-api/bruno -o ./openapi.json

echo "✅ 설정 완료!"
echo ""
echo "사용 방법:"
echo "  npm run api:update  - Bruno 폴더 업데이트"
echo "  npm run api:generate - OpenAPI 생성"
echo "  npm run api:diff - 변경사항 확인"
```

**사용**:
```bash
chmod +x setup-bruno.sh
./setup-bruno.sh
```

---

## FAQ

### Q1: Bruno 폴더만 받으면 백엔드 코드는?

**A**: Bruno 폴더만 받으면 백엔드 코드는 없습니다.
- ✅ **장점**: 가볍고 빠름, API 스펙만 필요한 프론트엔드에게 이상적
- ❌ **단점**: 백엔드 코드를 보려면 전체 저장소 클론 필요

### Q2: sparse checkout과 일반 clone의 차이는?

**A**:

| 방법 | 크기 | 속도 | 내용 |
|------|------|------|------|
| **일반 clone** | ~100MB | 느림 | 전체 프로젝트 |
| **sparse checkout** | ~1MB | 빠름 | bruno 폴더만 |

### Q3: 백엔드가 Bruno를 수정하면 어떻게 되나?

**A**:
1. 백엔드가 bruno 폴더 수정 & 푸시
2. 프론트엔드가 `git pull` 또는 `npm run api:update`
3. 자동으로 최신 Bruno 파일 받아짐
4. `npm run api:diff`로 변경사항 확인

### Q4: 전역 설치 vs 로컬 설치?

**A**:

| 방법 | 장점 | 단점 |
|------|------|------|
| **전역 설치** (`npm i -g`) | 어디서든 사용 가능 | 버전 관리 어려움 |
| **로컬 설치** (`npm i -D`) | 버전 고정 가능 | 프로젝트마다 설치 필요 |

**권장**: 로컬 설치 + package.json 스크립트

### Q5: OpenAPI 파일은 어디에 두나요?

**A**: 프론트엔드 프로젝트 루트에:

```
my-frontend/
├── openapi.json          # ✅ 여기
├── bruno-api/            # Bruno 폴더
└── src/
```

이렇게 하면 TypeScript 타입 생성 도구가 쉽게 참조 가능:
```bash
npx openapi-typescript openapi.json -o src/types/api.ts
```

### Q6: bruno-openapi-sync를 꼭 설치해야 하나요?

**A**:
- ✅ **설치하면**: 로컬에서 OpenAPI 생성, 변경사항 확인 가능
- ❌ **설치 안 하면**: GitHub Pages의 Swagger UI만 사용 (읽기 전용)

**권장**: 개발 편의를 위해 설치 추천

### Q7: CI/CD에서 자동화하려면?

**A**:

```yaml
# .github/workflows/api-sync.yml
name: Sync API

on:
  schedule:
    - cron: '0 */6 * * *'  # 6시간마다
  workflow_dispatch:  # 수동 실행

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          sparse-checkout: bruno

      - name: Setup Node
        uses: actions/setup-node@v3

      - name: Generate OpenAPI
        run: |
          npm install -D bruno-openapi-sync
          npx bruno-sync generate -i ./bruno -o ./openapi.json

      - name: Commit
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add openapi.json
          git commit -m "chore: update OpenAPI spec" || exit 0
          git push
```

---

## 빠른 시작 명령어 정리

### 첫 설정 (한 번만)

```bash
# 방법 1: Sparse checkout
git clone --no-checkout https://github.com/your-org/your-repo.git bruno-api
cd bruno-api
git sparse-checkout init --cone
git sparse-checkout set bruno
git checkout main
npm install -D bruno-openapi-sync

# 방법 2: 별도 Bruno 저장소
git clone https://github.com/your-org/your-repo-bruno.git
cd your-repo-bruno
npm install -D bruno-openapi-sync
```

### 일상적인 사용

```bash
# 1. 업데이트
git pull

# 2. 변경사항 확인
npm run api:diff

# 3. OpenAPI 생성
npm run api:generate

# 4. 개발 계속
npm run dev
```

---

## 참고 문서

- **[프론트엔드 개발자 가이드](./FRONTEND-GUIDE.md)**: API 변경사항 대응
- **[백엔드 개발자 가이드](./BACKEND-GUIDE.md)**: 백엔드 관점
- **[팀 워크플로우](./WORKFLOW.md)**: 전체 협업 프로세스

---

## 마무리

이 가이드를 따르면:

✅ **Bruno 폴더만 가볍게 클론**
✅ **전역 명령어로 간편하게 사용**
✅ **백엔드와 독립적으로 작업**
✅ **자동 동기화로 항상 최신 유지**

**프론트엔드도 API 스펙 관리가 쉬워집니다!** 🚀
