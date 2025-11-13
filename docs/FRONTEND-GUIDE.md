# 프론트엔드 개발자 가이드

> **백엔드 API 변경사항을 확인하고 안전하게 대응하기**

## 📋 목차

1. [개요](#개요)
2. [워크플로우](#워크플로우)
3. [Step 1: PR 알림 확인](#step-1-pr-알림-확인)
4. [Step 2: API 명세서 보기](#step-2-api-명세서-보기-swagger-ui)
5. [Step 3: 변경사항 시각화 확인](#step-3-변경사항-시각화-확인)
6. [Step 4: Bruno 파일 직접 확인](#step-4-bruno-파일-직접-확인-선택)
7. [Step 5: 빠른 대응](#step-5-빠른-대응)
8. [실전 시나리오](#실전-시나리오)
9. [체크리스트](#체크리스트)
10. [FAQ](#faq)

---

## 개요

### 🎯 이 가이드의 목표

백엔드가 API를 수정했을 때:
- ❓ "뭐가 바뀐거지?"
- ❓ "Breaking change가 있나?"
- ❓ "어떻게 대응해야 하지?"

이 가이드로 **5분 안에 모든 변경사항을 파악**하고 안전하게 대응할 수 있습니다!

> **💡 첫 설정이 필요한가요?** [프론트엔드 설정 가이드](./FRONTEND-SETUP.md)를 먼저 확인하세요.
> Bruno 폴더만 받아서 독립적으로 사용하는 방법을 안내합니다.

### 변경사항 확인 방법

| 방법 | 소요 시간 | 용도 |
|------|----------|------|
| 📱 **PR 코멘트** | 30초 | 변경사항 요약 |
| 🌐 **Swagger UI** | 2분 | 전체 API 구조 확인 |
| 📊 **Changelog HTML** | 3분 | 상세 변경사항 및 마이그레이션 가이드 |
| 📝 **Bruno 파일** | 5분 | 실제 코드 확인 |

---

## 워크플로우

```
1. 백엔드가 API 수정 & PR 생성
   ↓
2. CI/CD 자동 실행
   - OpenAPI 생성
   - 변경사항 감지
   - PR에 자동 코멘트
   ↓
3. PR 코멘트 확인 (30초)
   - Breaking 있나?
   - 무엇이 변경되었나?
   ↓
4. Swagger UI 또는 Changelog 확인 (2분)
   - 새 API 스키마
   - 마이그레이션 가이드
   ↓
5. 코드 수정 (필요시, 2~5분)
   ↓
6. 테스트 & 빌드 (1분)
   ↓
완료! 🎉
```

**총 소요 시간**: 5~10분

---

## Step 1: PR 알림 확인

백엔드가 Bruno 파일을 수정하고 PR을 만들면, 자동으로 **PR 코멘트**가 달립니다.

### PR 코멘트 예시

```markdown
## 🔄 API 변경사항

### ⚠️ **Breaking Changes 발견!**
> 기존 코드를 깨뜨릴 수 있는 변경사항이 있습니다.

### 📝 변경된 Bruno 파일
bruno/applications/get-competitors.bru

### 📊 상세 변경사항

⚠️  BREAKING CHANGES:
   GET    /applications/competitors
      ~ response.firstChoice[].gpa (number → string)
      - response.firstChoice[].applicants[].schoolId

✨ Added:
   POST   /applications/submit

### 🔗 유용한 링크
- 📖 [API 명세서 보기](https://your-team.github.io/api/api-viewer.html)
- 🔄 [변경사항 시각화](https://your-team.github.io/api/changelog.html)
- 📥 [OpenAPI 다운로드](https://your-team.github.io/api/openapi.json)
```

**여기서 즉시 파악할 것:**
- ⚠️ Breaking이 있는지?
- 📝 어떤 파일이 변경되었는지?
- 📊 무엇이 바뀌었는지?

---

## Step 2: API 명세서 보기 (Swagger UI)

### 방법 1: GitHub Pages에서 보기

PR 코멘트의 "📖 API 명세서 보기" 링크를 클릭하면:

```
https://your-team.github.io/your-repo/api-viewer.html
```

**Swagger UI**가 열립니다!

#### Swagger UI에서 할 수 있는 것

1. **모든 API 엔드포인트 목록 확인**
   - 도메인별로 그룹화
   - HTTP 메서드 한눈에 보기

2. **요청/응답 스키마 확인**
   ```json
   // 응답 예시
   {
     "firstChoice": [
       {
         "universityId": 1,
         "koreanName": "데겐도르프대학",
         "gpa": "4.5"  // ⚠️ string으로 변경됨!
       }
     ]
   }
   ```

3. **타입 정보 확인**
   - 각 필드의 타입 (string, number, array, object)
   - 필수 여부 (required)
   - 예시 값

4. **직접 테스트 (선택)**
   - "Try it out" 버튼으로 실제 API 호출 가능
   - 응답 확인

### 방법 2: 로컬에서 보기

```bash
# 프로젝트 클론
git clone <repo-url>
cd bruno-api-typescript

# OpenAPI 생성
npm install
npm run api:generate

# Swagger UI 열기
# docs/api-viewer.html 파일을 브라우저에서 열기
open docs/api-viewer.html
```

---

## 📊 Step 3: 변경사항 시각화 확인

### HTML Changelog 보기

PR 코멘트의 "🔄 변경사항 시각화" 링크 클릭:

```
https://your-team.github.io/your-repo/changelog.html
```

**시각적 대시보드**가 열립니다!

#### 대시보드 구성

1. **📊 요약 카드**
   ```
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │ ✨ Added    │  │ 🔄 Modified │  │ ⚠️ Breaking │
   │     2       │  │      1      │  │      1      │
   └─────────────┘  └─────────────┘  └─────────────┘
   ```

2. **⚠️ Breaking Changes 섹션**
   - 빨간색으로 강조
   - 어떤 필드가 바뀌었는지
   - 타입 변경 (number → string)
   - 필드 제거/추가

3. **도메인별 변경사항**
   - Applications
   - Users
   - ...

### Markdown Changelog (텍스트 버전)

Git Pull 후:

```bash
cat CHANGELOG.md
```

```markdown
# API Changelog

## ⚠️ Breaking Changes

#### ⚠️ `GET /applications/competitors`

**변경사항**:
- 🔄 Type changed: `response.firstChoice[].gpa` from `number` to `string`
- 🗑️ Removed: `response.firstChoice[].applicants[].schoolId`

**마이그레이션 가이드**:
```typescript
// Before
const gpa: number = data.firstChoice[0].gpa;
const schoolId = data.applicants[0].schoolId;

// After
const gpa: string = data.firstChoice[0].gpa; // ⚠️ 타입 변경!
// schoolId는 더 이상 사용 불가
```
```

---

## 🔍 Step 4: Bruno 파일 직접 확인 (선택)

더 자세히 보고 싶다면 Bruno 파일을 직접 확인:

### GitHub에서 확인

PR의 "Files changed" 탭에서:

```diff
# bruno/applications/get-competitors.bru

docs {
  ```json
  {
    "firstChoice": [
      {
-       "gpa": 4.5,
+       "gpa": "4.5",
        "applicants": [
          {
            "id": 1,
-           "schoolId": 123
          }
        ]
      }
    ]
  }
  ```
}
```

**한눈에 보이는 것:**
- `-` 빨간색: 제거된 것
- `+` 초록색: 추가된 것

---

## ⚡ Step 5: 빠른 대응

### Breaking이 없는 경우

```bash
git pull
npm run dev
```

끝! TypeScript가 자동으로 새 타입을 인식합니다.

### Breaking이 있는 경우

#### 1. 영향 범위 파악

```bash
# 변경된 필드를 사용하는 곳 찾기
grep -r "\.gpa" src/
```

출력:
```
src/components/CompetitorCard.tsx:15:  const gpaDisplay = data.gpa.toFixed(2);
src/pages/Applications.tsx:42:  return data.gpa > 4.0;
```

#### 2. 코드 수정

**src/components/CompetitorCard.tsx**
```typescript
// ❌ Before
const gpaDisplay = data.gpa.toFixed(2);

// ✅ After
const gpaDisplay = parseFloat(data.gpa).toFixed(2);
```

**src/pages/Applications.tsx**
```typescript
// ❌ Before
return data.gpa > 4.0;

// ✅ After
return parseFloat(data.gpa) > 4.0;
```

#### 3. 컴파일 확인

```bash
npm run build
```

에러가 없으면 OK!

#### 4. 테스트

```bash
npm run test
```

---

## 📱 실전 시나리오

### 시나리오 1: 새 API 추가 (Breaking 없음)

**PR 코멘트:**
```
✨ Added:
   POST /applications/submit
```

**대응:**
```bash
git pull
# 끝! 필요하면 새 API 사용 시작
```

### 시나리오 2: 필드 타입 변경 (Breaking!)

**PR 코멘트:**
```
⚠️  BREAKING CHANGES:
   GET /applications/competitors
      ~ response.gpa (number → string)
```

**대응:**
1. Swagger UI에서 새 스키마 확인
2. Changelog에서 마이그레이션 가이드 확인
3. 코드에서 `gpa` 사용하는 곳 찾기
4. 타입 수정 (`number` → `string`)
5. 테스트

### 시나리오 3: 필드 제거 (Breaking!)

**PR 코멘트:**
```
⚠️  BREAKING CHANGES:
   GET /applications/competitors
      - response.applicants[].schoolId
```

**대응:**
1. `schoolId` 사용하는 곳 찾기
2. 대안 찾기 (백엔드에게 문의 or 다른 필드 사용)
3. 코드 수정
4. 테스트

---

## 🔗 유용한 링크 모음

### 📖 문서

- **API 명세서 (Swagger UI)**
  ```
  https://your-team.github.io/your-repo/api-viewer.html
  ```
  → 모든 API 엔드포인트와 스키마 확인

- **변경사항 시각화**
  ```
  https://your-team.github.io/your-repo/changelog.html
  ```
  → 시각적 대시보드로 변경사항 확인

- **OpenAPI 다운로드**
  ```
  https://your-team.github.io/your-repo/openapi.json
  ```
  → OpenAPI 스펙 파일 다운로드

### 🛠️ 도구

- **Bruno 앱** (선택)
  ```
  https://www.usebruno.com/downloads
  ```
  → Bruno 파일을 GUI로 보고 싶다면

- **Swagger Editor** (선택)
  ```
  https://editor.swagger.io/
  ```
  → OpenAPI 파일을 편집하고 싶다면

---

## ❓ FAQ

### Q1: PR 코멘트가 안 달려요

**A**:
1. GitHub Actions가 활성화되어 있는지 확인
2. `.github/workflows/api-review.yml` 파일이 있는지 확인
3. Actions 탭에서 에러 확인

### Q2: Swagger UI가 안 열려요

**A**:
1. GitHub Pages가 활성화되어 있는지 확인 (Settings → Pages)
2. main 브랜치에 머지되었는지 확인 (PR에서는 안됨)
3. URL이 맞는지 확인

### Q3: Breaking이 있는데 어떻게 대응해야 할지 모르겠어요

**A**:
1. Changelog의 "마이그레이션 가이드" 섹션 확인
2. 백엔드 개발자에게 문의
3. 팀 슬랙/디스코드에 질문

### Q4: 로컬에서 Swagger UI를 보고 싶어요

**A**:
```bash
npm run api:generate
open docs/api-viewer.html
```

### Q5: 이전 버전 API 명세를 보고 싶어요

**A**:
```bash
# 이전 버전 체크아웃
git checkout main
npm run api:generate

# Swagger UI 열기
open docs/api-viewer.html

# 다시 현재 브랜치로
git checkout your-branch
```

---

## ✅ 체크리스트

새로운 PR이 올라왔을 때:

- [ ] PR 코멘트 확인
- [ ] Breaking이 있는지 확인
- [ ] Swagger UI에서 새 API 스키마 확인
- [ ] Changelog에서 변경사항 상세 확인
- [ ] Breaking이 있다면:
  - [ ] 영향 범위 파악 (grep으로 검색)
  - [ ] 마이그레이션 가이드 확인
  - [ ] 코드 수정
  - [ ] 테스트
- [ ] Git pull
- [ ] 빌드 확인 (`npm run build`)
- [ ] 개발 시작!

---

## 🎉 정리

### 변경사항 확인하는 3가지 방법

1. **📱 PR 코멘트** (가장 빠름)
   - Breaking 있는지 즉시 파악
   - 요약 정보

2. **🌐 Swagger UI** (시각적)
   - 전체 API 구조 확인
   - 새 스키마 확인
   - 실제 테스트 가능

3. **📊 Changelog HTML** (상세)
   - 변경사항 시각화
   - Before/After 비교
   - 마이그레이션 가이드

### 5분 워크플로우

```
1. PR 코멘트 확인 (30초)
   ↓
2. Breaking 있나?
   ├─ 없음 → git pull → 끝! (30초)
   └─ 있음 → 다음 단계
        ↓
3. Swagger UI 확인 (2분)
   ↓
4. 코드 수정 (2분)
   ↓
5. 테스트 (30초)
   ↓
완료! ✨
```

**이제 API 변경이 무섭지 않습니다!** 🚀

---

## 참고 문서

- **[프론트엔드 설정 가이드](./FRONTEND-SETUP.md)**: Bruno 폴더만 받아서 독립적으로 사용하기 🆕
- **[백엔드 개발자 가이드](./BACKEND-GUIDE.md)**: 백엔드 관점에서의 워크플로우
- **[Bruno 파일 작성 가이드](./BRUNO-GUIDE.md)**: Bruno 파일 상세 문법
- **[팀 워크플로우](./WORKFLOW.md)**: 전체 팀 협업 프로세스
- **[빠른 시작](../QUICKSTART.md)**: 5분 안에 시작하기

---

## 마무리

이 가이드를 따르면:

✅ **API 변경사항 빠르게 파악**
✅ **Breaking 사전 감지**
✅ **안전한 마이그레이션**
✅ **타입 안전성 보장**
✅ **협업 효율 극대화**

**백엔드와의 협업이 이렇게 쉬워질 수 있습니다!** 🚀

궁금한 점은 언제든 팀에게 물어보세요!
