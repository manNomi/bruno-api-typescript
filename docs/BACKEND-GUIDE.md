# 백엔드 개발자 가이드

> **API 개발부터 Bruno 파일 작성, 자동 문서화까지**

## 📋 목차

1. [개요](#개요)
2. [워크플로우](#워크플로우)
3. [Step 1: API 개발](#step-1-api-개발)
4. [Step 2: Bruno 파일 작성](#step-2-bruno-파일-작성)
5. [Step 3: 로컬 테스트](#step-3-로컬-테스트)
6. [Step 4: Git 커밋 및 PR 생성](#step-4-git-커밋-및-pr-생성)
7. [Step 5: 변경사항 확인 및 대응](#step-5-변경사항-확인-및-대응)
8. [Breaking Changes 가이드](#breaking-changes-가이드)
9. [체크리스트](#체크리스트)
10. [FAQ](#faq)

---

## 개요

### 🎯 이 가이드의 목표

백엔드 개발자가:
1. ✅ API를 개발하고
2. ✅ Bruno 파일로 문서화하면
3. ✅ **자동으로** OpenAPI, TypeScript 타입, Changelog가 생성됩니다!

### 왜 Bruno를 사용하나요?

| 기존 방식 (Swagger/Postman) | Bruno 방식 |
|-------------------------|-----------|
| ❌ 코드와 문서가 따로 관리 | ✅ Git으로 버전 관리 |
| ❌ 동기화 수동 작업 | ✅ 자동 동기화 |
| ❌ 변경사항 추적 어려움 | ✅ Git diff로 한눈에 |
| ❌ 협업 시 충돌 잦음 | ✅ PR 리뷰 가능 |
| ❌ 프론트엔드 수동 타입 작성 | ✅ 타입 자동 생성 |

---

## 워크플로우

```
1. API 개발 (Express/NestJS 등)
   ↓
2. Bruno 파일 작성 (.bru)
   ↓
3. 로컬 테스트
   - npm run api:generate
   - npm run api:diff
   ↓
4. Git Push & PR 생성
   ↓
5. CI/CD 자동 실행 ⚡
   - OpenAPI 생성
   - 변경사항 감지
   - Changelog 생성
   - PR에 자동 코멘트
   ↓
6. 리뷰 & 머지
   ↓
7. 프론트엔드가 자동으로 타입 사용 가능! 🎉
```

**소요 시간**: 5~10분 (익숙해지면 3분!)

---

## Step 1: API 개발

평소처럼 API를 개발합니다.

### 예시: Express

```typescript
// routes/applications.ts
import express from 'express';
import { getCompetitors } from '../services/applications';

const router = express.Router();

router.get('/applications/competitors', async (req, res) => {
  try {
    const data = await getCompetitors();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### 예시: NestJS

```typescript
// applications.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApplicationsService } from './applications.service';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get('competitors')
  async getCompetitors() {
    return this.applicationsService.getCompetitors();
  }
}
```

**✅ API 개발 완료!** 이제 문서화만 하면 됩니다.

---

## Step 2: Bruno 파일 작성

### 2.1 파일 위치 결정

도메인별로 폴더를 구성합니다:

```
bruno/
├── applications/           # 지원서 도메인
│   ├── get-competitors.bru
│   ├── get-list.bru
│   ├── create.bru
│   └── update.bru
├── users/                  # 사용자 도메인
│   ├── profile/
│   │   ├── get.bru
│   │   └── update.bru
│   └── auth/
│       ├── login.bru
│       └── logout.bru
└── bruno.json
```

### 2.2 파일 생성

`bruno/applications/get-competitors.bru` 파일을 생성합니다.

### 2.3 기본 구조 작성

```bru
meta {
  name: Get Competitors
  type: http
  seq: 1
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
        "universityId": 1,
        "koreanName": "데겐도르프대학",
        "englishName": "Deggendorf Institute of Technology",
        "studentCapacity": 150,
        "applicantCount": 120,
        "competitionRate": 0.8,
        "averageGpa": 4.2
      }
    ],
    "secondChoice": [],
    "thirdChoice": []
  }
  ```
}
```

### ⭐ 가장 중요: `docs` 블록

**`docs` 블록의 JSON이 모든 자동화의 핵심입니다!**

#### ✅ 올바른 예시

```bru
docs {
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "createdAt": "2025-01-01T00:00:00Z",
    "profile": {
      "age": 25,
      "city": "Seoul"
    },
    "tags": ["developer", "backend"]
  }
  ```
}
```

#### ❌ 잘못된 예시

```bru
docs {
  # 텍스트 설명만 있으면 파싱 안됨
  응답: 사용자 정보를 반환합니다.
}
```

```bru
docs {
  ```json
  {
    id: 1,  // ❌ 키에 따옴표 없음
    "name": '홍길동'  // ❌ 작은따옴표
  }
  ```
}
```

### 2.4 JSON 작성 규칙

#### 📐 반드시 지켜야 할 규칙

1. **표준 JSON 형식**
   - 키는 쌍따옴표: `"key"`
   - 값도 쌍따옴표: `"value"`
   - 주석 금지

2. **실제 응답과 100% 일치**
   ```typescript
   // API 응답
   res.json({
     id: 1,
     name: "홍길동"
   });

   // docs 블록도 동일하게
   {
     "id": 1,
     "name": "홍길동"
   }
   ```

3. **모든 필드 포함** (옵셔널도!)
   ```json
   {
     "id": 1,
     "name": "홍길동",
     "nickname": null,  // 옵셔널이어도 포함
     "age": 25
   }
   ```

4. **타입이 명확한 값 사용**
   - 문자열: `"hello"`
   - 숫자: `123`, `4.5`
   - 불린: `true`, `false`
   - 배열: `[1, 2, 3]`
   - 객체: `{"key": "value"}`
   - null: `null`

5. **배열은 최소 1개 요소 포함**
   ```json
   {
     "users": [
       {
         "id": 1,
         "name": "예시"
       }
     ]
   }
   ```
   빈 배열 `[]`은 타입 추론이 불가능합니다!

6. **날짜는 ISO 8601 형식**
   ```json
   {
     "createdAt": "2025-01-01T00:00:00Z"
   }
   ```

### 2.5 HTTP 메서드별 예시

#### GET - 목록 조회

```bru
meta {
  name: Get Applications List
  type: http
  seq: 1
}

get /applications

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "items": [
      {
        "id": 1,
        "universityName": "데겐도르프대학",
        "status": "pending",
        "submittedAt": "2025-11-12T05:30:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "pageSize": 20
  }
  ```
}
```

#### POST - 생성

```bru
meta {
  name: Create Application
  type: http
  seq: 2
}

post /applications

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "universityId": 1,
    "choice": "first",
    "documents": [
      "transcript.pdf",
      "recommendation.pdf"
    ],
    "personalStatement": "지원 동기입니다..."
  }
}

docs {
  ```json
  {
    "id": 123,
    "status": "pending",
    "submittedAt": "2025-11-12T05:30:00Z",
    "message": "지원서가 성공적으로 제출되었습니다."
  }
  ```
}
```

#### PUT - 수정

```bru
meta {
  name: Update Application
  type: http
  seq: 3
}

put /applications/:id

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "status": "submitted",
    "personalStatement": "수정된 지원 동기..."
  }
}

docs {
  ```json
  {
    "id": 123,
    "status": "submitted",
    "updatedAt": "2025-11-12T06:00:00Z",
    "message": "지원서가 수정되었습니다."
  }
  ```
}
```

#### DELETE

```bru
meta {
  name: Delete Application
  type: http
  seq: 4
}

delete /applications/:id

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "success": true,
    "message": "지원서가 삭제되었습니다.",
    "deletedId": 123
  }
  ```
}
```

---

## Step 3: 로컬 테스트

### 3.1 OpenAPI 생성 테스트

```bash
npm run api:generate
```

**예상 출력**:
```
✅ OpenAPI 생성 완료: openapi.json
📊 4개 엔드포인트 발견
```

### 3.2 변경사항 확인

```bash
npm run api:diff
```

**예상 출력**:
```
🔍 API 변경사항 감지

📊 요약:
   ✨ 추가됨:   1
   🗑️  제거됨:   0
   🔄 수정됨:   0
   ⚠️  Breaking: 0

✨ 추가됨:
   GET /applications/competitors
```

### 3.3 Changelog 생성

```bash
npm run api:changelog
```

`CHANGELOG.md` 파일이 생성됩니다.

### 3.4 Swagger UI 확인 (선택)

```bash
# docs/api-viewer.html을 브라우저에서 열기
open docs/api-viewer.html
# 또는
xdg-open docs/api-viewer.html  # Linux
```

---

## Step 4: Git 커밋 및 PR 생성

### 4.1 변경사항 확인

```bash
git status
```

```
Changes not staged for commit:
  modified:   bruno/applications/get-competitors.bru
```

### 4.2 커밋

```bash
git add bruno/applications/get-competitors.bru
git commit -m "feat: 경쟁 현황 조회 API 추가"
```

**커밋 메시지 컨벤션**:
- `feat:` - 새 기능 추가
- `fix:` - 버그 수정
- `docs:` - 문서만 변경
- `refactor:` - 리팩토링
- `breaking:` - Breaking change

### 4.3 푸시

```bash
git push origin feature/competitors-api
```

### 4.4 PR 생성

GitHub에서 PR을 생성하면 **자동으로**:

1. ✅ CI/CD가 실행됩니다
2. ✅ OpenAPI 스펙이 생성됩니다
3. ✅ 변경사항이 감지됩니다
4. ✅ Changelog가 생성됩니다
5. ✅ **PR에 변경사항이 자동 코멘트됩니다**

**PR 코멘트 예시**:
```markdown
## 🔄 API 변경사항

### 📊 요약
| 타입 | 개수 |
|------|------|
| ✨ 추가됨 | 1 |
| 🗑️ 제거됨 | 0 |
| 🔄 수정됨 | 0 |
| ⚠️ Breaking | 0 |

### ✨ 추가됨
- `GET /applications/competitors`

### 🔗 유용한 링크
- 📖 [API 명세서 보기](https://your-team.github.io/api/api-viewer.html)
- 🔄 [변경사항 시각화](https://your-team.github.io/api/changelog.html)
```

---

## Step 5: 변경사항 확인 및 대응

### 5.1 PR 리뷰

프론트엔드 개발자가:
- ✅ 새 API 확인
- ✅ Breaking이 있는지 확인
- ✅ 문제 없으면 승인

### 5.2 Breaking이 있다면?

**예시: 필드 타입 변경**

```bash
npm run api:diff
```

```
⚠️  BREAKING CHANGES:
   GET /applications/competitors
      ~ response.gpa (number → string)
```

**대응**:
1. 팀에 알림 (Slack/Discord)
2. CHANGELOG.md에 마이그레이션 가이드 작성
3. 프론트엔드와 협의
4. 충분한 전환 기간 제공

### 5.3 머지

문제 없으면 머지!

```bash
git checkout main
git pull
```

---

## Breaking Changes 가이드

### Breaking Changes란?

**기존 코드를 깨뜨릴 수 있는 변경사항**

#### ⚠️ Breaking으로 분류되는 것

1. **엔드포인트 제거**
   ```diff
   - DELETE /applications/:id
   ```

2. **HTTP 메서드 변경**
   ```diff
   - GET /applications/submit
   + POST /applications/submit
   ```

3. **필드 제거**
   ```diff
   {
     "id": 1,
   - "schoolId": 123
   }
   ```

4. **필드 타입 변경**
   ```diff
   {
   -  "gpa": 4.5
   +  "gpa": "4.5"
   }
   ```

5. **필수 필드 추가 (요청)**
   ```diff
   {
     "name": "홍길동",
   + "email": "required@example.com"  // 필수!
   }
   ```

#### ✅ Breaking이 아닌 것

1. **새 엔드포인트 추가**
   ```diff
   + POST /applications/submit
   ```

2. **새 필드 추가 (응답)**
   ```diff
   {
     "id": 1,
     "name": "홍길동",
   + "nickname": "길동이"  // 새 필드
   }
   ```

3. **옵셔널 필드 추가 (요청)**
   ```diff
   {
     "name": "홍길동",
   + "nickname": "길동이"  // 선택사항
   }
   ```

### Breaking 최소화 전략

#### 1. 필드 제거 대신 deprecated 처리

```json
{
  "oldField": null,  // deprecated, 다음 버전에서 제거 예정
  "newField": "value"
}
```

#### 2. 타입 변경 대신 새 필드 추가

```json
{
  "gpa": 4.5,        // 기존 (숫자) - deprecated
  "gpaString": "4.5" // 신규 (문자열) - 권장
}
```

#### 3. 버전 관리

```typescript
// v1: 기존 API
router.get('/v1/applications', oldHandler);

// v2: 새 API
router.get('/v2/applications', newHandler);
```

#### 4. 점진적 마이그레이션

```
Phase 1 (1주차):
- 두 필드 모두 제공
- deprecated 표시

Phase 2 (2주차):
- 프론트엔드 마이그레이션
- 경고 메시지

Phase 3 (3주차):
- 구 필드 제거
- 신 필드만 사용
```

---

## 체크리스트

### ✅ API 개발 시

- [ ] API 엔드포인트 구현 완료
- [ ] 로컬에서 테스트 완료
- [ ] 에러 핸들링 추가

### ✅ Bruno 파일 작성 시

- [ ] 올바른 도메인 폴더에 위치
- [ ] 파일명이 영문 소문자 + 하이픈
- [ ] `meta` 블록 작성
- [ ] HTTP 메서드와 경로 명확히
- [ ] 인증 필요시 `headers` 블록 추가
- [ ] POST/PUT이면 `body:json` 블록 추가
- [ ] **`docs` 블록 반드시 작성**

### ✅ docs 블록 검증

- [ ] JSON이 유효한가? ([JSONLint](https://jsonlint.com/) 확인)
- [ ] 모든 필드가 포함되었나?
- [ ] 타입이 명확한가?
- [ ] 배열에 최소 1개 요소가 있나?
- [ ] 날짜는 ISO 8601 형식인가?
- [ ] 실제 백엔드 응답과 일치하나?

### ✅ 로컬 테스트

- [ ] `npm run api:generate` 실행 - 에러 없음
- [ ] `npm run api:diff` 실행 - 변경사항 확인
- [ ] Breaking이 있다면 팀에 알림
- [ ] Bruno 앱으로 실행 가능 (선택)

### ✅ Git & PR

- [ ] 명확한 커밋 메시지
- [ ] PR 생성
- [ ] CI/CD 통과 확인
- [ ] PR 코멘트 확인
- [ ] 리뷰 완료
- [ ] 머지

---

## FAQ

### Q1: Bruno 파일 작성이 귀찮아요

**A**: 한 번만 작성하면:
- ✅ 프론트엔드 타입 자동 생성
- ✅ API 문서 자동 완성
- ✅ Mock 자동 생성
- ✅ 변경사항 자동 추적
- ✅ 팀 협업 효율 10배 증가

**초기 5분 투자로 수십 시간 절약!**

### Q2: docs 블록을 꼭 써야 하나요?

**A**: 네! docs 블록이 모든 자동화의 핵심입니다.

- ❌ docs 없으면: 아무것도 생성 안됨
- ✅ docs 있으면: 모든 자동화 가능

### Q3: 실수로 잘못된 docs를 작성하면?

**A**:
1. `npm run api:diff`로 변경사항 확인
2. Breaking으로 감지되어 PR에서 발견됨
3. 리뷰 과정에서 수정 가능
4. TypeScript 컴파일러도 타입 체크

**안전 장치가 여러 개!**

### Q4: 옵셔널 필드는 어떻게 표시하나요?

**A**: 현재는 모든 필드를 포함하되, 값이 `null`일 수 있으면 `null`로 표시:

```json
{
  "requiredField": "value",
  "optionalField": null
}
```

### Q5: 배열이 비어있을 수도 있는데?

**A**: 빈 배열이어도 **예시 데이터 1개는 포함**:

```json
{
  "items": [
    {
      "id": 1,
      "name": "예시"
    }
  ]
}
```

빈 배열 `[]`은 타입 추론이 불가능합니다.

### Q6: API가 여러 상태를 반환하면?

**A**: 가장 일반적인 성공 응답을 작성:

```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "홍길동"
  }
}
```

에러 응답은 별도 문서화하거나 주석으로 설명.

### Q7: 인증이 필요 없는 API는?

**A**: `headers` 블록을 생략:

```bru
meta {
  name: Get Public Data
  type: http
}

get /public/data

docs {
  ```json
  {
    "message": "Hello, World!"
  }
  ```
}
```

### Q8: Query Parameter는?

**A**: 경로에 포함:

```bru
get /applications?status=pending&page=1

docs {
  ```json
  {
    "items": [...],
    "page": 1,
    "total": 100
  }
  ```
}
```

### Q9: Bruno 앱을 꼭 설치해야 하나요?

**A**: 아니요! 선택사항입니다.

- ✅ 텍스트 에디터로만 `.bru` 파일 작성 가능
- ✅ Git으로 버전 관리
- Bruno 앱은 GUI가 편하면 사용

다운로드: https://www.usebruno.com/downloads

### Q10: CI/CD가 실패하면?

**A**:
1. 에러 메시지 확인
2. JSON 유효성 검사 ([JSONLint](https://jsonlint.com/))
3. `npm run api:generate` 로컬 실행
4. 팀에 문의

---

## 빠른 템플릿

### GET 템플릿

```bru
meta {
  name: [API 이름]
  type: http
  seq: 1
}

get /[경로]

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "id": 1,
    "field": "value"
  }
  ```
}
```

### POST 템플릿

```bru
meta {
  name: [API 이름]
  type: http
  seq: 1
}

post /[경로]

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "field": "value"
  }
}

docs {
  ```json
  {
    "id": 1,
    "status": "success"
  }
  ```
}
```

---

## 도움 요청

문제가 생기면:

1. **JSONLint로 검증**: https://jsonlint.com/
2. **로컬 테스트**: `npm run api:generate`
3. **CI 로그 확인**: GitHub Actions
4. **팀에 문의**: Slack/Discord
5. **이슈 등록**: GitHub Issues

---

## 참고 문서

- **[Bruno 파일 작성 가이드](./BRUNO-GUIDE.md)**: 더 상세한 Bruno 문법
- **[팀 워크플로우](./WORKFLOW.md)**: 전체 팀 협업 프로세스
- **[프론트엔드 가이드](./FRONTEND-GUIDE.md)**: 프론트엔드 관점
- **[빠른 시작](../QUICKSTART.md)**: 5분 안에 시작하기

---

## 마무리

이 가이드를 따르면:

✅ **API 문서화 자동**
✅ **프론트엔드와 타입 동기화**
✅ **Breaking 사전 감지**
✅ **협업 효율 극대화**
✅ **코드 리뷰 품질 향상**

**한 번 익히면 평생 편하게!** 🚀

궁금한 점은 언제든 팀에게 물어보세요!
