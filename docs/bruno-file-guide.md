# Bruno 파일 작성 가이드

React Query 훅과 MSW 핸들러를 자동 생성하기 위한 Bruno 파일(.bru) 작성 가이드입니다.

## 목차

1. [기본 구조](#기본-구조)
2. [Meta 블록](#meta-블록)
3. [HTTP 요청](#http-요청)
4. [Docs 블록](#docs-블록)
5. [URL 파라미터](#url-파라미터)
6. [폴더 구조](#폴더-구조)
7. [파일 네이밍 규칙](#파일-네이밍-규칙)
8. [Best Practices](#best-practices)

---

## 기본 구조

### 최소 구조

```bru
meta {
  name: API 이름
  type: http
}

get {{baseUrl}}/api/endpoint

docs {
Response:
```json
{
  "data": "example"
}
```
}
```

### 완전한 예시

```bru
meta {
  name: Get User Profile
  type: http
  seq: 1
  done: false
}

get {{baseUrl}}/api/users/:userId

headers {
  Authorization: Bearer {{token}}
  Content-Type: application/json
}

docs {
사용자 프로필을 조회합니다.

Response:
```json
{
  "id": 1,
  "name": "홍길동",
  "email": "hong@example.com",
  "profile": {
    "avatar": "https://example.com/avatar.jpg",
    "bio": "개발자입니다"
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```
}
```

---

## Meta 블록

### 필수 필드

```bru
meta {
  name: API 이름
  type: http
}
```

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `name` | string | ✅ | API 이름 (설명용) |
| `type` | string | ✅ | 항상 `http` |

### 선택 필드

```bru
meta {
  name: Get Users
  type: http
  seq: 1
  done: true
}
```

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `seq` | number | - | 정렬 순서 |
| `done` | boolean | false | true면 MSW 생성 안 함 |

### done 필드 사용법

```bru
# 백엔드 개발 완료 - MSW 생성 안 함
meta {
  name: Login
  type: http
  done: true
}

# 백엔드 개발 중 - MSW 생성됨
meta {
  name: New Feature
  type: http
  done: false  # 또는 생략
}
```

---

## HTTP 요청

### GET 요청

```bru
get {{baseUrl}}/api/users
```

### POST 요청

```bru
post {{baseUrl}}/api/users

body:json {
  {
    "name": "홍길동",
    "email": "hong@example.com"
  }
}
```

### PUT 요청

```bru
put {{baseUrl}}/api/users/:id

body:json {
  {
    "name": "김철수"
  }
}
```

### PATCH 요청

```bru
patch {{baseUrl}}/api/users/:id

body:json {
  {
    "status": "active"
  }
}
```

### DELETE 요청

```bru
delete {{baseUrl}}/api/users/:id
```

### 지원되는 HTTP 메서드

- GET → `useQuery` 훅 생성
- POST → `useMutation` 훅 생성
- PUT → `useMutation` 훅 생성
- PATCH → `useMutation` 훅 생성
- DELETE → `useMutation` 훅 생성

---

## Docs 블록

### 기본 형식

docs 블록에 JSON 코드 블록을 포함해야 합니다:

```bru
docs {
설명 텍스트 (선택사항)

```json
{
  "응답": "데이터"
}
```
}
```

### 단순 응답

```bru
docs {
```json
{
  "id": 1,
  "name": "홍길동"
}
```
}
```

**생성되는 타입:**
```typescript
interface GetUserResponse {
  id: number;
  name: string;
}
```

### 배열 응답

```bru
docs {
```json
{
  "users": [
    {
      "id": 1,
      "name": "홍길동",
      "email": "hong@example.com"
    }
  ],
  "total": 100,
  "page": 1
}
```
}
```

**생성되는 타입:**
```typescript
interface UsersItem {
  id: number;
  name: string;
  email: string;
}

interface GetUsersResponse {
  users: UsersItem[];
  total: number;
  page: number;
}
```

### 중첩 객체

```bru
docs {
```json
{
  "user": {
    "id": 1,
    "profile": {
      "avatar": "url",
      "settings": {
        "theme": "dark",
        "notifications": true
      }
    }
  }
}
```
}
```

### Nullable 값

```bru
docs {
```json
{
  "id": 1,
  "deletedAt": null
}
```
}
```

**생성되는 타입:**
```typescript
interface Response {
  id: number;
  deletedAt: null;
}
```

### 타입 추론 규칙

| JSON 값 | TypeScript 타입 |
|---------|----------------|
| `"string"` | `string` |
| `123` | `number` |
| `true/false` | `boolean` |
| `null` | `null` |
| `[]` (빈 배열) | `any[]` |
| `[1, 2, 3]` | `number[]` |
| `["a", "b"]` | `string[]` |
| `[{...}]` | `ItemName[]` (인터페이스 생성) |
| `{...}` | 인라인 객체 또는 별도 인터페이스 |

---

## URL 파라미터

### 경로 파라미터 (Path Parameter)

콜론(`:`) 또는 중괄호(`{}`) 사용:

```bru
# 콜론 방식
get {{baseUrl}}/api/users/:userId

# 중괄호 방식
get {{baseUrl}}/api/users/{userId}
```

**생성되는 훅:**
```typescript
const useGetUser = ({ userId, params }) => {
  return useQuery({
    queryKey: [QueryKeys.users.getUser, userId, params],
    queryFn: () => getUser({ userId, params })
  });
};
```

### 다중 경로 파라미터

```bru
get {{baseUrl}}/api/users/:userId/posts/:postId/comments/:commentId
```

**생성되는 훅:**
```typescript
const useGetComment = ({ userId, postId, commentId, params }) => {
  return useQuery({
    queryKey: [QueryKeys.users.getComment, userId, postId, commentId, params],
    queryFn: () => getComment({ userId, postId, commentId, params })
  });
};
```

### 쿼리 파라미터 (Query Parameter)

GET 요청은 자동으로 쿼리 파라미터를 지원합니다:

```typescript
// 사용 예시
const { data } = useGetUsers({
  params: {
    page: 1,
    limit: 10,
    search: "홍길동"
  }
});
// → GET /api/users?page=1&limit=10&search=홍길동
```

---

## 폴더 구조

### 기본 구조

```
bruno/
├── bruno.json
├── users/
│   ├── get-user.bru
│   ├── post-user.bru
│   └── delete-user.bru
├── posts/
│   ├── get-posts.bru
│   └── post-create.bru
└── auth/
    ├── post-login.bru
    └── post-logout.bru
```

### 생성되는 구조

```
src/apis/
├── queryKeys.ts
├── users/
│   ├── get-getUser.ts
│   ├── post-postUser.ts
│   ├── delete-deleteUser.ts
│   └── index.ts
├── posts/
│   ├── get-getPosts.ts
│   ├── post-postCreate.ts
│   └── index.ts
└── auth/
    ├── post-postLogin.ts
    ├── post-postLogout.ts
    └── index.ts
```

### 한글 폴더명 지원

```
bruno/
├── 사용자 [users]/        # → users 도메인으로 생성
│   └── get-user.bru
├── 게시글 [posts]/        # → posts 도메인으로 생성
│   └── get-posts.bru
└── 인증 [auth]/           # → auth 도메인으로 생성
    └── post-login.bru
```

형식: `한글이름 [영문키]`
- 대괄호 안의 영문키가 실제 도메인명으로 사용됨
- 폴더명에 한글을 사용해도 생성 파일은 영문

---

## 파일 네이밍 규칙

### 권장 형식

```
{동사}-{명사}.bru
```

예시:
- `get-user.bru` → `useGetUser` 훅
- `post-user.bru` → `usePostUser` 훅
- `get-user-profile.bru` → `useGetUserProfile` 훅
- `delete-user-account.bru` → `useDeleteUserAccount` 훅

### 자동 변환 규칙

| 파일명 | 훅 이름 | Query Key |
|--------|---------|-----------|
| `get-user.bru` | `useGetUser` | `users.getUser` |
| `post-create-user.bru` | `usePostCreateUser` | `users.postCreateUser` |
| `get-user-profile.bru` | `useGetUserProfile` | `users.getUserProfile` |

### 생성 파일명 규칙

Bruno 파일명에 HTTP 메서드 접두사가 추가됩니다:

```
get-user.bru      → get-getUser.ts
post-user.bru     → post-postUser.ts
put-user.bru      → put-putUser.ts
delete-user.bru   → delete-deleteUser.ts
```

### 충돌 방지

같은 도메인 내에서 고유한 파일명 사용:

```
# ❌ 나쁜 예 - 충돌 가능
users/get-data.bru
posts/get-data.bru

# ✅ 좋은 예 - 명확한 이름
users/get-user-list.bru
posts/get-post-list.bru
```

---

## Best Practices

### 1. 명확한 API 이름

```bru
# ❌ 나쁜 예
meta {
  name: API 1
}

# ✅ 좋은 예
meta {
  name: Get User Profile by ID
}
```

### 2. 현실적인 예시 데이터

```bru
docs {
# ❌ 나쁜 예
```json
{
  "field1": "value1",
  "field2": "value2"
}
```

# ✅ 좋은 예
```json
{
  "id": 1,
  "name": "홍길동",
  "email": "hong@example.com",
  "age": 30,
  "isActive": true
}
```
}
```

### 3. 일관된 응답 구조

```bru
# ✅ 모든 API에 동일한 래퍼 사용
docs {
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "홍길동"
  },
  "message": "조회 성공"
}
```
}
```

### 4. done 필드 활용

```bru
# 개발 초기 - MSW 사용
meta {
  name: New Feature API
  type: http
  done: false
}

# 백엔드 완료 후 - MSW 비활성화
meta {
  name: New Feature API
  type: http
  done: true
}
```

### 5. 도메인별 그룹화

```
bruno/
├── auth/          # 인증 관련
│   ├── post-login.bru
│   └── post-logout.bru
├── users/         # 사용자 관련
│   ├── get-profile.bru
│   └── put-profile.bru
├── posts/         # 게시글 관련
│   ├── get-list.bru
│   └── post-create.bru
└── comments/      # 댓글 관련
    └── get-by-post.bru
```

### 6. 파일명에 동사 포함

```bru
# ❌ 동사 없음
users/profile.bru
posts/list.bru

# ✅ 동사 포함
users/get-profile.bru
posts/get-list.bru
posts/create-post.bru
posts/delete-post.bru
```

### 7. 중첩 리소스 표현

```
# URL: /users/:userId/posts/:postId
파일: users/get-user-post.bru

# URL: /posts/:postId/comments
파일: posts/get-post-comments.bru
```

---

## 예제 모음

### 인증 API

```bru
# bruno/auth/post-login.bru
meta {
  name: User Login
  type: http
  done: true
}

post {{baseUrl}}/api/auth/login

body:json {
  {
    "email": "user@example.com",
    "password": "password123"
  }
}

docs {
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동"
  }
}
```
}
```

### 페이지네이션 API

```bru
# bruno/posts/get-posts.bru
meta {
  name: Get Posts with Pagination
  type: http
}

get {{baseUrl}}/api/posts

docs {
```json
{
  "data": [
    {
      "id": 1,
      "title": "첫 번째 글",
      "content": "내용입니다",
      "author": {
        "id": 1,
        "name": "홍길동"
      },
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```
}
```

### 파일 업로드 API

```bru
# bruno/files/post-upload.bru
meta {
  name: Upload File
  type: http
}

post {{baseUrl}}/api/files/upload

docs {
```json
{
  "id": "file-uuid-123",
  "filename": "document.pdf",
  "url": "https://cdn.example.com/files/document.pdf",
  "size": 1024000,
  "mimeType": "application/pdf",
  "uploadedAt": "2024-01-01T00:00:00Z"
}
```
}
```

---

## 다음 단계

- [MSW 설정 가이드](msw-setup.md) - 생성된 MSW 핸들러 사용법
- [GitHub Actions 설정](github-actions-setup.md) - CI/CD 자동화
- [문제 해결](troubleshooting.md) - 일반적인 문제 해결

---

**[← 문서 목록으로](README.md)**
