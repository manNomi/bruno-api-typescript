# QueryKey 명세서

## 📌 요구사항

1. ✅ **queryKey는 각 도메인에 생성됩니다**
2. ✅ **queryKey 기본값은 request에 포함되는 모든 값들입니다**
3. ✅ **mutation은 queryKey 미포함입니다**

---

## 🏗️ 아키텍처 개요

### 1. 도메인 기반 QueryKey 구조

Bruno 파일의 디렉토리 구조를 기반으로 도메인별 QueryKey를 생성합니다.

```
bruno/
├── applications/
│   ├── get-competitors.bru    → QueryKeys.applications.getCompetitors
│   └── get-details.bru        → QueryKeys.applications.getDetails
├── users/
│   ├── get-user.bru           → QueryKeys.users.getUser
│   └── get-posts.bru          → QueryKeys.users.getPosts
└── products/
    └── get-list.bru           → QueryKeys.products.getList
```

**생성되는 QueryKeys**:
```typescript
export const QueryKeys = {
  applications: {
    getCompetitors: 'applications.getCompetitors' as const,
    getDetails: 'applications.getDetails' as const,
  },
  users: {
    getUser: 'users.getUser' as const,
    getPosts: 'users.getPosts' as const,
  },
  products: {
    getList: 'products.getList' as const,
  },
} as const;
```

---

## 🔍 상세 구현

### 1. QueryKey 생성 로직

#### 파일: `src/generator/queryKeyGenerator.ts`

##### 1.1 도메인 추출 (`generateQueryKeyStructure`)

**위치**: 라인 18-50

**동작 방식**:
```typescript
// 입력 경로: bruno/applications/get-competitors.bru
const pathParts = path.split('/');                    // ['bruno', 'applications', 'get-competitors.bru']
const brunoIndex = pathParts.findIndex(...)           // 0
const domain = pathParts[brunoIndex + 1];            // 'applications'
```

**검증 결과**: ✅ 파일 경로에서 도메인 정확히 추출

##### 1.2 엔드포인트 키 생성

```typescript
const fileName = path.split('/').pop()?.replace('.bru', '');  // 'get-competitors'
const keyName = toCamelCase(fileName);                        // 'getCompetitors'
structure[domain][keyName] = `${domain}.${keyName}`;          // 'applications.getCompetitors'
```

**검증 결과**: ✅ 파일명을 camelCase로 변환하여 엔드포인트 키 생성

##### 1.3 TypeScript 코드 생성 (`queryKeyStructureToCode`)

**위치**: 라인 55-80

**출력 예시**:
```typescript
export const QueryKeys = {
  applications: {
    getCompetitors: 'applications.getCompetitors' as const,
  },
} as const;

export type QueryKey = typeof QueryKeys[keyof typeof QueryKeys];
```

**타입 안정성**:
- `as const`: 리터럴 타입 보장
- `QueryKey` 타입: 모든 가능한 queryKey 값의 유니온 타입

---

### 2. useQuery 훅 - GET 요청

#### 파일: `src/generator/reactQueryGenerator.ts`

##### 2.1 함수: `generateUseQueryHook` (라인 46-125)

**용도**: GET 요청을 위한 useQuery 훅 생성

##### 2.2 QueryKey 생성 로직 (라인 93-101) ⭐

```typescript
// queryKey 생성 - request의 모든 값 포함 (URL params + query params)
const queryKeyDomain = toCamelCase(domain);        // 'applications'
const queryKeyEndpoint = toCamelCase(apiFunc.name); // 'getCompetitors'

let queryKeyStr = `[QueryKeys.${queryKeyDomain}.${queryKeyEndpoint}`;
// → '[QueryKeys.applications.getCompetitors'

if (urlParams.length > 0) {
  queryKeyStr += `, ${urlParams.join(', ')}`;
  // URL params 있으면: ', userId, postId'
}

// query params도 queryKey에 포함
queryKeyStr += `, params]`;
// → '[QueryKeys.applications.getCompetitors, userId, postId, params]'
```

##### 2.3 생성되는 코드 예시

**케이스 1**: URL params 없음

**Bruno 파일**: `GET /api/applications/competitors`

**생성되는 훅**:
```typescript
const useGetCompetitors = (params?: Record<string, any>) => {
  return useQuery<GetCompetitorsResponse, AxiosError>({
    queryKey: [QueryKeys.applications.getCompetitors, params],
    queryFn: () => getCompetitors({ params }),
  });
};
```

**사용 예시**:
```typescript
// params 없음
useGetCompetitors()
// queryKey: [QueryKeys.applications.getCompetitors, undefined]

// params 있음 - 다른 캐시!
useGetCompetitors({ category: 'tech' })
// queryKey: [QueryKeys.applications.getCompetitors, { category: 'tech' }]

useGetCompetitors({ category: 'finance' })
// queryKey: [QueryKeys.applications.getCompetitors, { category: 'finance' }]
```

**캐싱 동작**:
- `params`가 다르면 React Query가 다른 쿼리로 인식
- 각 `params` 조합마다 별도의 캐시 유지

---

**케이스 2**: URL params 있음

**Bruno 파일**: `GET /api/users/:userId/posts/:postId`

**생성되는 훅**:
```typescript
const useGetUsersPosts = (userId: string | number, postId: string | number, params?: Record<string, any>) => {
  return useQuery<GetUsersPostsResponse, AxiosError>({
    queryKey: [QueryKeys.users.getPostsByUserIdAndPostId, userId, postId, params],
    queryFn: () => getUsersPosts({ userId, postId, params }),
    enabled: !!userId && !!postId,
  });
};
```

**사용 예시**:
```typescript
// 다양한 조합
useGetUsersPosts(123, 456)
// queryKey: [QueryKeys.users.getPostsByUserIdAndPostId, 123, 456, undefined]

useGetUsersPosts(123, 456, { includeComments: true })
// queryKey: [QueryKeys.users.getPostsByUserIdAndPostId, 123, 456, { includeComments: true }]

useGetUsersPosts(789, 456, { includeComments: true })
// queryKey: [QueryKeys.users.getPostsByUserIdAndPostId, 789, 456, { includeComments: true }]
// ↑ userId가 다르므로 다른 쿼리!
```

**enabled 옵션**:
```typescript
enabled: !!userId && !!postId
```
- URL params가 모두 존재할 때만 쿼리 실행
- `undefined` 또는 `null` 전달 시 쿼리 비활성화

---

##### 2.4 QueryKey 구성 요소 분석

| 위치 | 구성 요소 | 타입 | 예시 | 목적 |
|------|----------|------|------|------|
| 0 | 도메인.엔드포인트 | `string` | `'users.getUser'` | API 엔드포인트 식별 |
| 1~ | URL params | `string \| number` | `123`, `'abc'` | 리소스 식별자 |
| 마지막 | Query params | `Record<string, any> \| undefined` | `{ page: 1 }` | 필터링, 정렬, 페이징 |

**검증 결과**: ✅ **request의 모든 값이 queryKey에 포함**

---

### 3. useMutation 훅 - POST/PUT/PATCH/DELETE 요청

#### 파일: `src/generator/reactQueryGenerator.ts`

##### 3.1 함수: `generateUseMutationHook` (라인 130-210)

**용도**: POST, PUT, PATCH, DELETE 요청을 위한 useMutation 훅 생성

##### 3.2 Import 문 분석 (라인 140-145)

```typescript
const lines: string[] = [
  `import { AxiosError } from "axios";`,
  `import { axiosInstance } from "${axiosInstancePath}";`,
  `import { useMutation } from "@tanstack/react-query";`,
  // ↑ useMutation만 import
  // QueryKeys import 없음!
  ``,
];
```

**검증 포인트**:
- ❌ `import { QueryKeys } from "../queryKeys";` 없음
- ✅ `useMutation` 사용

##### 3.3 훅 생성 로직 (라인 195-204)

```typescript
lines.push(`const ${hookName} = () => {`);
lines.push(`  return useMutation<${responseType}, AxiosError, ${mutationVariables}>({`);

if (urlParams.length > 0) {
  lines.push(`    mutationFn: (variables) => ${name}(variables),`);
} else {
  lines.push(`    mutationFn: (data) => ${name}({ data }),`);
}

lines.push(`  });`);
lines.push(`};`);
```

**검증 포인트**:
- ❌ `queryKey` 옵션 없음
- ✅ `mutationFn`만 존재

##### 3.4 생성되는 코드 예시

**케이스 1**: POST 요청 (URL params 없음)

**Bruno 파일**: `POST /api/users`

**생성되는 훅**:
```typescript
const usePostUsers = () => {
  return useMutation<PostUsersResponse, AxiosError, PostUsersRequest>({
    mutationFn: (data) => postUsers({ data }),
  });
};
```

**사용 예시**:
```typescript
const { mutate, isPending, error } = usePostUsers();

// 사용자 생성
mutate({
  name: "John Doe",
  email: "john@example.com"
});
```

---

**케이스 2**: PUT 요청 (URL params 있음)

**Bruno 파일**: `PUT /api/users/:userId`

**생성되는 훅**:
```typescript
const usePutUsers = () => {
  return useMutation<PutUsersResponse, AxiosError, { userId: string | number; data: PutUsersRequest }>({
    mutationFn: (variables) => putUsers(variables),
  });
};
```

**사용 예시**:
```typescript
const { mutate } = usePutUsers();

// 사용자 업데이트
mutate({
  userId: 123,
  data: {
    name: "John Updated",
    email: "john.updated@example.com"
  }
});
```

---

**케이스 3**: DELETE 요청

**Bruno 파일**: `DELETE /api/users/:userId`

**생성되는 훅**:
```typescript
const useDeleteUsers = () => {
  return useMutation<DeleteUsersResponse, AxiosError, { userId: string | number }>({
    mutationFn: (variables) => deleteUsers(variables),
  });
};
```

**사용 예시**:
```typescript
const { mutate } = useDeleteUsers();

// 사용자 삭제
mutate({ userId: 123 });
```

##### 3.5 Mutation과 Query의 차이

| 항목 | useQuery (GET) | useMutation (POST/PUT/DELETE) |
|------|----------------|-------------------------------|
| queryKey | ✅ 있음 | ❌ 없음 |
| 캐싱 | ✅ 자동 캐싱 | ❌ 캐싱 안 됨 |
| 재실행 | 자동 (stale 시) | 수동 (mutate 호출) |
| 멱등성 | 멱등적 | 비멱등적 |

**이유**:
- **GET**: 같은 요청을 여러 번 해도 같은 결과 (캐싱 가능)
- **POST/PUT/DELETE**: 매번 서버 상태 변경 (캐싱 불가)

**검증 결과**: ✅ **mutation은 queryKey 미포함**

---

### 4. useInfiniteQuery 훅 - 무한 스크롤/페이지네이션

#### 파일: `src/generator/reactQueryGenerator.ts`

##### 4.1 함수: `generateUseInfiniteQueryHook` (라인 228-300)

**용도**: 무한 스크롤/페이지네이션을 위한 useInfiniteQuery 훅 생성

##### 4.2 함수 파라미터 (라인 228-235)

```typescript
export function generateUseInfiniteQueryHook(
  parsed: ParsedBrunoFile,
  apiFunc: ApiFunction,
  domain: string,
  axiosInstancePath: string,
  pageParamName: string = 'page',        // 페이지 파라미터 이름
  nextPageField: string = 'nextPageNumber' // 응답의 다음 페이지 필드
): string
```

**커스터마이징 가능**:
- `pageParamName`: API에서 사용하는 페이지 파라미터 이름
- `nextPageField`: 응답 객체에서 다음 페이지 번호를 가져올 필드

##### 4.3 QueryKey 생성 로직 (라인 269-277) ⭐

```typescript
// queryKey - request의 모든 값 포함 (URL params + query params)
const queryKeyDomain = toCamelCase(domain);
const queryKeyEndpoint = toCamelCase(apiFunc.name);

let queryKeyStr = `[QueryKeys.${queryKeyDomain}.${queryKeyEndpoint}`;

if (urlParams.length > 0) {
  queryKeyStr += `, ${urlParams.join(', ')}`;
}

// size는 pagination params이므로 queryKey에 포함
queryKeyStr += `, size]`;
```

**중요**: `pageParam`은 queryKey에 포함되지 않음 (React Query가 내부적으로 관리)

##### 4.4 생성되는 코드 예시

**Bruno 파일**: `GET /api/users/:userId/posts`

**생성되는 훅**:
```typescript
const useGetUsersPosts = (userId: string | number, size?: number) => {
  return useInfiniteQuery<GetUsersPostsResponse, AxiosError>({
    queryKey: [QueryKeys.users.getPostsByUserId, userId, size],
    queryFn: ({ pageParam = 0 }) => getUserPosts({ userId, params: { size, page: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: GetUsersPostsResponse) => {
      return (lastPage as any).nextPageNumber === -1 ? undefined : (lastPage as any).nextPageNumber;
    },
    enabled: !!userId,
  });
};
```

##### 4.5 사용 예시

```typescript
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useGetUsersPosts(123, 10);

// 다음 페이지 로드
if (hasNextPage) {
  fetchNextPage();
}

// data 구조
data?.pages // [page0Data, page1Data, page2Data, ...]
```

##### 4.6 QueryKey 동작

```typescript
// size가 다르면 다른 캐시!
useGetUsersPosts(123, 10)  // queryKey: [QueryKeys.users.getPostsByUserId, 123, 10]
useGetUsersPosts(123, 20)  // queryKey: [QueryKeys.users.getPostsByUserId, 123, 20] ← 다른 쿼리!

// userId가 다르면 다른 캐시!
useGetUsersPosts(456, 10)  // queryKey: [QueryKeys.users.getPostsByUserId, 456, 10] ← 다른 쿼리!
```

**페이지 관리**:
```
queryKey: [key, 123, 10]  // 동일한 queryKey
├─ page 0: getUserPosts({ userId: 123, params: { size: 10, page: 0 } })
├─ page 1: getUserPosts({ userId: 123, params: { size: 10, page: 1 } })
├─ page 2: getUserPosts({ userId: 123, params: { size: 10, page: 2 } })
└─ ...
```

- `pageParam`은 queryKey에 포함되지 않음
- React Query가 같은 queryKey 내에서 페이지들을 관리
- 각 페이지는 순차적으로 로드되어 `data.pages` 배열에 누적

##### 4.7 페이지네이션 로직

```typescript
getNextPageParam: (lastPage: GetUsersPostsResponse) => {
  return (lastPage as any).nextPageNumber === -1
    ? undefined  // 마지막 페이지
    : (lastPage as any).nextPageNumber;  // 다음 페이지 번호
}
```

**동작**:
- API 응답의 `nextPageNumber` 필드 확인
- `-1`이면 마지막 페이지 (더 이상 페이지 없음)
- 숫자면 다음 페이지 번호로 사용

**검증 결과**: ✅ **request의 모든 값(URL params + size)이 queryKey에 포함**

---

## 📊 전체 비교표

### HTTP 메서드별 훅 타입

| HTTP 메서드 | React Query 훅 | queryKey 포함 | queryKey 구성 |
|------------|---------------|--------------|-------------|
| **GET** | `useQuery` | ✅ 포함 | `[QueryKeys.domain.endpoint, ...urlParams, params]` |
| **GET (Infinite)** | `useInfiniteQuery` | ✅ 포함 | `[QueryKeys.domain.endpoint, ...urlParams, size]` |
| **POST** | `useMutation` | ❌ 미포함 | - |
| **PUT** | `useMutation` | ❌ 미포함 | - |
| **PATCH** | `useMutation` | ❌ 미포함 | - |
| **DELETE** | `useMutation` | ❌ 미포함 | - |

### QueryKey 구성 요소

| 구성 요소 | useQuery | useInfiniteQuery | useMutation | 예시 |
|----------|----------|------------------|-------------|------|
| 도메인.엔드포인트 | ✅ | ✅ | ❌ | `QueryKeys.users.getUser` |
| URL params | ✅ | ✅ | ❌ | `userId`, `postId` |
| Query params | ✅ | ❌ | ❌ | `params` 객체 |
| Size param | ❌ | ✅ | ❌ | `size` |
| Page param | ❌ | ❌* | ❌ | - |

*useInfiniteQuery는 `pageParam`을 React Query가 내부적으로 관리하므로 queryKey에 포함하지 않음

---

## 🎯 실제 사용 시나리오

### 시나리오 1: 목록 조회 + 필터링

**API**: `GET /api/products`

**Bruno 파일**:
```
get /api/products

docs {
  ```json
  {
    "products": [
      { "id": 1, "name": "Product A", "category": "tech" }
    ]
  }
  ```
}
```

**생성되는 훅**:
```typescript
const useGetProducts = (params?: Record<string, any>) => {
  return useQuery<GetProductsResponse, AxiosError>({
    queryKey: [QueryKeys.products.getProducts, params],
    queryFn: () => getProducts({ params }),
  });
};
```

**사용**:
```typescript
// 1. 전체 상품 조회
const { data: allProducts } = useGetProducts();

// 2. 카테고리별 조회 - 다른 캐시!
const { data: techProducts } = useGetProducts({ category: 'tech' });
const { data: fashionProducts } = useGetProducts({ category: 'fashion' });

// 3. 정렬 + 필터링 - 다른 캐시!
const { data: sortedProducts } = useGetProducts({
  category: 'tech',
  sortBy: 'price',
  order: 'asc'
});
```

**캐시 관리**:
```
[QueryKeys.products.getProducts, undefined]
[QueryKeys.products.getProducts, { category: 'tech' }]
[QueryKeys.products.getProducts, { category: 'fashion' }]
[QueryKeys.products.getProducts, { category: 'tech', sortBy: 'price', order: 'asc' }]
```

각 조합마다 별도의 캐시 유지!

---

### 시나리오 2: 상세 조회

**API**: `GET /api/users/:userId`

**생성되는 훅**:
```typescript
const useGetUser = (userId: string | number, params?: Record<string, any>) => {
  return useQuery<GetUserResponse, AxiosError>({
    queryKey: [QueryKeys.users.getUser, userId, params],
    queryFn: () => getUser({ userId, params }),
    enabled: !!userId,
  });
};
```

**사용**:
```typescript
// 1. 기본 사용자 정보
const { data: user } = useGetUser(123);

// 2. 추가 정보 포함 - 다른 캐시!
const { data: userWithOrders } = useGetUser(123, { include: 'orders' });
const { data: userWithPosts } = useGetUser(123, { include: 'posts' });

// 3. 다른 사용자 - 다른 캐시!
const { data: anotherUser } = useGetUser(456);
```

**캐시 관리**:
```
[QueryKeys.users.getUser, 123, undefined]
[QueryKeys.users.getUser, 123, { include: 'orders' }]
[QueryKeys.users.getUser, 123, { include: 'posts' }]
[QueryKeys.users.getUser, 456, undefined]
```

---

### 시나리오 3: 데이터 생성 + 캐시 무효화

**APIs**:
- `GET /api/users` (조회)
- `POST /api/users` (생성)

**생성되는 훅**:
```typescript
// 조회 (useQuery - queryKey 있음)
const useGetUsers = (params?: Record<string, any>) => {
  return useQuery<GetUsersResponse, AxiosError>({
    queryKey: [QueryKeys.users.getUsers, params],
    queryFn: () => getUsers({ params }),
  });
};

// 생성 (useMutation - queryKey 없음)
const usePostUsers = () => {
  return useMutation<PostUsersResponse, AxiosError, PostUsersRequest>({
    mutationFn: (data) => postUsers({ data }),
  });
};
```

**사용**:
```typescript
import { useQueryClient } from '@tanstack/react-query';

function UserManagement() {
  const queryClient = useQueryClient();

  // 사용자 목록 조회
  const { data: users } = useGetUsers();

  // 사용자 생성
  const { mutate: createUser } = usePostUsers();

  const handleCreateUser = () => {
    createUser(
      { name: "New User", email: "new@example.com" },
      {
        onSuccess: () => {
          // 생성 성공 시 목록 캐시 무효화
          queryClient.invalidateQueries({
            queryKey: [QueryKeys.users.getUsers]
          });
        }
      }
    );
  };

  return (
    <div>
      <button onClick={handleCreateUser}>Create User</button>
      {users?.map(user => <div key={user.id}>{user.name}</div>)}
    </div>
  );
}
```

**흐름**:
1. `useGetUsers()` 호출 → 캐시에서 사용자 목록 로드
2. 사용자 생성 버튼 클릭 → `createUser()` 호출
3. Mutation 성공 → `invalidateQueries()` 호출
4. `useGetUsers()`의 캐시 무효화 → 자동으로 재조회

---

### 시나리오 4: 무한 스크롤

**API**: `GET /api/posts`

**생성되는 훅**:
```typescript
const useGetPosts = (size?: number) => {
  return useInfiniteQuery<GetPostsResponse, AxiosError>({
    queryKey: [QueryKeys.posts.getPosts, size],
    queryFn: ({ pageParam = 0 }) => getPosts({ params: { size, page: pageParam } }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      return lastPage.nextPageNumber === -1 ? undefined : lastPage.nextPageNumber;
    },
  });
};
```

**사용**:
```typescript
function PostList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useGetPosts(10);

  const handleScroll = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div onScroll={handleScroll}>
      {data?.pages.map((page, pageIndex) => (
        <div key={pageIndex}>
          {page.posts.map(post => (
            <div key={post.id}>{post.title}</div>
          ))}
        </div>
      ))}
      {isFetchingNextPage && <div>Loading more...</div>}
    </div>
  );
}
```

**데이터 구조**:
```typescript
{
  pages: [
    { posts: [...], nextPageNumber: 1 },  // page 0
    { posts: [...], nextPageNumber: 2 },  // page 1
    { posts: [...], nextPageNumber: 3 },  // page 2
    { posts: [...], nextPageNumber: -1 }, // page 3 (마지막)
  ],
  pageParams: [0, 1, 2, 3]
}
```

---

## ✅ 요구사항 검증 요약

### 1. queryKey는 각 도메인에 생성됩니다 ✅

**구현 위치**: `src/generator/queryKeyGenerator.ts:18-50`

**검증 방법**:
```typescript
// Bruno 파일 구조
bruno/
├── applications/get-competitors.bru
├── users/get-user.bru
└── products/get-list.bru

// 생성되는 QueryKeys
export const QueryKeys = {
  applications: { ... },  // ← 도메인별 분리
  users: { ... },
  products: { ... },
} as const;
```

**결론**: ✅ 파일 경로에서 도메인 추출 후 도메인별로 그룹화

---

### 2. queryKey 기본값은 request에 포함되는 모든 값들입니다 ✅

**구현 위치**:
- `src/generator/reactQueryGenerator.ts:93-101` (useQuery)
- `src/generator/reactQueryGenerator.ts:269-277` (useInfiniteQuery)

**검증 방법**:

**useQuery**:
```typescript
queryKey: [QueryKeys.domain.endpoint, ...urlParams, params]
//        └─ 도메인.엔드포인트  └─ URL params  └─ Query params
```

**useInfiniteQuery**:
```typescript
queryKey: [QueryKeys.domain.endpoint, ...urlParams, size]
//        └─ 도메인.엔드포인트  └─ URL params  └─ Pagination size
```

**테스트 케이스**:
```typescript
// URL: /api/users/:userId/posts/:postId
// Request: { userId: 123, postId: 456, params: { includeComments: true } }

queryKey: [
  QueryKeys.users.getPostsByUserIdAndPostId,  // 엔드포인트
  123,                                         // userId (URL param)
  456,                                         // postId (URL param)
  { includeComments: true }                   // params (Query param)
]
```

**결론**: ✅ request의 모든 값(URL params + query params)이 queryKey에 포함

---

### 3. mutation은 queryKey 미포함입니다 ✅

**구현 위치**: `src/generator/reactQueryGenerator.ts:130-210`

**검증 방법**:

**Import 문**:
```typescript
import { useMutation } from "@tanstack/react-query";
// ✅ QueryKeys import 없음
```

**훅 생성**:
```typescript
const usePostUsers = () => {
  return useMutation<...>({
    mutationFn: (data) => postUsers({ data }),
    // ✅ queryKey 옵션 없음
  });
};
```

**비교**:
```typescript
// useQuery - queryKey 있음
useQuery({
  queryKey: [QueryKeys.users.getUser, userId],  // ← 캐시 키
  queryFn: () => getUser({ userId }),
});

// useMutation - queryKey 없음
useMutation({
  mutationFn: (data) => postUser({ data }),    // ← 캐시 키 없음
});
```

**결론**: ✅ useMutation 훅에 queryKey가 전혀 없음

---

## ⚙️ 설정 가이드

### CLI 옵션

#### generate-hooks 명령어

```bash
npx bruno-api generate-hooks [options]
```

**사용 가능한 옵션**:

| 옵션 | 단축 | 기본값 | 설명 |
|------|------|--------|------|
| `--input <path>` | `-i` | `./bruno` | Bruno 파일들이 있는 디렉토리 |
| `--output <path>` | `-o` | `./src/apis` | 생성된 훅을 저장할 디렉토리 |
| `--axios-path <path>` | - | `@/utils/axiosInstance` | axiosInstance import 경로 |

**설정 파일**: `src/cli/index.ts:114-143`

---

### 1. axiosInstance 위치 설정

**CLI 옵션**: `--axios-path <path>`
**기본값**: `@/utils/axiosInstance`

**설정 방법**:
```bash
# 기본값 사용 (추천)
npx bruno-api generate-hooks

# 커스텀 경로 지정
npx bruno-api generate-hooks --axios-path "@/lib/axios"
npx bruno-api generate-hooks --axios-path "~/utils/api"
npx bruno-api generate-hooks --axios-path "../config/axiosInstance"
```

**생성되는 코드**:
```typescript
// --axios-path "@/utils/axiosInstance" (기본값)
import { axiosInstance } from "@/utils/axiosInstance";

// --axios-path "@/lib/axios"
import { axiosInstance } from "@/lib/axios";

// --axios-path "~/config/axios"
import { axiosInstance } from "~/config/axios";
```

**axios 설정 예시**:
```typescript
// src/utils/axiosInstance.ts
import axios from 'axios';

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

---

### 2. API 폴더 생성 위치

**CLI 옵션**: `-o, --output <path>`
**기본값**: `./src/apis`

**설정 방법**:
```bash
# 기본값 사용 (추천)
npx bruno-api generate-hooks

# 커스텀 디렉토리
npx bruno-api generate-hooks -o ./src/hooks/api
npx bruno-api generate-hooks -o ./app/api
npx bruno-api generate-hooks --output ./frontend/src/queries
```

**생성되는 구조**:
```
./src/apis/                          # 기본 출력 디렉토리 (-o 옵션으로 변경 가능)
├── queryKeys.ts                     # QueryKey 상수들
├── applications/                    # 도메인별 폴더 (Bruno 폴더 구조 기반)
│   ├── getCompetitors.ts           # GET /applications/competitors
│   ├── postApplications.ts         # POST /applications
│   ├── putApplications.ts          # PUT /applications/:id
│   └── index.ts                    # export { useGetCompetitors, ... }
├── users/
│   ├── getUser.ts                  # GET /users/:userId
│   ├── getUsers.ts                 # GET /users
│   ├── postUsers.ts                # POST /users
│   └── index.ts
└── products/
    ├── getProducts.ts
    └── index.ts
```

**도메인 폴더 매핑**:
```
Bruno 파일 경로 → 출력 경로

bruno/applications/get-competitors.bru
  → src/apis/applications/getCompetitors.ts

bruno/users/auth/login.bru
  → src/apis/users/login.ts

bruno/products/v2/get-list.bru
  → src/apis/products/getList.ts
```

**파일명 생성 규칙**:
- .bru 파일명을 camelCase로 변환
- `get-user.bru` → `getUser.ts`
- `post-application.bru` → `postApplication.ts`
- `get-competitors.bru` → `getCompetitors.ts`
- `update-user-profile.bru` → `updateUserProfile.ts`

---

### 3. package.json 스크립트 설정

**추천 설정**:
```json
{
  "scripts": {
    "api:generate": "bruno-api generate -i ./bruno -o ./openapi.json",
    "api:hooks": "bruno-api generate-hooks -i ./bruno -o ./src/apis",
    "api:hooks:watch": "nodemon --watch bruno --exec 'npm run api:hooks'",
    "api:all": "npm run api:generate && npm run api:hooks"
  },
  "devDependencies": {
    "bruno-api-typescript": "^0.3.0",
    "nodemon": "^3.0.0"
  }
}
```

**커스텀 프로젝트 구조**:
```json
{
  "scripts": {
    "api:hooks": "bruno-api generate-hooks -i ./specs/api -o ./app/hooks --axios-path '@/config/axios'"
  }
}
```

---

### 4. 실제 사용 예시

#### 예시 1: 기본 설정 (Next.js)

```bash
npx bruno-api generate-hooks
```

**프로젝트 구조**:
```
my-app/
├── bruno/                    # Bruno 파일
│   ├── users/
│   └── products/
├── src/
│   ├── apis/                # 생성된 훅 (기본 출력)
│   │   ├── queryKeys.ts
│   │   ├── users/
│   │   └── products/
│   └── utils/
│       └── axiosInstance.ts # axios 설정 (기본 import 경로)
└── package.json
```

**사용**:
```typescript
import { useGetUsers } from '@/apis/users';

function UserList() {
  const { data } = useGetUsers();
  // ...
}
```

---

#### 예시 2: 커스텀 경로 (Vite + React)

```bash
npx bruno-api generate-hooks \
  -i ./api-specs \
  -o ./src/hooks/queries \
  --axios-path "~/lib/axios"
```

**프로젝트 구조**:
```
my-app/
├── api-specs/              # Bruno 파일 (커스텀 위치)
├── src/
│   ├── hooks/
│   │   └── queries/        # 생성된 훅 (커스텀 출력)
│   │       ├── queryKeys.ts
│   │       └── users/
│   └── lib/
│       └── axios.ts        # axios 설정 (커스텀 import 경로)
└── package.json
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"]
    }
  }
}
```

**사용**:
```typescript
import { useGetUsers } from '~/hooks/queries/users';
```

---

#### 예시 3: Monorepo (pnpm workspace)

**Backend (API 정의)**:
```bash
# packages/backend/package.json
{
  "scripts": {
    "api:sync": "bruno-api generate-hooks -i ./bruno -o ../frontend/src/apis"
  }
}
```

**Frontend (훅 사용)**:
```
packages/
├── backend/
│   └── bruno/           # API 정의
└── frontend/
    └── src/
        └── apis/        # 생성된 훅 (backend에서 생성)
```

**실행**:
```bash
cd packages/backend
pnpm api:sync
```

---

### 5. TypeScript 설정 (path alias)

**Next.js**:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/apis/*": ["./src/apis/*"]
    }
  }
}
```

**Vite**:
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '~': path.resolve(__dirname, './src'),
    },
  },
});
```

---

### 6. CI/CD 자동화

**.github/workflows/generate-api.yml**:
```yaml
name: Generate API Hooks

on:
  push:
    paths:
      - 'bruno/**'

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Generate API hooks
        run: npm run api:hooks

      - name: Commit generated files
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add src/apis/
          git commit -m "chore: auto-generate API hooks" || exit 0
          git push
```

---

### 7. 문제 해결

#### 문제 1: axios import 경로 오류

**오류**:
```
Error: Cannot find module '@/utils/axiosInstance'
```

**해결책 1** - tsconfig.json 확인:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**해결책 2** - axios 파일 생성:
```bash
# src/utils/axiosInstance.ts 파일 생성 필요
mkdir -p src/utils
cat > src/utils/axiosInstance.ts << 'EOF'
import axios from 'axios';
export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});
EOF
```

**해결책 3** - 상대 경로 사용:
```bash
npx bruno-api generate-hooks --axios-path "../utils/axiosInstance"
```

---

#### 문제 2: 출력 디렉토리 권한 오류

**오류**:
```
Error: EACCES: permission denied, mkdir './src/apis'
```

**해결책**:
```bash
# 디렉토리 권한 확인
ls -la src/

# 권한 수정
chmod -R 755 src/

# 디렉토리 미리 생성
mkdir -p src/apis
```

---

#### 문제 3: Bruno 파일을 찾을 수 없음

**오류**:
```
❌ Bruno directory not found: /path/to/bruno
```

**해결책**:
```bash
# Bruno 디렉토리 확인
ls -la bruno/

# 올바른 경로 지정
npx bruno-api generate-hooks -i ./correct/path/to/bruno

# 또는 절대 경로 사용
npx bruno-api generate-hooks -i /absolute/path/to/bruno
```

---

## 📚 참고 자료

### React Query 공식 문서
- [Query Keys](https://tanstack.com/query/latest/docs/react/guides/query-keys)
- [useQuery](https://tanstack.com/query/latest/docs/react/reference/useQuery)
- [useMutation](https://tanstack.com/query/latest/docs/react/reference/useMutation)
- [useInfiniteQuery](https://tanstack.com/query/latest/docs/react/reference/useInfiniteQuery)

### 관련 파일
- `src/generator/queryKeyGenerator.ts`: QueryKey 생성 로직
- `src/generator/reactQueryGenerator.ts`: React Query 훅 생성 로직
- `src/generator/index.ts`: 메인 생성 로직
- `src/generator/typeGenerator.ts`: TypeScript 타입 생성 유틸리티

---

## 📝 변경 이력

### v0.3.1 (2024-01-14)
- ✅ **파일명 생성 방식 개선**: .bru 파일명 기반으로 변경
  - 이전: URL 기반 (`GET /users/:userId` → `getUsersByUserId.ts`)
  - 개선: 파일명 기반 (`get-user.bru` → `getUser.ts`)

### v0.3.0 (2024-01-14)
- ✅ useQuery에 query params 포함
- ✅ useInfiniteQuery에 size param 포함
- ✅ queryKey가 request의 모든 값을 포함하도록 개선
- ✅ mutation은 queryKey 미포함 유지

---

## 🎉 결론

모든 요구사항이 완벽히 충족되었습니다:

1. ✅ **queryKey는 각 도메인에 생성됩니다**
   - Bruno 파일 경로에서 도메인 추출
   - 도메인별로 QueryKeys 객체 그룹화

2. ✅ **queryKey 기본값은 request에 포함되는 모든 값들입니다**
   - useQuery: URL params + query params 모두 포함
   - useInfiniteQuery: URL params + size param 포함
   - React Query 캐싱이 정확히 동작

3. ✅ **mutation은 queryKey 미포함입니다**
   - useMutation 훅에 queryKey 옵션 없음
   - POST/PUT/PATCH/DELETE 모두 해당

이제 bruno-api-typescript는 React Query의 모범 사례를 완벽히 따르는 훅들을 생성합니다.
