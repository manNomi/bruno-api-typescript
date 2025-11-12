# 팀 워크플로우 가이드

> **bruno-openapi-sync를 활용한 백엔드-프론트엔드 협업 가이드**

## 📋 목차

1. [전체 흐름 한눈에 보기](#전체-흐름-한눈에-보기)
2. [백엔드 개발자 가이드](#백엔드-개발자-가이드)
3. [프론트엔드 개발자 가이드](#프론트엔드-개발자-가이드)
4. [CI/CD 자동화](#cicd-자동화)
5. [Breaking Changes 대응](#breaking-changes-대응)
6. [FAQ](#faq)

---

## 전체 흐름 한눈에 보기

```
┌─────────────────┐
│  백엔드 개발자   │
└────────┬────────┘
         │
         ▼
  1. API 개발 완료
         │
         ▼
  2. Bruno 파일 작성
     (.bru 파일 생성)
         │
         ▼
  3. Git Push
         │
         ▼
┌────────┴────────┐
│   GitHub PR     │ ◄─── 4. CI/CD 자동 실행
└────────┬────────┘      - OpenAPI 생성
         │               - 변경사항 감지
         │               - Changelog 생성
         ▼               - PR에 코멘트
  5. 리뷰 & 머지
         │
         ▼
┌─────────────────┐
│ 프론트엔드 개발자│
└────────┬────────┘
         │
         ▼
  6. Git Pull
         │
         ▼
  7. Changelog 확인
     (Breaking 있나?)
         │
         ▼
  8. 코드 수정
     (필요시)
         │
         ▼
  9. 개발 완료! 🎉
```

---

## 백엔드 개발자 가이드

### 🎯 목표

프론트엔드가 자동으로 타입과 API 클라이언트를 생성할 수 있도록 **Bruno 파일을 정확하게 작성**하기

### Step 1: API 개발

평소처럼 API를 개발합니다.

```typescript
// 예: GET /applications/competitors
router.get('/applications/competitors', async (req, res) => {
  const data = await getCompetitors();
  res.json(data);
});
```

### Step 2: Bruno 파일 생성

API가 완성되면 `.bru` 파일을 생성합니다.

#### 파일 위치

```
bruno/
└── applications/           # 도메인 이름
    └── get-competitors.bru # 동작-엔드포인트.bru
```

#### 파일 내용

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
        "studentCapacity": 150,
        "applicantCount": 120
      }
    ],
    "secondChoice": [],
    "thirdChoice": []
  }
  ```
}
```

**중요**: `docs` 블록의 JSON은 **실제 응답과 100% 일치**해야 합니다!

### Step 3: 로컬에서 확인

```bash
# OpenAPI 생성 테스트
npm run api:generate

# 변경사항 확인
npm run api:diff
```

정상적으로 생성되는지 확인합니다.

### Step 4: Git Commit & Push

```bash
git add bruno/applications/get-competitors.bru
git commit -m "feat: 경쟁 현황 조회 API 추가"
git push
```

### Step 5: PR 생성

PR을 생성하면 자동으로:

1. ✅ OpenAPI 스펙 생성
2. ✅ 변경사항 감지
3. ✅ Changelog 생성
4. ✅ PR에 변경사항 코멘트

PR 코멘트 예시:
```
🔄 API 변경사항

📊 요약:
   ✨ 추가됨: 1

✨ 추가됨:
   GET /applications/competitors
```

### Step 6: 리뷰 & 머지

- 프론트엔드 개발자가 PR 확인
- Breaking changes 있으면 논의
- 문제 없으면 머지!

---

## 프론트엔드 개발자 가이드

### 🎯 목표

백엔드 API 변경사항을 빠르게 파악하고 **안전하게 대응**하기

### Step 1: PR 알림 확인

백엔드가 API를 수정하면 PR에 자동으로 변경사항이 코멘트됩니다.

### Step 2: Changelog 확인

```bash
git pull

# Changelog 확인
cat CHANGELOG.md
```

**특히 Breaking Changes 섹션 주의!**

```markdown
## ⚠️ Breaking Changes

#### ⚠️ `GET /applications/competitors`

**변경사항**:
- 🔄 타입 변경: response.gpa (number → string)
- 🗑️ 제거됨: response.schoolId

**마이그레이션 가이드**:
...
```

### Step 3: 코드 수정

#### Breaking이 없는 경우

그냥 사용하면 됩니다! 타입이 자동으로 업데이트되어 있습니다.

```typescript
// 새로운 필드가 추가되었다면
const data = await api.getCompetitors();
console.log(data.newField); // ✅ 타입 안전
```

#### Breaking이 있는 경우

마이그레이션 가이드를 참고하여 수정합니다.

**예시: 타입 변경**

```typescript
// ❌ Before
const gpa: number = data.gpa;

// ✅ After
const gpa: string = data.gpa;
```

**예시: 필드 제거**

```typescript
// ❌ Before
const schoolId = data.applicants[0].schoolId;

// ✅ After
// schoolId 필드는 더 이상 사용 불가
// 대안: 다른 식별자 사용
const userId = data.applicants[0].userId;
```

### Step 4: 컴파일 확인

```bash
npm run build
```

TypeScript 컴파일러가 자동으로 문제를 찾아줍니다!

```
❌ Type 'number' is not assignable to type 'string'
   src/components/Applications.tsx:42:15
```

### Step 5: 테스트

```bash
npm run test
```

모든 테스트가 통과하는지 확인합니다.

---

## CI/CD 자동화

### GitHub Actions 설정

`.github/workflows/api-sync.yml` 파일 생성:

```yaml
name: API Sync

on:
  push:
    paths:
      - 'bruno/**'
  pull_request:
    paths:
      - 'bruno/**'

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 2

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
            echo "⚠️ Breaking changes 발견!"
          else
            echo "has_breaking=false" >> $GITHUB_OUTPUT
          fi

      - name: PR 코멘트
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🔄 API 변경사항\n\n${changelog}`
            });

      - name: Breaking이 있으면 경고
        if: steps.breaking.outputs.has_breaking == 'true'
        run: |
          echo "⚠️ Breaking changes가 감지되었습니다!"
          echo "프론트엔드 팀과 상의 후 머지해주세요."
          # exit 1로 하면 PR을 차단할 수 있습니다

      - name: 변경사항 커밋
        run: |
          git config user.email "ci@example.com"
          git config user.name "CI Bot"
          git add openapi.json CHANGELOG.md
          git commit -m "chore: update API spec [skip ci]" || exit 0
          git push
```

### 자동으로 수행되는 작업

1. ✅ Bruno 파일 변경 감지
2. ✅ OpenAPI 스펙 생성
3. ✅ 이전 버전과 비교
4. ✅ Changelog 생성
5. ✅ PR에 자동 코멘트
6. ✅ Breaking이 있으면 경고

---

## Breaking Changes 대응

### Breaking Changes란?

**기존 코드를 깨뜨릴 수 있는 변경사항**

다음이 Breaking으로 분류됩니다:

- ⚠️ 엔드포인트 제거
- ⚠️ 필드 제거
- ⚠️ 필드 타입 변경 (`number` → `string`)
- ⚠️ 필수 필드 추가

### 대응 프로세스

#### 1. 백엔드: Breaking 발생 시

```bash
# 변경사항 확인
npm run api:diff

# ⚠️ Breaking이 있다면
# 1. Changelog 생성
npm run api:changelog

# 2. CHANGELOG.md 확인
cat CHANGELOG.md

# 3. 프론트엔드 팀에 알림
# - Slack/Discord 메시지
# - PR에 명시
# - 마이그레이션 가이드 제공
```

#### 2. 프론트엔드: Breaking 대응

**Step 1: Changelog 확인**

```markdown
## ⚠️ Breaking Changes

#### ⚠️ `GET /applications/competitors`

**변경사항**:
- 🔄 Type changed: response.gpa (number → string)
```

**Step 2: 영향 범위 파악**

```bash
# 해당 필드를 사용하는 곳 찾기
grep -r "\.gpa" src/
```

**Step 3: 코드 수정**

```typescript
// Before
const gpaNumber: number = data.gpa;
const displayGpa = gpaNumber.toFixed(2);

// After
const gpaString: string = data.gpa;
const displayGpa = parseFloat(gpaString).toFixed(2);
```

**Step 4: 테스트**

```bash
npm run test
npm run build
```

### 버전 관리

Breaking Changes가 있으면 버전을 올립니다:

- **Major 버전**: Breaking changes
- **Minor 버전**: 새 기능 추가 (호환 유지)
- **Patch 버전**: 버그 수정

```bash
# Breaking이 있으면
npm version major  # 1.0.0 -> 2.0.0

# 새 기능만 추가되었으면
npm version minor  # 1.0.0 -> 1.1.0

# 버그 수정만 했으면
npm version patch  # 1.0.0 -> 1.0.1
```

---

## FAQ

### Q1: Bruno 파일 작성이 귀찮아요

**A**: 한 번만 작성하면:
- ✅ 프론트엔드 타입 자동 생성
- ✅ API 클라이언트 자동 생성
- ✅ Mock 자동 생성
- ✅ 문서화 자동 완성
- ✅ 변경사항 자동 추적

**초기 10분 투자로 수십 시간 절약!**

### Q2: docs 블록을 꼭 써야 하나요?

**A**: 네! docs 블록이 핵심입니다.

- ❌ docs 없으면: 아무것도 생성 안됨
- ✅ docs 있으면: 모든 자동화 가능

### Q3: 실수로 잘못된 docs를 작성하면?

**A**:
1. `npm run api:diff`로 변경사항 확인
2. Breaking으로 감지되어 PR에서 발견됨
3. 리뷰 과정에서 수정 가능

### Q4: 옵셔널 필드는 어떻게 표시하나요?

**A**: 현재는 모든 필드를 포함하되, 값이 `null`일 수 있으면 `null`로 표시:

```json
{
  "optionalField": null,
  "requiredField": "value"
}
```

향후 버전에서 개선 예정입니다.

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

빈 배열 `[]`을 쓰면 타입 추론이 불가능합니다.

### Q6: Breaking을 피할 수 있나요?

**A**: 다음 방법으로 Breaking을 최소화:

1. **필드 제거 대신 deprecated 처리**
   ```json
   {
     "oldField": null,  // deprecated
     "newField": "value"
   }
   ```

2. **타입 변경 대신 새 필드 추가**
   ```json
   {
     "gpa": 4.5,        // 기존 (숫자)
     "gpaString": "4.5" // 신규 (문자열)
   }
   ```

3. **충분한 전환 기간 제공**
   - v1: 두 필드 모두 제공
   - v2: 새 필드만 제공

### Q7: 프론트엔드 개발 중인데 백엔드 API가 아직 없어요

**A**: Bruno 파일을 먼저 작성하세요!

1. 백엔드-프론트엔드가 API 스펙 합의
2. 백엔드가 Bruno 파일 작성 (API 미구현)
3. 프론트엔드가 OpenAPI 생성해서 개발 시작
4. 백엔드가 실제 API 개발
5. 통합!

**API First 개발 가능!**

---

## 체크리스트

### 백엔드 개발자

- [ ] API 개발 완료
- [ ] Bruno 파일 작성 ([가이드](./BRUNO-GUIDE.md) 참조)
- [ ] docs 블록이 실제 응답과 일치
- [ ] `npm run api:diff`로 확인
- [ ] Breaking이 있으면 팀에 알림
- [ ] PR 생성
- [ ] CI/CD 통과 확인
- [ ] 머지

### 프론트엔드 개발자

- [ ] PR 알림 확인
- [ ] Changelog 읽기
- [ ] Breaking 있는지 확인
- [ ] 필요시 코드 수정
- [ ] 테스트 실행
- [ ] 빌드 확인
- [ ] 완료!

---

## 도움 요청

문제가 생기면:

1. **Changelog 확인**: `cat CHANGELOG.md`
2. **에러 로그 확인**: `npm run api:generate`
3. **팀에 문의**: Slack/Discord
4. **이슈 등록**: GitHub Issues

---

## 마무리

이 워크플로우를 따르면:

✅ **백엔드-프론트엔드 동기화 자동**
✅ **타입 안전성 보장**
✅ **Breaking 사전 감지**
✅ **문서화 자동 완성**
✅ **협업 효율 극대화**

**한 번 설정하면 평생 편하게!** 🚀

궁금한 점은 언제든 팀에게 물어보세요!
