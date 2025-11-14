/**
 * TypeScript 타입 생성기
 * Bruno docs 블록의 JSON에서 TypeScript 타입 생성
 */

export interface TypeDefinition {
  name: string;
  content: string;
}

/**
 * JSON 값으로부터 TypeScript 타입 추론
 */
export function inferTypeScriptType(value: any, typeName: string = 'Unknown', indent: number = 0): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'any[]';
    }
    const itemType = inferTypeScriptType(value[0], `${typeName}Item`, indent);
    // 배열 아이템이 객체면 별도 인터페이스로 추출
    if (typeof value[0] === 'object' && !Array.isArray(value[0])) {
      return `${typeName}Item[]`;
    }
    return `${itemType}[]`;
  }

  const valueType = typeof value;

  switch (valueType) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return generateInterfaceContent(value, indent);
    default:
      return 'any';
  }
}

/**
 * 객체로부터 인터페이스 내용 생성
 */
function generateInterfaceContent(obj: Record<string, any>, indent: number = 0): string {
  const indentStr = '  '.repeat(indent);
  const properties: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const type = inferTypeScriptType(value, toPascalCase(key), indent + 1);
    properties.push(`${indentStr}  ${key}: ${type};`);
  }

  return `{\n${properties.join('\n')}\n${indentStr}}`;
}

/**
 * JSON 객체로부터 TypeScript 인터페이스 생성
 */
export function generateTypeScriptInterface(
  json: any,
  interfaceName: string
): TypeDefinition[] {
  const definitions: TypeDefinition[] = [];

  // 중첩된 배열 타입 추출
  extractNestedTypes(json, interfaceName, definitions);

  // 메인 인터페이스 생성
  const properties: string[] = [];
  for (const [key, value] of Object.entries(json)) {
    const type = getPropertyType(value, toPascalCase(key));
    properties.push(`  ${key}: ${type};`);
  }

  const mainInterface = `export interface ${interfaceName} {\n${properties.join('\n')}\n}`;
  definitions.push({ name: interfaceName, content: mainInterface });

  return definitions;
}

/**
 * 중첩된 타입 추출
 */
function extractNestedTypes(
  value: any,
  typeName: string,
  definitions: TypeDefinition[]
): void {
  if (Array.isArray(value) && value.length > 0) {
    const itemType = value[0];
    if (typeof itemType === 'object' && !Array.isArray(itemType)) {
      const itemTypeName = `${typeName}Item`;
      const properties: string[] = [];

      for (const [key, val] of Object.entries(itemType)) {
        const propType = getPropertyType(val, toPascalCase(key));
        properties.push(`  ${key}: ${propType};`);

        // 재귀적으로 중첩된 타입 추출
        extractNestedTypes(val, toPascalCase(key), definitions);
      }

      const interfaceContent = `export interface ${itemTypeName} {\n${properties.join('\n')}\n}`;
      definitions.unshift({ name: itemTypeName, content: interfaceContent });
    }
  } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    for (const [key, val] of Object.entries(value)) {
      extractNestedTypes(val, toPascalCase(key), definitions);
    }
  }
}

/**
 * 프로퍼티 타입 결정
 */
function getPropertyType(value: any, typeName: string): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return 'any[]';
    }
    const itemType = value[0];
    if (typeof itemType === 'object' && !Array.isArray(itemType)) {
      return `${typeName}Item[]`;
    }
    return `${getPropertyType(itemType, typeName)}[]`;
  }

  const valueType = typeof value;

  switch (valueType) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return typeName;
    default:
      return 'any';
  }
}

/**
 * 문자열을 PascalCase로 변환
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

/**
 * 문자열을 camelCase로 변환
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toLowerCase());
}

/**
 * URL 경로를 함수명으로 변환
 * 예: /applications/competitors -> getApplicationsCompetitors
 */
export function urlToFunctionName(method: string, url: string): string {
  // 경로 파라미터 제거 및 처리
  const pathParts = url
    .split('/')
    .filter(part => part.length > 0)
    .map(part => {
      // :id, {id} 같은 파라미터 처리
      if (part.startsWith(':') || part.startsWith('{')) {
        return 'ById';
      }
      return toPascalCase(part);
    });

  const baseName = pathParts.join('');
  const methodPrefix = method.toLowerCase();

  return `${methodPrefix}${baseName}`;
}

/**
 * 함수명을 타입명으로 변환
 * 예: getApplicationsCompetitors -> GetApplicationsCompetitorsResponse
 */
export function functionNameToTypeName(functionName: string, suffix: string = 'Response'): string {
  return `${toPascalCase(functionName)}${suffix}`;
}
