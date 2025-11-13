# bruno-openapi-sync

> **Bruno .bru files → OpenAPI 3.0 with automatic change tracking**

Convert your Bruno API collections to OpenAPI specifications with automatic change detection, TypeScript type generation, and comprehensive changelog generation.

**[한국어 문서 (Korean)](./README.ko.md)** | **[빠른 시작 (5분)](./QUICKSTART.md)** | **[⚙️ 완전 설정 가이드](./SETUP-GUIDE.md)**

**개발자 가이드**: [📝 Bruno 파일 작성](./docs/BRUNO-GUIDE.md) | [🎨 프론트엔드](./docs/FRONTEND-GUIDE.md) | [⚙️ GitHub Actions 설정](./docs/GITHUB-ACTIONS-SETUP.md)

## ✨ Features

- **🔄 Bruno to OpenAPI**: Automatic conversion from .bru files to OpenAPI 3.0
- **📊 Change Detection**: Automatically detect API changes between versions
- **⚠️ Breaking Changes**: Identify breaking changes that could affect consumers
- **📝 Changelog Generation**: Create beautiful changelogs in Markdown, JSON, or HTML
- **🎯 Domain Grouping**: Organize endpoints by domain/folder structure
- **🔍 Deep Schema Analysis**: Track field-level changes including type changes, additions, and removals

## 📦 Installation

```bash
npm install -D bruno-openapi-sync
```

## 🚀 Quick Start

### Basic Usage

```bash
# Generate OpenAPI spec
npx bruno-sync generate -i ./bruno -o ./openapi.json

# Generate with change detection
npx bruno-sync generate --diff

# Generate changelog
npx bruno-sync generate --diff --changelog CHANGELOG.md
```

### package.json Scripts

```json
{
  "scripts": {
    "api:generate": "bruno-sync generate -i ./bruno -o ./openapi.json",
    "api:diff": "bruno-sync generate --diff",
    "api:changelog": "bruno-sync generate --diff --changelog CHANGELOG.md",
    "api:changelog:html": "bruno-sync generate --diff --changelog docs/changelog.html --changelog-format html"
  }
}
```

## 📖 Usage

### CLI Options

```
bruno-sync generate [options]

Options:
  -i, --input <path>              Bruno collection directory (default: "./bruno")
  -o, --output <path>             Output OpenAPI file (default: "./openapi.json")
  --title <title>                 API title (default: "API Documentation")
  --version <version>             API version (default: "1.0.0")
  --description <description>     API description
  --base-url <url>                Base URL for API

Change Tracking:
  --diff                          Detect changes from previous version
  --changelog <path>              Generate changelog file
  --changelog-format <format>     Format: markdown | json | html (default: "markdown")
  --breaking-only                 Show only breaking changes
```

### Examples

#### 1. Basic OpenAPI Generation

```bash
npx bruno-sync generate \
  --input ./bruno \
  --output ./openapi.json \
  --title "My API" \
  --version "2.0.0" \
  --base-url "https://api.example.com"
```

#### 2. Change Detection

```bash
npx bruno-sync generate --diff
```

**Output:**
```
🔍 API Changes Detected

📊 Summary:
   ✨ Added:    2
   🗑️  Removed:  0
   🔄 Modified: 1
   ⚠️  **BREAKING CHANGES**: 1

📝 Detailed Changes:

⚠️  BREAKING CHANGES:
   GET    /applications/competitors
      ~ response.firstChoice[].gpa (number → string)
      - response.firstChoice[].applicants[].schoolId

✨ Added:
   POST   /applications/submit
   GET    /applications/:id/documents
```

#### 3. Generate Markdown Changelog

```bash
npx bruno-sync generate --diff --changelog CHANGELOG.md
```

**Result: CHANGELOG.md**
```markdown
# API Changelog

**Generated**: 2025-11-12 14:30:00

## 📊 Summary

| Type | Count |
|------|-------|
| ✨ Added | 2 |
| 🗑️ Removed | 0 |
| 🔄 Modified | 1 |
| ⚠️ **Breaking Changes** | **1** |

## ⚠️ Breaking Changes

> **주의**: 이 변경사항들은 기존 코드를 깨뜨릴 수 있습니다!

#### ⚠️ `GET /applications/competitors`

**변경사항**:
- 🔄 Type changed: `response.firstChoice[].gpa` from `number` to `string`
- 🗑️ Removed: `response.firstChoice[].applicants[].schoolId`

**마이그레이션 가이드**:
```typescript
// Before
const gpa: number = data.firstChoice[0].gpa;
const schoolId = data.firstChoice[0].applicants[0].schoolId;

// After
const gpa: string = data.firstChoice[0].gpa; // ⚠️ Type changed!
// schoolId는 더 이상 사용 불가
```
```

#### 4. HTML Changelog with Dashboard

```bash
npx bruno-sync generate --diff --changelog docs/changelog.html --changelog-format html
```

Creates a beautiful HTML dashboard with:
- 📊 Visual summary cards
- 🎨 Color-coded changes
- 🔍 Searchable/filterable
- 📱 Mobile responsive

#### 5. Breaking Changes Only

```bash
npx bruno-sync generate --diff --breaking-only --changelog BREAKING.md
```

## 🏗️ Project Structure

Your Bruno collection should be organized by domain:

```
bruno/
├── applications/
│   ├── get-competitors.bru
│   ├── create-application.bru
│   └── submit-application.bru
├── users/
│   ├── get-profile.bru
│   ├── update-profile.bru
│   └── auth/
│       ├── login.bru
│       └── logout.bru
└── bruno.json
```

Each .bru file should have a `docs` block with JSON response example:

```bru
meta {
  name: Get Competitors
  type: http
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
        "koreanName": "데겐도르프대학",
        "gpa": 4.5,
        "applicants": [
          {
            "id": 1,
            "name": "John Doe",
            "gpa": 4.3
          }
        ]
      }
    ]
  }
  ```
}
```

## 🔄 Change Detection

### Change Types

| Type | Description | Severity | Icon |
|------|-------------|----------|------|
| **Added** | New endpoint or field | Minor | ✨ |
| **Removed** | Deleted endpoint or field | **Breaking** | 🗑️ |
| **Modified** | Changed schema | Minor/Breaking | 🔄 |

### Breaking Changes

The following changes are considered **breaking**:

- ⚠️ Endpoint removed
- ⚠️ HTTP method removed
- ⚠️ Field removed from response
- ⚠️ Field type changed (e.g., `number` → `string`)
- ⚠️ Required field added to request

### Non-Breaking Changes

The following are **minor** changes:

- ✅ New endpoint added
- ✅ New field added to response
- ✅ Optional field added to request
- ✅ Documentation updated

## 🔗 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/api-sync.yml
name: API Sync & Change Detection

on:
  push:
    paths:
      - 'bruno/**'

jobs:
  sync:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 2

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Generate OpenAPI with diff
        run: npm run api:changelog

      - name: Check for breaking changes
        id: breaking
        run: |
          if grep -q "Breaking Changes" CHANGELOG.md; then
            echo "has_breaking=true" >> $GITHUB_OUTPUT
          fi

      - name: Comment PR with changes
        uses: actions/github-script@v6
        if: github.event_name == 'pull_request'
        with:
          script: |
            const fs = require('fs');
            const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## 🔄 API Changes\n\n${changelog}`
            });

      - name: Block PR if breaking
        if: steps.breaking.outputs.has_breaking == 'true'
        run: |
          echo "⚠️ Breaking changes detected!"
          exit 1

      - name: Commit changes
        run: |
          git config user.email "action@github.com"
          git config user.name "GitHub Action"
          git add openapi.json CHANGELOG.md
          git commit -m "chore: update API spec and changelog" || exit 0
          git push
```

## 💡 Use Cases

### 1. Backend Developer Workflow

```bash
# 1. Update Bruno file
vim bruno/applications/get-competitors.bru

# 2. Check changes
npm run api:diff

# 3. Generate changelog
npm run api:changelog

# 4. Commit
git add bruno/ CHANGELOG.md openapi.json
git commit -m "feat: add email field to competitors"
git push
```

### 2. Frontend Developer Workflow

```bash
# 1. Pull latest changes
git pull

# 2. Review changelog
cat CHANGELOG.md

# 3. Update code based on breaking changes
# TypeScript compiler will help catch issues!

# 4. Test
npm run test
```

### 3. API Review Process

```bash
# Generate HTML report for stakeholders
npm run api:changelog:html

# Open in browser
open docs/changelog.html

# Share with team for review
```

## 🎯 Roadmap

- [x] Bruno to OpenAPI conversion
- [x] Change detection
- [x] Changelog generation (MD/JSON/HTML)
- [x] Breaking change identification
- [x] CLI tool
- [ ] TypeScript type generation
- [ ] API client generation
- [ ] MSW mock generation
- [ ] React Query hooks generation
- [ ] Watch mode
- [ ] Zod schema generation

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/bruno-openapi-sync/issues)
- 📖 Docs: [Full Documentation](https://docs.example.com)

---

**bruno-openapi-sync v0.2.0** - Built with ❤️ for better API workflows
