# Git Workflow Guide

브루노 API 타입스크립트 프로젝트의 Git 워크플로우 가이드입니다.

## 📋 목차

- [개발 워크플로우](#개발-워크플로우)
- [커밋 컨벤션](#커밋-컨벤션)
- [브랜치 전략](#브랜치-전략)
- [PR 작성 가이드](#pr-작성-가이드)
- [자주 사용하는 명령어](#자주-사용하는-명령어)

---

## 🔄 개발 워크플로우

### 1️⃣ 새로운 기능 개발 시작

```bash
# main 브랜치를 최신 상태로 업데이트
git checkout main
git pull origin main

# 새로운 기능 브랜치 생성 (feature/기능명)
git checkout -b feature/새기능명

# 예시
git checkout -b feature/zod-schema-generation
```

### 2️⃣ 코드 작성 및 커밋

```bash
# 변경사항 확인
git status

# 파일 추가 (개별 또는 전체)
git add src/generator/zodGenerator.ts
# 또는 전체 추가
git add .

# 커밋 (컨벤션에 맞게)
git commit -m "feat: Zod 스키마 자동 생성 기능 추가"

# 여러 파일을 작업한 경우 논리적 단위로 나눠서 커밋
git add src/generator/zodGenerator.ts
git commit -m "feat: Zod 스키마 생성 로직 구현"

git add src/cli/index.ts
git commit -m "feat: Zod 생성 CLI 옵션 추가"
```

### 3️⃣ 원격 저장소에 푸시

```bash
# 처음 푸시할 때 (upstream 설정)
git push -u origin feature/zod-schema-generation

# 이후 푸시
git push
```

### 4️⃣ Pull Request 생성

```bash
# GitHub CLI 사용 (권장)
gh pr create --title "feat: Zod 스키마 자동 생성" --body "
## 📝 변경사항
- Zod 스키마 자동 생성 기능 추가
- CLI 옵션 --zod-output 추가
- 테스트 코드 작성

## 🧪 테스트
- [ ] 단위 테스트 통과
- [ ] E2E 테스트 통과
- [ ] 수동 테스트 완료

## 📚 문서
- [ ] README 업데이트
- [ ] 예시 코드 추가
"

# 또는 웹에서 직접 생성
# https://github.com/manNomi/bruno-api-typescript/pulls
```

### 5️⃣ 코드 리뷰 및 수정

```bash
# 리뷰 피드백 반영
git add .
git commit -m "fix: 리뷰 피드백 반영 - 타입 안정성 개선"
git push

# 자잘한 수정은 amend 사용 가능
git add .
git commit --amend --no-edit
git push --force-with-lease
```

### 6️⃣ 머지 후 정리

```bash
# main으로 이동
git checkout main

# 최신 상태로 업데이트
git pull origin main

# 작업 완료된 브랜치 삭제
git branch -d feature/zod-schema-generation

# 원격 브랜치도 삭제
git push origin --delete feature/zod-schema-generation
```

---

## 📝 커밋 컨벤션

### 커밋 메시지 형식

```
<타입>: <제목>

<본문> (선택사항)

<푸터> (선택사항)
```

### 타입 종류

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat: Zod 스키마 생성 기능 추가` |
| `fix` | 버그 수정 | `fix: MSW 핸들러 생성 시 URL 정규화 오류 수정` |
| `docs` | 문서 수정 | `docs: README에 Zod 사용법 추가` |
| `style` | 코드 포맷팅, 세미콜론 누락 등 | `style: ESLint 규칙 적용` |
| `refactor` | 코드 리팩토링 | `refactor: 스키마 빌더 로직 분리` |
| `test` | 테스트 코드 추가/수정 | `test: Zod 생성기 단위 테스트 추가` |
| `chore` | 빌드, 패키지 등 기타 작업 | `chore: dependencies 업데이트` |
| `perf` | 성능 개선 | `perf: 대용량 파일 파싱 최적화` |

### 커밋 메시지 예시

#### ✅ 좋은 예시

```bash
# 단일 기능
git commit -m "feat: watch mode 구현"

# 상세 설명 포함
git commit -m "feat: watch mode 구현

.bru 파일 변경 감지 및 자동 재생성 기능 추가
- chokidar를 사용한 파일 감시
- debounce로 중복 빌드 방지
- 변경된 파일만 선택적 재생성"

# 이슈 참조
git commit -m "fix: URL 파라미터 파싱 오류 수정

Closes #123"

# Breaking change
git commit -m "feat!: CLI 옵션 명칭 변경

BREAKING CHANGE: --output-dir을 --output으로 변경"
```

#### ❌ 나쁜 예시

```bash
git commit -m "update"
git commit -m "fix bug"
git commit -m "작업중"
git commit -m "WIP"
```

---

## 🌿 브랜치 전략

### 브랜치 이름 규칙

```
<타입>/<간단한-설명>
```

### 브랜치 타입

| 브랜치 타입 | 용도 | 예시 |
|------------|------|------|
| `main` | 프로덕션 코드 | - |
| `develop` | 개발 통합 브랜치 | - |
| `feature/` | 새로운 기능 개발 | `feature/zod-generation` |
| `fix/` | 버그 수정 | `fix/url-parsing` |
| `docs/` | 문서 작업 | `docs/git-workflow` |
| `refactor/` | 리팩토링 | `refactor/schema-builder` |
| `test/` | 테스트 추가 | `test/e2e-hooks` |

### 브랜치 생명주기

```bash
# 1. 브랜치 생성
git checkout -b feature/새기능

# 2. 작업 및 커밋
git add .
git commit -m "feat: 새 기능 구현"

# 3. 원격에 푸시
git push -u origin feature/새기능

# 4. PR 생성 및 리뷰

# 5. 머지 후 브랜치 삭제
git branch -d feature/새기능
git push origin --delete feature/새기능
```

---

## 📋 PR 작성 가이드

### PR 템플릿

```markdown
## 📝 변경사항
<!-- 이 PR에서 변경한 내용을 간략히 설명해주세요 -->
-

## 🎯 목적
<!-- 왜 이 변경이 필요한가요? -->


## 🧪 테스트
<!-- 어떻게 테스트했나요? -->
- [ ] 단위 테스트 작성 및 통과
- [ ] E2E 테스트 통과
- [ ] 수동 테스트 완료

## 📸 스크린샷 (선택사항)
<!-- 시각적 변경이 있다면 스크린샷을 첨부해주세요 -->


## 📚 문서
- [ ] README 업데이트
- [ ] 예시 코드 추가
- [ ] JSDoc 주석 추가

## ⚠️ Breaking Changes
<!-- Breaking change가 있나요? -->
- [ ] 없음
- [ ] 있음 (아래 설명 작성)

## 🔗 관련 이슈
<!-- 관련된 이슈가 있다면 링크해주세요 -->
Closes #
```

### PR 생성 명령어

```bash
# 기본 PR 생성
gh pr create

# 제목과 본문 지정
gh pr create --title "feat: 새 기능" --body "변경사항 설명"

# 템플릿 사용
gh pr create --web

# Draft PR 생성
gh pr create --draft

# 특정 브랜치로 PR
gh pr create --base main --head feature/new-feature
```

---

## 🛠️ 자주 사용하는 명령어

### 브랜치 관리

```bash
# 현재 브랜치 확인
git branch

# 모든 브랜치 확인 (원격 포함)
git branch -a

# 브랜치 생성 및 이동
git checkout -b feature/새기능

# 브랜치 이동
git checkout main

# 브랜치 삭제
git branch -d feature/완료된기능

# 원격 브랜치 삭제
git push origin --delete feature/완료된기능

# 로컬에 없는 원격 브랜치 정보 업데이트
git fetch --prune
```

### 커밋 관리

```bash
# 스테이징 영역에 추가
git add <파일명>
git add .

# 커밋
git commit -m "메시지"

# 마지막 커밋 수정 (메시지 변경)
git commit --amend -m "새로운 메시지"

# 마지막 커밋에 파일 추가 (메시지 유지)
git add 추가파일.ts
git commit --amend --no-edit

# 커밋 히스토리 확인
git log --oneline --graph --all

# 특정 파일의 변경 이력
git log --follow -- src/generator/zodGenerator.ts
```

### 변경사항 확인

```bash
# 작업 디렉토리 상태 확인
git status

# 변경사항 확인 (스테이징 전)
git diff

# 스테이징된 변경사항 확인
git diff --staged

# 특정 파일의 변경사항
git diff src/generator/zodGenerator.ts

# 특정 커밋의 변경사항
git show <커밋해시>
```

### 동기화

```bash
# 원격 저장소에서 최신 변경사항 가져오기
git fetch origin

# 가져오기 + 병합
git pull origin main

# 푸시
git push origin feature/브랜치명

# 강제 푸시 (주의! 협업 시 사용 금지)
git push --force-with-lease
```

### 되돌리기

```bash
# 작업 디렉토리 변경사항 취소 (파일 복원)
git checkout -- <파일명>

# 스테이징 취소
git restore --staged <파일명>

# 마지막 커밋 취소 (변경사항은 유지)
git reset --soft HEAD~1

# 마지막 커밋 취소 (변경사항도 삭제)
git reset --hard HEAD~1

# 특정 커밋으로 되돌리기
git revert <커밋해시>
```

### Stash (임시 저장)

```bash
# 현재 작업 임시 저장
git stash

# 저장 목록 확인
git stash list

# 가장 최근 stash 적용
git stash apply

# 가장 최근 stash 적용 및 삭제
git stash pop

# 특정 stash 적용
git stash apply stash@{0}

# 모든 stash 삭제
git stash clear
```

### 충돌 해결

```bash
# 1. 충돌 발생 시 상태 확인
git status

# 2. 충돌 파일 수동 수정

# 3. 수정 완료 후 스테이징
git add <충돌해결파일>

# 4. 커밋
git commit -m "conflict: 충돌 해결"

# 병합 중단
git merge --abort

# 리베이스 중단
git rebase --abort
```

---

## 🔍 실전 시나리오

### 시나리오 1: 급한 버그 수정

```bash
# 1. main에서 hotfix 브랜치 생성
git checkout main
git pull origin main
git checkout -b fix/critical-bug

# 2. 버그 수정 및 커밋
git add src/parser/bruParser.ts
git commit -m "fix: JSON 파싱 오류 수정"

# 3. 푸시 및 PR 생성
git push -u origin fix/critical-bug
gh pr create --title "fix: 크리티컬 버그 수정" --label "bug,urgent"

# 4. 머지 후 정리
git checkout main
git pull origin main
git branch -d fix/critical-bug
```

### 시나리오 2: 기능 개발 중 main 동기화

```bash
# 1. 현재 작업 임시 저장
git stash

# 2. main 최신화
git checkout main
git pull origin main

# 3. feature 브랜치로 돌아가서 rebase
git checkout feature/새기능
git rebase main

# 4. 작업 복원
git stash pop

# 충돌 발생 시
# - 충돌 파일 수정
# - git add <파일>
# - git rebase --continue
```

### 시나리오 3: 실수로 잘못된 커밋

```bash
# 마지막 커밋 메시지 수정
git commit --amend -m "올바른 메시지"

# 마지막 커밋에 파일 추가
git add 빠뜨린파일.ts
git commit --amend --no-edit

# 여러 커밋 수정 (interactive rebase)
git rebase -i HEAD~3

# 푸시된 커밋 수정 시 (주의!)
git push --force-with-lease
```

### 시나리오 4: 여러 브랜치 동시 작업

```bash
# 브랜치 A에서 작업 중
git checkout feature/기능A
# 작업 중...

# 긴급하게 브랜치 B 작업 필요
git stash save "기능A 작업 중"
git checkout -b feature/기능B
# 기능B 작업 완료
git add .
git commit -m "feat: 기능B 완료"
git push -u origin feature/기능B

# 기능A로 복귀
git checkout feature/기능A
git stash pop
```

---

## 📌 Best Practices

### ✅ DO

- **작은 단위로 자주 커밋**하기
- **명확한 커밋 메시지** 작성
- **main 브랜치는 항상 안정적**으로 유지
- **PR 전에 로컬에서 충분히 테스트**
- **코드 리뷰 적극 참여**
- **브랜치는 머지 후 즉시 삭제**

### ❌ DON'T

- **main에 직접 푸시하지 않기**
- **의미 없는 커밋 메시지** ("update", "fix" 등)
- **거대한 PR 만들지 않기** (500+ 라인)
- **테스트 없이 머지하지 않기**
- **force push 남용하지 않기**
- **작업 완료된 브랜치 방치하지 않기**

---

## 🚨 트러블슈팅

### 문제: push가 거부됨

```bash
# 원인: 원격에 새로운 커밋이 있음
# 해결: pull 후 push
git pull origin feature/브랜치명
git push origin feature/브랜치명

# 또는 rebase
git pull --rebase origin feature/브랜치명
git push origin feature/브랜치명
```

### 문제: 커밋을 잘못된 브랜치에 했음

```bash
# 1. 잘못된 커밋을 stash로 저장
git reset --soft HEAD~1
git stash

# 2. 올바른 브랜치로 이동
git checkout 올바른브랜치

# 3. stash 적용 및 커밋
git stash pop
git add .
git commit -m "올바른 커밋 메시지"
```

### 문제: .gitignore가 작동하지 않음

```bash
# 이미 추적된 파일 제거
git rm -r --cached .
git add .
git commit -m "chore: .gitignore 적용"
```

---

## 📚 추가 자료

- [Git 공식 문서](https://git-scm.com/doc)
- [GitHub CLI 문서](https://cli.github.com/manual/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)

---

**버전**: 1.0.0
**마지막 업데이트**: 2025-11-23
