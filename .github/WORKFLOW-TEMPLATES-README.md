# GitHub Actions Workflow Templates

이 디렉토리에는 bruno-api-typescript를 사용한 자동화 워크플로우 템플릿이 있습니다.

## 📁 파일 설명

### 1. `sync-to-frontend.example.yml` (권장)
**사용처:** Bruno 리포
**방식:** 단일 워크플로우로 모든 처리

**특징:**
- ✅ 설정이 간단함
- ✅ 한 곳에서 모든 것을 관리
- ✅ 디버깅이 쉬움

**사용 방법:**
1. 파일명을 `sync-to-frontend.yml`로 변경
2. `YOUR_*` 부분을 실제 값으로 변경
3. Bruno 리포의 `.github/workflows/`에 추가

---

### 2. `repository-dispatch.example.yml` + `frontend-workflow.example.yml`
**사용처:** Bruno 리포 + 프론트엔드 리포
**방식:** 이벤트 기반 분리 처리

**특징:**
- ✅ 리포지토리 간 완전히 분리
- ✅ 프론트엔드 리포에서 독립적으로 제어 가능
- ⚠️ 설정이 복잡함

**사용 방법:**

**Bruno 리포:**
1. `repository-dispatch.example.yml` → `trigger-frontend.yml`로 변경
2. `YOUR_*` 부분 수정
3. `.github/workflows/`에 추가

**프론트엔드 리포:**
1. `frontend-workflow.example.yml` → `update-api-hooks.yml`로 변경
2. `YOUR_*` 부분 수정
3. `.github/workflows/`에 추가

---

## 🚀 시작하기

### 준비 사항

1. **GitHub App 생성** (필수)
   - [가이드 문서](../docs/GITHUB-APPS-SETUP.md) 참고

2. **Secrets 설정** (Bruno 리포)
   ```
   APP_ID: GitHub App ID
   APP_PRIVATE_KEY: Private key 전체 내용
   ```

3. **변경 필요한 부분**
   - `YOUR_GITHUB_USERNAME`: GitHub 사용자명
   - `YOUR_BRUNO_REPO`: Bruno 리포 이름
   - `YOUR_FRONTEND_REPO`: 프론트엔드 리포 이름

---

## 📝 워크플로우 선택 가이드

### sync-to-frontend.yml 선택 조건
- ✅ Bruno와 프론트엔드가 같은 조직/계정
- ✅ 간단한 설정 선호
- ✅ 한 곳에서 관리하고 싶음

### repository-dispatch 선택 조건
- ✅ 리포지토리가 완전히 분리되어야 함
- ✅ 프론트엔드 리포에서 독립적으로 실행 제어
- ✅ 복잡한 조건부 실행 필요

---

## 🧪 테스트

### 수동 실행
```bash
gh workflow run sync-to-frontend.yml --repo YOUR_USERNAME/bruno-repo
```

### 로그 확인
```bash
gh run list --workflow=sync-to-frontend.yml
gh run view <run-id> --log
```

---

## 🛠️ 커스터마이징

### Slack 알림 추가

워크플로우 끝에 추가:

```yaml
- name: Notify Slack
  if: steps.git-check.outputs.has_changes == 'true'
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "🔄 API hooks updated!"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Breaking Changes 감지

훅 생성 전에 추가:

```yaml
- name: Detect Breaking Changes
  run: |
    npx bruno-api generate --diff --breaking-only
    if [ $? -eq 1 ]; then
      echo "⚠️ Breaking changes detected!"
    fi
```

---

## ❓ 도움말

- [완전한 가이드](../docs/GITHUB-APPS-SETUP.md)
- [Issue 생성](https://github.com/manNomi/bruno-api-typescript/issues)

---

**Last Updated:** 2025-01-14
