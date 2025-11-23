/**
 * React Query 훅 생성 메인 로직
 * Bruno 파일들을 읽어서 React Query 훅들을 생성
 */

import { readdirSync, statSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, relative, dirname } from 'path';
import { parseBrunoFile, extractJsonFromDocs } from '../parser/bruParser';
import { extractApiFunction } from './apiClientGenerator';
import { generateReactQueryHookWithWrapper } from './reactQueryGenerator';
import { generateQueryKeyFile } from './queryKeyGenerator';
import { generateMSWHandler, generateDomainHandlersIndex, generateMSWIndex } from './mswGenerator';
import { generateTest } from './testGenerator';
import { generateFixtures, generateFixturesIndex } from './fixtureGenerator';

export interface GenerateHooksOptions {
  brunoDir: string;
  outputDir: string;
  axiosInstancePath?: string;
  mswOutputDir?: string; // MSW 핸들러 출력 디렉토리
  testOutputDir?: string; // 테스트 파일 출력 디렉토리 (기본: outputDir과 동일)
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
 * "한글명 [EnglishKey]" 형식에서 EnglishKey만 추출
 */
function extractDomain(filePath: string, brunoDir: string): string {
  const relativePath = relative(brunoDir, filePath);
  const parts = relativePath.split('/');
  const folderName = parts[0]; // 첫 번째 폴더가 도메인

  // [키] 패턴 추출
  const match = folderName.match(/\[([^\]]+)\]/);
  if (match) {
    return match[1]; // 대괄호 안의 키만 반환
  }

  return folderName; // 대괄호가 없으면 폴더명 그대로 반환
}

/**
 * React Query 훅 생성
 */
export async function generateHooks(options: GenerateHooksOptions): Promise<void> {
  const {
    brunoDir,
    outputDir,
    axiosInstancePath = '@/utils/axiosInstance',
    mswOutputDir,
    testOutputDir = outputDir // 기본값: outputDir과 동일
  } = options;

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

    // 훅 생성 (.generated.ts + wrapper)
    const hookWithWrapper = generateReactQueryHookWithWrapper(parsed, apiFunc, domain, axiosInstancePath);

    // 도메인 디렉토리 생성
    const domainDir = join(outputDir, domain);
    if (!domainDirs.has(domainDir)) {
      mkdirSync(domainDir, { recursive: true });
      domainDirs.add(domainDir);
    }

    // 1. .generated.ts 파일 작성 (항상 덮어쓰기)
    const generatedPath = join(domainDir, hookWithWrapper.generatedFile.fileName);
    writeFileSync(generatedPath, hookWithWrapper.generatedFile.content, 'utf-8');
    console.log(`✅ Generated: ${generatedPath}`);

    // 2. wrapper 파일 작성 (존재하면 스킵)
    const wrapperPath = join(domainDir, hookWithWrapper.wrapperFile.fileName);
    if (existsSync(wrapperPath)) {
      console.log(`⏭️  Skipped: ${wrapperPath} (already exists, preserving custom code)`);
    } else {
      writeFileSync(wrapperPath, hookWithWrapper.wrapperFile.content, 'utf-8');
      console.log(`✅ Generated: ${wrapperPath}`);
    }
  }

  // 인덱스 파일 생성 (선택사항)
  console.log('\n📄 Generating index files...');
  for (const domainDir of domainDirs) {
    const domain = relative(outputDir, domainDir);
    const files = readdirSync(domainDir).filter(f =>
      f.endsWith('.ts') &&
      !f.endsWith('.generated.ts') &&  // .generated.ts 제외
      !f.endsWith('.test.ts') &&        // .test.ts 제외
      f !== 'index.ts'                  // index.ts 자체 제외
    );

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

  // 테스트 파일 생성 (옵션이 제공된 경우)
  if (testOutputDir) {
    console.log('\n🧪 Generating test files...');
    await generateTestFiles(parsedFiles, testOutputDir, outputDir);
  }

  console.log('\n✨ All hooks generated successfully!');
  console.log(`\n📂 Output directory: ${outputDir}`);
  console.log('\n📚 Usage example:');
  console.log(`import { useGetApplicationsCompetitors } from './${relative(process.cwd(), join(outputDir, 'applications'))}';\n`);
  console.log(`const { data, isLoading, error } = useGetApplicationsCompetitors();`);

  // MSW 핸들러 생성 (옵션이 제공된 경우)
  if (mswOutputDir) {
    console.log('\n🎭 Generating MSW handlers...');
    await generateMSWHandlers(parsedFiles, mswOutputDir);
  }
}

/**
 * MSW 핸들러 생성
 */
async function generateMSWHandlers(
  parsedFiles: Array<{ filePath: string; parsed: any; domain: string }>,
  mswOutputDir: string
): Promise<void> {
  // MSW 출력 디렉토리 생성
  mkdirSync(mswOutputDir, { recursive: true });

  // 도메인별로 핸들러 그룹화
  const domainHandlers = new Map<string, Array<{ fileName: string; content: string }>>();

  for (const { filePath, parsed, domain } of parsedFiles) {
    const handler = generateMSWHandler(parsed, filePath, domain);

    if (!handler) {
      // done: true 또는 docs 없음
      continue;
    }

    if (!domainHandlers.has(domain)) {
      domainHandlers.set(domain, []);
    }

    domainHandlers.get(domain)!.push({
      fileName: handler.fileName,
      content: handler.content,
    });
  }

  // 도메인별 디렉토리 및 파일 생성
  const domains: string[] = [];

  for (const [domain, handlers] of domainHandlers.entries()) {
    domains.push(domain);

    // 도메인 디렉토리 생성
    const domainDir = join(mswOutputDir, domain);
    mkdirSync(domainDir, { recursive: true });

    // 각 핸들러 파일 작성
    const handlerInfos: Array<{ fileName: string; handlerName: string }> = [];

    for (const handler of handlers) {
      const handlerPath = join(domainDir, handler.fileName);
      writeFileSync(handlerPath, handler.content, 'utf-8');
      console.log(`✅ MSW Generated: ${handlerPath}`);

      handlerInfos.push({
        fileName: handler.fileName,
        handlerName: handler.fileName.replace('.ts', ''),
      });
    }

    // 도메인별 index 파일 생성
    const domainIndexContent = generateDomainHandlersIndex(domain, handlerInfos);
    const domainIndexPath = join(domainDir, 'index.ts');
    writeFileSync(domainIndexPath, domainIndexContent, 'utf-8');
    console.log(`✅ MSW Index Generated: ${domainIndexPath}`);
  }

  // Fixture 파일 생성
  console.log('\n📦 Generating fixtures...');
  const domainFilesMap = new Map<string, Array<{ parsed: any; name: string }>>();

  for (const { filePath, parsed, domain } of parsedFiles) {
    if (!domainFilesMap.has(domain)) {
      domainFilesMap.set(domain, []);
    }

    const apiFunc = extractApiFunction(parsed, filePath);
    if (apiFunc) {
      domainFilesMap.get(domain)!.push({
        parsed,
        name: apiFunc.name,
      });
    }
  }

  const fixturesDomains: string[] = [];
  for (const [domain, files] of domainFilesMap.entries()) {
    const fixture = generateFixtures(files, domain);
    const fixturePath = join(mswOutputDir, fixture.fileName);
    writeFileSync(fixturePath, fixture.content, 'utf-8');
    console.log(`✅ Fixture Generated: ${fixturePath}`);
    fixturesDomains.push(domain);
  }

  // Fixtures index 파일
  if (fixturesDomains.length > 0) {
    const fixturesIndexContent = generateFixturesIndex(fixturesDomains);
    const fixturesIndexPath = join(mswOutputDir, 'fixtures.ts');
    writeFileSync(fixturesIndexPath, fixturesIndexContent, 'utf-8');
    console.log(`✅ Fixtures Index Generated: ${fixturesIndexPath}`);
  }

  // 전체 handlers index 파일 생성
  if (domains.length > 0) {
    const mswIndexContent = generateMSWIndex(domains);
    const mswIndexPath = join(mswOutputDir, 'handlers.ts');
    writeFileSync(mswIndexPath, mswIndexContent, 'utf-8');
    console.log(`✅ MSW Main Index Generated: ${mswIndexPath}`);

    console.log(`\n🎭 MSW handlers generated successfully!`);
    console.log(`📂 MSW Output directory: ${mswOutputDir}`);
    console.log(`\n📚 Usage example:`);
    console.log(`import { handlers } from './${relative(process.cwd(), mswIndexPath).replace('.ts', '')}';\n`);
    console.log(`const worker = setupWorker(...handlers);`);
  } else {
    console.log(`ℹ️  No MSW handlers generated (all files have done: true or missing docs)`);
  }
}

/**
 * 테스트 파일 생성
 */
async function generateTestFiles(
  parsedFiles: Array<{ filePath: string; parsed: any; domain: string }>,
  testOutputDir: string,
  hooksOutputDir: string
): Promise<void> {
  let testCount = 0;

  for (const { filePath, parsed, domain } of parsedFiles) {
    const apiFunc = extractApiFunction(parsed, filePath);
    if (!apiFunc) {
      continue;
    }

    // docs에서 response 데이터 추출
    if (!parsed.docs) {
      console.log(`⚠️  Skipped test for ${filePath}: No docs block`);
      continue;
    }

    const responseData = extractJsonFromDocs(parsed.docs);
    if (!responseData) {
      console.log(`⚠️  Skipped test for ${filePath}: Invalid JSON in docs`);
      continue;
    }

    // 훅 이름 생성
    const hookName = `use${apiFunc.name.charAt(0).toUpperCase()}${apiFunc.name.slice(1)}`;

    // 테스트 파일 생성
    const testFile = generateTest(parsed, hookName, domain, responseData);
    if (!testFile) {
      continue;
    }

    // 테스트 디렉토리 생성
    const testDomainDir = join(testOutputDir, domain);
    mkdirSync(testDomainDir, { recursive: true });

    // 테스트 파일 작성
    const testPath = join(testDomainDir, testFile.fileName);
    writeFileSync(testPath, testFile.content, 'utf-8');
    console.log(`✅ Test Generated: ${testPath}`);
    testCount++;
  }

  if (testCount > 0) {
    console.log(`\n🧪 ${testCount} test files generated successfully!`);
    console.log(`📂 Test Output directory: ${testOutputDir}`);
    console.log(`\n📚 Run tests:`);
    console.log(`npm test`);
  } else {
    console.log(`ℹ️  No test files generated (missing docs blocks)`);
  }
}
