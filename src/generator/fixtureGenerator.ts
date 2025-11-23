/**
 * Fixture 자동 생성
 * MSW와 테스트에서 공유하는 일관된 테스트 데이터
 */

import { ParsedBrunoFile, extractJsonFromDocs } from '../parser/bruParser';

export interface FixtureFile {
  fileName: string;
  content: string;
}

/**
 * 도메인별 Fixture 파일 생성
 */
export function generateFixtures(
  parsedFiles: Array<{ parsed: ParsedBrunoFile; name: string }>,
  domain: string
): FixtureFile {
  const fixtures: Record<string, any> = {};

  for (const { parsed, name } of parsedFiles) {
    if (!parsed.docs) continue;

    const responseData = extractJsonFromDocs(parsed.docs);
    if (!responseData) continue;

    // 함수명을 camelCase로 변환
    const fixtureName = name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

    fixtures[fixtureName] = responseData;

    // 변형 버전도 생성 (배열인 경우)
    if (Array.isArray(responseData)) {
      fixtures[`${fixtureName}Empty`] = [];
      fixtures[`${fixtureName}Single`] = responseData.slice(0, 1);
      fixtures[`${fixtureName}Many`] = [...responseData, ...responseData];
    }
  }

  const fixtureContent = generateFixtureContent(domain, fixtures);

  return {
    fileName: `${domain}.fixtures.ts`,
    content: fixtureContent,
  };
}

/**
 * Fixture 파일 내용 생성
 */
function generateFixtureContent(domain: string, fixtures: Record<string, any>): string {
  const lines: string[] = [
    `/**`,
    ` * ${domain} domain fixtures`,
    ` * Auto-generated from Bruno files`,
    ` * 테스트와 MSW에서 공유하는 일관된 데이터`,
    ` */`,
    ``,
  ];

  // 각 fixture export
  for (const [name, data] of Object.entries(fixtures)) {
    const dataStr = JSON.stringify(data, null, 2)
      .split('\n')
      .map((line, idx) => (idx === 0 ? line : `  ${line}`))
      .join('\n');

    lines.push(`export const ${name}Fixture = ${dataStr};`);
    lines.push(``);
  }

  // 통합 export
  lines.push(`/**`);
  lines.push(` * All ${domain} fixtures`);
  lines.push(` */`);
  lines.push(`export const ${domain}Fixtures = {`);
  for (const name of Object.keys(fixtures)) {
    lines.push(`  ${name}: ${name}Fixture,`);
  }
  lines.push(`};`);

  return lines.join('\n');
}

/**
 * Fixture index 파일 생성
 */
export function generateFixturesIndex(domains: string[]): string {
  const lines: string[] = [
    `/**`,
    ` * All fixtures index`,
    ` * Auto-generated`,
    ` */`,
    ``,
  ];

  // Import all domain fixtures
  for (const domain of domains) {
    lines.push(`import { ${domain}Fixtures } from './${domain}.fixtures';`);
  }
  lines.push(``);

  // Export all
  lines.push(`export const fixtures = {`);
  for (const domain of domains) {
    lines.push(`  ${domain}: ${domain}Fixtures,`);
  }
  lines.push(`};`);
  lines.push(``);

  // Re-export individual domains
  for (const domain of domains) {
    lines.push(`export * from './${domain}.fixtures';`);
  }

  return lines.join('\n');
}
