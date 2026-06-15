// src/ai-core/ai-integration/domains/constants/variety.constants.ts
export interface VarietyMetadata {
  name: string;
}

export const VARIETY_CATALOG: Record<string, VarietyMetadata> = {
  D2:   { name: 'Dato Nina'   },
  D13:  { name: 'D13'         },
  D24:  { name: 'Sultan'      },
  D197: { name: 'Musang King' },
} as const;

export const VALID_VARIETY_CODES: ReadonlySet<string> = new Set(
  Object.keys(VARIETY_CATALOG),
);

export function resolveVarietyName(code: string): string {
  const normalized = code?.trim().toUpperCase() ?? '';
  return VARIETY_CATALOG[normalized]?.name ?? normalized;
}