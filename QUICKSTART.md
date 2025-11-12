# 🚀 빠른 시작 가이드 (5분 완성)

> **Bruno API 컬렉션 → 자동 문서화 + 변경사항 추적**

## 1️⃣ 설치 (1분)

```bash
# 프로젝트에 설치
npm install -D bruno-openapi-sync

# package.json에 스크립트 추가
npm pkg set scripts.api:generate="bruno-sync generate -i ./bruno -o ./openapi.json"
npm pkg set scripts.api:diff="bruno-sync generate --diff --changelog CHANGELOG.md"
```

## 2️⃣ Bruno 파일 작성 (2분)

### 폴더 구조
```
bruno/
├── applications/
│   └── get-list.bru
└── users/
    └── get-profile.bru
```

### Bruno 파일 예시
```bru
meta {
  name: Get User Profile
  type: http
}

get /users/profile

headers {
  Authorization: Bearer {{token}}
}

docs {
  ```json
  {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com"
  }
  ```
}
```

**핵심**: `docs` 블록에 실제 응답 JSON 넣기!

## 3️⃣ OpenAPI 생성 (10초)

```bash
npm run api:generate
```

**생성됨**: `openapi.json`

## 4️⃣ Swagger UI 보기 (즉시)

### 로컬에서
```bash
# docs/api-viewer.html 생성 (이미 있음)
open docs/api-viewer.html
```

### GitHub Pages에서
1. Repository Settings → Pages
2. Source: `gh-pages` 브랜치 선택
3. main에 머지하면 자동 배포!
4. `https://your-org.github.io/your-repo/` 접속

---

## 💡 실전 사용법

### 백엔드 개발자

```bash
# 1. API 개발 완료
# 2. Bruno 파일 작성 (docs 블록 필수!)
vim bruno/users/get-profile.bru

# 3. 확인
npm run api:generate

# 4. Commit
git add bruno/ openapi.json
git commit -m "feat: 프로필 조회 API 추가"
git push
```

### 프론트엔드 개발자

**PR이 올라오면:**

1. **PR 코멘트 확인** (30초)
   - Breaking 있나?
   - 뭐가 바뀌었나?

2. **Swagger UI 확인** (2분)
   - `https://your-org.github.io/your-repo/api-viewer.html`
   - 새 API 구조 확인

3. **개발** (완료!)
   ```bash
   git pull
   npm run dev  # TypeScript가 자동으로 타입 체크
   ```

---

## 🔗 Bruno 저장소가 별도로 있나요?

**Bruno와 프론트엔드가 다른 저장소라면?**

### ⚡ 자동 연동 가능합니다!

```bash
# 간단한 설정 스크립트 실행
bash scripts/setup-cross-repo.sh
```

또는 자세한 방법: **[Cross-Repo 연동 가이드](./docs/CROSS-REPO-SYNC.md)**

### 작동 방식

```
[Bruno 저장소]
   ↓ Bruno 파일 변경
   ↓ Push
   ↓
자동 알림 발송
   ↓
[프론트엔드 저장소]
   ↓ GitHub Action 실행
   ↓ OpenAPI 자동 생성
   ↓ PR 자동 생성
   ↓
완료! 🎉
```

**5분 설정으로 완전 자동화!**

---

## 🔥 핵심 기능 요약

### ✅ 자동으로 되는 것들

1. **Bruno 파일 → OpenAPI 변환**
2. **변경사항 자동 감지** (Breaking 포함)
3. **PR에 자동 코멘트**
4. **Swagger UI 자동 배포**
5. **Changelog 자동 생성**
6. **별도 저장소 자동 연동** 🆕

### 📝 직접 해야 하는 것

1. **Bruno 파일 작성** (docs 블록만 정확히!)
2. **첫 설정** (GitHub Pages 활성화 or Cross-Repo 설정)

---

## 🎯 3가지 주요 명령어

```bash
# 1. OpenAPI 생성
npm run api:generate

# 2. 변경사항 확인
npm run api:diff

# 3. Changelog 생성
npm run api:changelog
```

끝!

---

## ❓ 자주 묻는 질문

### Q: docs 블록이 뭔가요?
**A**: Bruno 파일에서 응답 예시를 넣는 곳. 여기 JSON으로 타입이 자동 생성됨!

### Q: Breaking change는 언제 발생하나요?
**A**:
- 필드 제거
- 타입 변경 (number → string)
- 엔드포인트 제거

### Q: Swagger UI는 어디서 보나요?
**A**:
- 로컬: `docs/api-viewer.html`
- GitHub Pages: `https://your-org.github.io/your-repo/`

---

## 📚 더 자세한 문서

- **[Bruno 작성 가이드](./docs/BRUNO-GUIDE.md)** - 백엔드용
- **[프론트엔드 가이드](./docs/FRONTEND-GUIDE.md)** - 프론트용
- **[전체 워크플로우](./docs/WORKFLOW.md)** - 팀 협업

---

## 🎉 결과

**Before**: Bruno 파일 수정 → 프론트가 뭐가 바뀌었는지 몰라서 물어봄

**After**: Bruno 파일 수정 → PR 자동 코멘트 → Swagger UI 자동 배포 → 5분 안에 파악!

**이제 시작하세요!** 🚀
