# Bruno 파일 작성 가이드 (백엔드 개발자용)

> **목표**: 프론트엔드에서 자동으로 타입과 API 클라이언트를 생성할 수 있도록 Bruno 파일을 올바르게 작성하기

## 📋 목차

1. [Bruno 파일이란?](#bruno-파일이란)
2. [기본 구조](#기본-구조)
3. [필수 작성 규칙](#필수-작성-규칙)
4. [도메인별 폴더 구조](#도메인별-폴더-구조)
5. [실전 예시](#실전-예시)
6. [자주 하는 실수](#자주-하는-실수)
7. [체크리스트](#체크리스트)

---

## Bruno 파일이란?

`.bru` 파일은 API를 문서화하고 테스트할 수 있는 **코드 기반 API 클라이언트 파일**입니다.

### 왜 Bruno를 사용하나요?

✅ **Git 친화적**: Postman처럼 JSON 덩어리가 아니라 깔끔한 텍스트 파일
✅ **협업 용이**: PR로 API 변경사항 리뷰 가능
✅ **자동화**: 이 파일로 OpenAPI, TypeScript 타입, Mock 자동 생성
✅ **실행 가능**: Bruno 앱으로 바로 API 테스트 가능

---

## 기본 구조

Bruno 파일은 여러 블록으로 구성됩니다:

```bru
meta {
  name: API 이름
  type: http
  seq: 1
}

get /api/endpoint

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "key": "value"
  }
}

docs {
  ```json
  {
    "response": "example"
  }
  ```
}

script:post-response {
  // 테스트 스크립트 (선택사항)
}

tests {
  // 검증 로직 (선택사항)
}
```

### 블록 설명

| 블록 | 필수 | 설명 |
|------|------|------|
| `meta` | ✅ | 파일 메타데이터 |
| HTTP 메서드 | ✅ | `get`, `post`, `put`, `delete` 등 |
| `headers` | ⚠️ | 헤더 (인증 필요시 필수) |
| `body:json` | ⚠️ | 요청 본문 (POST/PUT 등에서 필수) |
| **`docs`** | **✅** | **응답 예시 (자동 생성의 핵심!)** |
| `script:*` | ❌ | 스크립트 (선택) |
| `tests` | ❌ | 테스트 (선택) |

---

## 필수 작성 규칙

### ⭐ 가장 중요: `docs` 블록

**`docs` 블록이 전부입니다!** 이 블록의 JSON으로 타입과 스키마가 자동 생성됩니다.

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
  # 이건 JSON이 아니라서 파싱 안됨!
  응답 예시: { id: 1, username: "johndoe" }
}
```

```bru
docs {
  ```json
  // 주석 들어가면 JSON 파싱 실패!
  {
    "id": 1  // 사용자 ID
  }
  ```
}
```

### 📐 JSON 작성 규칙

1. **실제 응답과 동일하게** 작성
2. **모든 필드를 포함** (옵셔널 필드도!)
3. **타입이 명확한 값 사용**:
   - 문자열: `"hello"`
   - 숫자: `123` 또는 `4.5`
   - 불린: `true` / `false`
   - 배열: `[1, 2, 3]`
   - 객체: `{ "key": "value" }`
   - null: `null`

4. **날짜는 ISO 8601 형식**: `"2025-01-01T00:00:00Z"`
5. **배열은 최소 1개 요소** 포함 (타입 추론용)

#### 예시: 배열 처리

```json
{
  "users": [
    {
      "id": 1,
      "name": "홍길동"
    }
  ]
}
```

빈 배열 `[]`을 쓰면 타입 추론이 `Array<object>`로만 되므로, **반드시 예시 데이터 1개 이상 포함!**

---

## 도메인별 폴더 구조

### 권장 구조

```
bruno/
├── applications/        # 지원서 도메인
│   ├── get-list.bru
│   ├── get-detail.bru
│   ├── create.bru
│   └── update.bru
├── users/              # 사용자 도메인
│   ├── profile/
│   │   ├── get.bru
│   │   └── update.bru
│   └── auth/
│       ├── login.bru
│       └── logout.bru
├── universities/       # 대학 도메인
│   ├── get-list.bru
│   └── get-detail.bru
└── bruno.json
```

### 네이밍 컨벤션

| 작업 | 파일명 예시 |
|------|-------------|
| 목록 조회 | `get-list.bru` |
| 단건 조회 | `get-detail.bru` 또는 `get-{id}.bru` |
| 생성 | `create.bru` |
| 수정 | `update.bru` |
| 삭제 | `delete.bru` |
| 특수 작업 | `submit.bru`, `approve.bru` 등 |

**한글 사용 금지!** 파일명은 영문 소문자와 하이픈(`-`)만 사용하세요.

---

## 실전 예시

### 예시 1: GET - 목록 조회

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

**포인트**:
- ✅ 빈 배열도 명시 (`secondChoice`, `thirdChoice`)
- ✅ 모든 필드 타입이 명확 (숫자는 숫자로, 문자열은 문자열로)
- ✅ 실제 응답 구조와 동일

### 예시 2: POST - 생성

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
    "universityId": 1,
    "choice": "first",
    "message": "지원서가 성공적으로 제출되었습니다."
  }
  ```
}
```

**포인트**:
- ✅ `body:json` 블록에 요청 데이터
- ✅ `docs` 블록에 응답 데이터
- ✅ 날짜는 ISO 8601 형식

### 예시 3: GET - 상세 조회 (Path Parameter)

```bru
meta {
  name: Get Application Detail
  type: http
  seq: 3
}

get /applications/:id

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "id": 123,
    "userId": 456,
    "universityId": 1,
    "status": "approved",
    "submittedAt": "2025-11-12T05:30:00Z",
    "reviewedAt": "2025-11-13T10:00:00Z",
    "reviewer": {
      "id": 789,
      "name": "심사자",
      "department": "입학처"
    },
    "documents": [
      {
        "id": 1,
        "name": "성적증명서",
        "url": "https://example.com/docs/1.pdf",
        "uploadedAt": "2025-11-12T05:00:00Z"
      }
    ]
  }
  ```
}
```

**포인트**:
- ✅ Path parameter는 `:id` 형식으로 표기
- ✅ 중첩된 객체 (`reviewer`)도 명확히
- ✅ 배열 안의 객체도 모든 필드 포함

### 예시 4: PUT - 수정

```bru
meta {
  name: Update Profile
  type: http
  seq: 4
}

put /users/profile

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

body:json {
  {
    "firstName": "길동",
    "lastName": "홍",
    "phoneNumber": "010-1234-5678",
    "address": {
      "zipCode": "12345",
      "city": "서울",
      "detail": "강남구 테헤란로 123"
    }
  }
}

docs {
  ```json
  {
    "id": 1,
    "username": "gildong",
    "email": "gildong@example.com",
    "firstName": "길동",
    "lastName": "홍",
    "phoneNumber": "010-1234-5678",
    "address": {
      "zipCode": "12345",
      "city": "서울",
      "detail": "강남구 테헤란로 123"
    },
    "updatedAt": "2025-11-12T06:00:00Z"
  }
  ```
}
```

### 예시 5: DELETE

```bru
meta {
  name: Delete Application
  type: http
  seq: 5
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

## 자주 하는 실수

### ❌ 실수 1: docs 블록 없음

```bru
get /users/profile

# docs 블록이 없으면 타입 생성 안됨!
```

**해결**: docs 블록은 필수!

### ❌ 실수 2: 잘못된 JSON 형식

```bru
docs {
  ```json
  {
    id: 1,  // ❌ 키에 따옴표 없음
    "name": '홍길동'  // ❌ 작은따옴표 사용
  }
  ```
}
```

**해결**: 표준 JSON만 사용!

```json
{
  "id": 1,
  "name": "홍길동"
}
```

### ❌ 실수 3: 빈 배열

```bru
docs {
  ```json
  {
    "users": []  // ❌ 타입 추론 불가
  }
  ```
}
```

**해결**: 최소 1개 요소 포함

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

### ❌ 실수 4: 주석 포함

```bru
docs {
  ```json
  {
    // 사용자 ID
    "id": 1  // ❌ JSON 표준에 주석 없음
  }
  ```
}
```

**해결**: 주석 제거하고 순수 JSON만

### ❌ 실수 5: 타입 모호성

```bru
docs {
  ```json
  {
    "createdAt": "어제"  // ❌ 날짜 형식 불명확
  }
  ```
}
```

**해결**: ISO 8601 형식 사용

```json
{
  "createdAt": "2025-11-12T05:30:00Z"
}
```

---

## 체크리스트

새 API 엔드포인트를 만들 때 다음을 확인하세요:

### 📋 파일 생성

- [ ] 올바른 도메인 폴더에 위치
- [ ] 파일명이 영문 소문자 + 하이픈
- [ ] 확장자가 `.bru`

### 📝 내용 작성

- [ ] `meta` 블록 작성 (name 필수)
- [ ] HTTP 메서드와 경로 명확히 표기
- [ ] 인증이 필요하면 `headers` 블록에 Authorization
- [ ] POST/PUT이면 `body:json` 블록 작성
- [ ] **`docs` 블록 반드시 작성**

### ✅ docs 블록 검증

- [ ] JSON이 유효한가? (온라인 validator로 확인)
- [ ] 모든 필드가 포함되었나?
- [ ] 타입이 명확한가? (문자열은 `"..."`, 숫자는 숫자)
- [ ] 배열에 최소 1개 요소가 있나?
- [ ] 날짜는 ISO 8601 형식인가?
- [ ] 실제 백엔드 응답과 일치하나?

### 🧪 테스트

- [ ] Bruno 앱으로 실행 가능한가?
- [ ] `npm run api:generate` 실행 시 에러 없는가?
- [ ] 생성된 OpenAPI 스펙이 정확한가?

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

## 도움말

### JSON 유효성 검사

온라인 툴 사용: https://jsonlint.com/

### Bruno 앱 설치

https://www.usebruno.com/downloads

### 문제 해결

1. **파싱 에러**: docs 블록의 JSON을 복사해서 JSONLint로 검증
2. **타입이 이상함**: 값의 타입 확인 (숫자는 따옴표 없이, 문자열은 따옴표)
3. **필드가 안보임**: docs 블록에 해당 필드 추가했는지 확인

---

## 마무리

Bruno 파일을 올바르게 작성하면:

✅ 프론트엔드에서 TypeScript 타입 자동 생성
✅ API 클라이언트 함수 자동 생성
✅ Mock 데이터 자동 생성
✅ 변경사항 자동 추적
✅ 문서화 자동 완성

**핵심은 `docs` 블록을 정확하게 작성하는 것!**

궁금한 점이 있으면 팀에게 문의하세요! 🚀
