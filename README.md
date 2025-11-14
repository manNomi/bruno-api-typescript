# bruno-api-typescript

> **Generate TypeScript API clients, React Query hooks, and OpenAPI specs from Bruno .bru files**

Convert your Bruno API collections to type-safe TypeScript code with React Query hooks, Axios clients, and OpenAPI specifications. Includes automatic change detection and changelog generation.

**[한국어 문서 (Korean)](./README.ko.md)** | **[📚 전체 문서](./docs/)**

**빠른 시작**: [⚡ Quick Start](./docs/quickstart.md) | [⚙️ Setup Guide](./docs/setup-guide.md)

**가이드**: [📝 Bruno 파일 작성](./docs/bruno-guide.md) | [🎨 프론트엔드](./docs/frontend-guide.md) | [🤖 GitHub Actions](./docs/github-actions.md) | [🔄 GitHub Apps](./docs/github-apps.md)

## ✨ Features

- **🔄 Bruno to OpenAPI**: Automatic conversion from .bru files to OpenAPI 3.0
- **📊 Change Detection**: Automatically detect API changes between versions
- **⚠️ Breaking Changes**: Identify breaking changes that could affect consumers
- **📝 Changelog Generation**: Create beautiful changelogs in Markdown, JSON, or HTML
- **🎯 Domain Grouping**: Organize endpoints by domain/folder structure
- **🔍 Deep Schema Analysis**: Track field-level changes including type changes, additions, and removals
- **🎣 React Query Hooks**: Generate type-safe React Query hooks with axios from .bru files
- **📦 Query Keys**: Auto-generate organized query keys based on folder structure
- **🔧 TypeScript Types**: Infer TypeScript types from JSON response examples
- **🎭 MSW Mock Handlers**: Auto-generate MSW (Mock Service Worker) handlers from .bru files
- **📁 Folder Name Support**: Support Korean folder names with English keys (e.g., `사용자 [users]`)
- **🚫 Mock Control**: Control MSW generation with `meta.done` field
- **🤖 Auto-Sync**: Automatically sync API changes to frontend repo using GitHub Apps

## 📦 Installation

```bash
npm install -D bruno-api-typescript
```

## 🚀 Quick Start

### Basic Usage

```bash
# Generate OpenAPI spec
npx bruno-api generate -i ./bruno -o ./openapi.json

# Generate with change detection
npx bruno-api generate --diff

# Generate changelog
npx bruno-api generate --diff --changelog CHANGELOG.md

# Generate React Query hooks
npx bruno-api generate-hooks -i ./bruno -o ./src/apis

# Generate React Query hooks with MSW handlers
npx bruno-api generate-hooks -i ./bruno -o ./src/apis --msw-output ./src/mocks
```

### package.json Scripts

```json
{
  "scripts": {
    "api:generate": "bruno-api generate -i ./bruno -o ./openapi.json",
    "api:diff": "bruno-api generate --diff",
    "api:changelog": "bruno-api generate --diff --changelog CHANGELOG.md",
    "api:changelog:html": "bruno-api generate --diff --changelog docs/changelog.html --changelog-format html",
    "api:hooks": "bruno-api generate-hooks -i ./bruno -o ./src/apis",
    "api:mocks": "bruno-api generate-hooks -i ./bruno -o ./src/apis --msw-output ./src/mocks"
  }
}
```

## 📖 Usage

### React Query Hooks Generation

Generate type-safe React Query hooks from your Bruno collection:

```bash
npx bruno-api generate-hooks -i ./bruno -o ./src/apis
```

**Options:**
- `-i, --input <path>`: Bruno collection directory (default: "./bruno")
- `-o, --output <path>`: Output hooks directory (default: "./src/apis")
- `--axios-path <path>`: Axios instance import path (default: "@/utils/axiosInstance")
- `--msw-output <path>`: MSW handlers output directory (optional)

**Generated Structure:**

```
src/apis/
  ├── queryKeys.ts                    # Auto-generated query keys
  ├── applications/
  │   ├── getApplicationsCompetitors.ts
  │   ├── postApplications.ts
  │   └── index.ts
  └── users/
      ├── getUsersProfile.ts
      └── index.ts
```

**Example Generated Hook:**

```typescript
// src/apis/applications/getApplicationsCompetitors.ts
import { AxiosError } from "axios";
import { axiosInstance } from "@/utils/axiosInstance";
import { QueryKeys } from "../queryKeys";
import { useQuery } from "@tanstack/react-query";

export interface FirstChoiceItem {
  koreanName: string;
  englishName: string;
  studentCapacity: number;
  gpa: string;
  applicants: ApplicantsItem[];
}

export interface GetApplicationsCompetitorsResponse {
  firstChoice: FirstChoiceItem[];
  secondChoice: any[];
  thirdChoice: any[];
}

const getApplicationsCompetitors = async (
  params?: Record<string, any>
): Promise<GetApplicationsCompetitorsResponse> => {
  const res = await axiosInstance.get<GetApplicationsCompetitorsResponse>(
    `/applications/competitors`,
    { params }
  );
  return res.data;
};

const useGetApplicationsCompetitors = (params?: Record<string, any>) => {
  return useQuery<GetApplicationsCompetitorsResponse, AxiosError>({
    queryKey: [QueryKeys.applications.getApplicationsCompetitors],
    queryFn: () => getApplicationsCompetitors(params),
  });
};

export default useGetApplicationsCompetitors;
```

**Usage in Your App:**

```typescript
import { useGetApplicationsCompetitors } from '@/apis/applications';

function CompetitorsPage() {
  const { data, isLoading, error } = useGetApplicationsCompetitors();

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {data?.firstChoice.map((competitor) => (
        <CompetitorCard key={competitor.koreanName} {...competitor} />
      ))}
    </div>
  );
}
```

**Mutations (POST/PUT/PATCH/DELETE):**

```typescript
import { usePostApplications } from '@/apis/applications';

function ApplicationForm() {
  const mutation = usePostApplications();

  const handleSubmit = async (formData) => {
    await mutation.mutateAsync({
      universityId: 1,
      choice: 'first'
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={mutation.isPending}>Submit</button>
    </form>
  );
}
```

### CLI Options

```
bruno-api generate [options]

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
npx bruno-api generate \
  --input ./bruno \
  --output ./openapi.json \
  --title "My API" \
  --version "2.0.0" \
  --base-url "https://api.example.com"
```

#### 2. Change Detection

```bash
npx bruno-api generate --diff
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
npx bruno-api generate --diff --changelog CHANGELOG.md
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
npx bruno-api generate --diff --changelog docs/changelog.html --changelog-format html
```

Creates a beautiful HTML dashboard with:
- 📊 Visual summary cards
- 🎨 Color-coded changes
- 🔍 Searchable/filterable
- 📱 Mobile responsive

#### 5. Breaking Changes Only

```bash
npx bruno-api generate --diff --breaking-only --changelog BREAKING.md
```

## 🏗️ Project Structure

Your Bruno collection should be organized by domain:

```
bruno/
├── 지원서 [applications]/     # Korean name with English key
│   ├── get-competitors.bru
│   ├── create-application.bru
│   └── submit-application.bru
├── 사용자 [users]/            # Supports Korean folder names
│   ├── get-profile.bru
│   ├── update-profile.bru
│   └── auth/
│       ├── login.bru
│       └── logout.bru
└── bruno.json
```

**Note**: Folder names support the format `한글명 [EnglishKey]` where only the `EnglishKey` inside brackets is used for generated file names and domains.

Each .bru file should have a `docs` block with JSON response example:

```bru
meta {
  name: Get Competitors
  type: http
  seq: 1
  done: true  # Optional: Skip MSW generation if backend is complete
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

## 🎭 MSW Mock Handlers

Automatically generate MSW handlers from your Bruno files for frontend development:

### Enable MSW Generation

```bash
npx bruno-api generate-hooks -i ./bruno -o ./src/apis --msw-output ./src/mocks
```

**Generated Structure:**

```
src/mocks/
├── admin/
│   ├── get-list.ts          # Individual handler
│   ├── post-create.ts
│   └── index.ts             # Domain handlers
├── users/
│   ├── get-profile.ts
│   └── index.ts
└── handlers.ts              # All handlers combined
```

**Generated Handler Example:**

```typescript
// src/mocks/admin/get-list.ts
import { http, HttpResponse } from 'msw';

export const handler = http.get('/api/admin/list', () => {
  return HttpResponse.json({
    "users": [
      { "id": 1, "name": "홍길동" }
    ]
  });
});
```

**Usage in Your App:**

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// src/main.tsx
if (import.meta.env.DEV) {
  const { worker } = await import('./mocks/browser');
  await worker.start();
}
```

### Control MSW Generation

Use the `done` field in meta block to skip MSW generation:

```bru
meta {
  name: Get User Profile
  type: http
  seq: 1
  done: true  # ✅ Skip MSW - backend is ready
}

get /users/profile

docs {
  ```json
  {
    "id": 1,
    "name": "홍길동"
  }
  ```
}
```

**When to use `done: true`:**
- ✅ Backend API is complete and deployed
- ✅ Legacy API already in production
- ❌ Backend API still in development (omit `done` to generate MSW)

## 🎯 Roadmap

- [x] Bruno to OpenAPI conversion
- [x] Change detection
- [x] Changelog generation (MD/JSON/HTML)
- [x] Breaking change identification
- [x] CLI tool
- [x] TypeScript type generation
- [x] API client generation
- [x] React Query hooks generation
- [x] MSW mock generation
- [x] Korean folder name support
- [x] MSW generation control (meta.done)
- [ ] Watch mode
- [ ] Zod schema generation

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

- 📧 Email: support@example.com
- 🐛 Issues: [GitHub Issues](https://github.com/manNomi/bruno-api-typescript/issues)
- 📖 Docs: [Full Documentation](https://docs.example.com)

---

**bruno-api-typescript v0.3.0** - Built with ❤️ for better API workflows
