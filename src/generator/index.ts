/**
 * React Query 훅 생성 메인 로직
 * Bruno 파일들을 읽어서 React Query 훅들을 생성
 */

import { readdirSync, statSync, mkdirSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { parseBrunoFile } from '../parser/bruParser';
import { extractApiFunction } from './apiClientGenerator';
import { generateReactQueryHook } from './reactQueryGenerator';
import { generateQueryKeyFile } from './queryKeyGenerator';

export interface GenerateHooksOptions {
  brunoDir: string;
  outputDir: string;
  axiosInstancePath?: string;
}

/**
 * Bruno 디렉토리에서 모든 .bru 파일 찾기
 */
function findBrunoFiles(dir: string): string[] {
  const files: string[] = [];

  function traverse(currentDir: string) {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (entry.endsWith('.bru')) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * 파일 경로에서 도메인 추출
 */
function extractDomain(filePath: string, brunoDir: string): string {
  const relativePath = relative(brunoDir, filePath);
  const parts = relativePath.split('/');
  return parts[0]; // 첫 번째 폴더가 도메인
}

/**
 * React Query 훅 생성
 */
export async function generateHooks(options: GenerateHooksOptions): Promise<void> {
  const { brunoDir, outputDir, axiosInstancePath = '@/utils/axiosInstance' } = options;

  console.log('🔍 Searching for .bru files...');
  const brunoFiles = findBrunoFiles(brunoDir);
  console.log(`✅ Found ${brunoFiles.length} .bru files`);

  if (brunoFiles.length === 0) {
    console.log('⚠️  No .bru files found');
    return;
  }

  // Bruno 파일 파싱
  const parsedFiles = brunoFiles.map(filePath => {
    try {
      const parsed = parseBrunoFile(filePath);
      const domain = extractDomain(filePath, brunoDir);
      return { filePath, parsed, domain };
    } catch (error) {
      console.error(`❌ Error parsing ${filePath}:`, error);
      return null;
    }
  }).filter(Boolean) as Array<{ filePath: string; parsed: any; domain: string }>;

  console.log(`📝 Parsed ${parsedFiles.length} files successfully`);

  // 출력 디렉토리 생성
  mkdirSync(outputDir, { recursive: true });

  // Query Keys 파일 생성
  console.log('\n📦 Generating query keys...');
  const queryKeyContent = generateQueryKeyFile(
    parsedFiles.map(f => ({ path: f.filePath, parsed: f.parsed, domain: f.domain }))
  );
  const queryKeyPath = join(outputDir, 'queryKeys.ts');
  writeFileSync(queryKeyPath, queryKeyContent, 'utf-8');
  console.log(`✅ Generated: ${queryKeyPath}`);

  // 도메인별 훅 생성
  console.log('\n🎣 Generating React Query hooks...');
  const domainDirs = new Set<string>();

  for (const { filePath, parsed, domain } of parsedFiles) {
    const apiFunc = extractApiFunction(parsed, filePath);
    if (!apiFunc) {
      console.log(`⚠️  Skipped ${filePath}: Invalid API function`);
      continue;
    }

    // 훅 생성
    const hook = generateReactQueryHook(parsed, apiFunc, domain, axiosInstancePath);

    // 도메인 디렉토리 생성
    const domainDir = join(outputDir, domain);
    if (!domainDirs.has(domainDir)) {
      mkdirSync(domainDir, { recursive: true });
      domainDirs.add(domainDir);
    }

    // 훅 파일 작성
    const hookPath = join(domainDir, hook.fileName);
    writeFileSync(hookPath, hook.content, 'utf-8');
    console.log(`✅ Generated: ${hookPath}`);
  }

  // 인덱스 파일 생성 (선택사항)
  console.log('\n📄 Generating index files...');
  for (const domainDir of domainDirs) {
    const domain = relative(outputDir, domainDir);
    const files = readdirSync(domainDir).filter(f => f.endsWith('.ts'));

    const indexContent = files
      .map(file => {
        const name = file.replace('.ts', '');
        return `export { default as ${name} } from './${name}';`;
      })
      .join('\n') + '\n';

    const indexPath = join(domainDir, 'index.ts');
    writeFileSync(indexPath, indexContent, 'utf-8');
    console.log(`✅ Generated: ${indexPath}`);
  }

  console.log('\n✨ All hooks generated successfully!');
  console.log(`\n📂 Output directory: ${outputDir}`);
  console.log('\n📚 Usage example:');
  console.log(`import { useGetApplicationsCompetitors } from './${relative(process.cwd(), join(outputDir, 'applications'))}';\n`);
  console.log(`const { data, isLoading, error } = useGetApplicationsCompetitors();`);
}
