import type { EducationLevel, EducationStream } from './types';
export { EDUCATION_LEVEL_ORDER } from './types';
export type { EducationLevel, EducationStream } from './types';

type DegreeParse = {
  stream: EducationStream | null;
  level: EducationLevel | null;
};

type DegreeRule = {
  stream: EducationStream;
  level: EducationLevel;
  patterns: RegExp[];
};

const DEVANAGARI_DIGITS: Record<string, string> = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
};

const DEGREE_RULES: DegreeRule[] = [
  {
    stream: 'healthcare',
    level: 'professional',
    patterns: [
      /\bmbbs\b/,
      /\bm\s*b\s*b\s*s\b/,
      /एमबीबीएस/,
      /\bbds\b/,
      /\bb\s*d\s*s\b/,
      /बीडीएस/,
      /\bbams\b/,
      /\bb\s*a\s*m\s*s\b/,
      /बीएएमएस/,
      /\bmd\b/,
      /\bms\b/,
      /एमडी/,
      /एमएस/,
    ],
  },
  {
    stream: 'law',
    level: 'professional',
    patterns: [/\bllb\b/, /\bl\s*l\s*b\b/, /एलएलबी/, /\bllm\b/, /\bl\s*l\s*m\b/, /एलएलएम/],
  },
  {
    stream: 'commerce',
    level: 'professional',
    patterns: [/\bca\b/, /\bcs\b/, /\bcma\b/, /चार्टर्ड अकाउंट/, /सीए/, /सीएस/, /सीएमए/],
  },
  {
    stream: 'healthcare',
    level: 'undergraduate',
    patterns: [/\bb\s*pharm\b/, /\bb\s*p\s*h\s*a\s*r\s*m\b/, /\bbpharm\b/, /बीफार्म/, /बी फार्म/],
  },
  {
    stream: 'healthcare',
    level: 'undergraduate',
    patterns: [/\bnursing\b/, /\bgnm\b/, /\banm\b/, /नर्सिंग/, /जीएनएम/, /एएनएम/],
  },
  {
    stream: 'science',
    level: 'postgraduate',
    patterns: [/\bm\s*tech\b/, /\bmtech\b/, /एमटेक/, /एम टेक/],
  },
  {
    stream: 'science',
    level: 'postgraduate',
    patterns: [/\bmca\b/, /एमसीए/],
  },
  {
    stream: 'science',
    level: 'postgraduate',
    patterns: [/\bm\s*sc\b/, /\bmsc\b/, /एमएससी/, /एम एससी/],
  },
  {
    stream: 'management',
    level: 'postgraduate',
    patterns: [/\bmba\b/, /\bm\s*b\s*a\b/, /\bpgdm\b/, /\bp\s*g\s*d\s*m\b/, /एमबीए/, /पीजीडीएम/],
  },
  {
    stream: 'commerce',
    level: 'postgraduate',
    patterns: [/\bm\s*com\b/, /\bmcom\b/, /एमकॉम/, /एम कॉम/],
  },
  {
    stream: 'arts-humanities',
    level: 'postgraduate',
    patterns: [/\bma\b/, /एमए/],
  },
  {
    stream: 'science',
    level: 'undergraduate',
    patterns: [/\bb\s*tech\b/, /\bbtech\b/, /\bbe\b/, /बीटेक/, /बी टेक/],
  },
  {
    stream: 'science',
    level: 'undergraduate',
    patterns: [/\bbca\b/, /\bb\s*c\s*a\b/, /बीसीए/],
  },
  {
    stream: 'science',
    level: 'undergraduate',
    patterns: [/\bb\s*sc\b/, /\bbsc\b/, /बीएससी/, /बी एससी/],
  },
  {
    stream: 'management',
    level: 'undergraduate',
    patterns: [/\bbba\b/, /बीबीए/],
  },
  {
    stream: 'commerce',
    level: 'undergraduate',
    patterns: [/\bb\s*com\b/, /\bbcom\b/, /बीकॉम/, /बी कॉम/],
  },
  {
    stream: 'arts-humanities',
    level: 'undergraduate',
    patterns: [/\bba\b/, /बीए/],
  },
  {
    stream: 'open',
    level: 'diploma',
    patterns: [/\biti\b/, /\bdiploma\b/, /आईटीआई/, /डिप्लोमा/],
  },
  {
    stream: 'open',
    level: 'secondary',
    patterns: [/\b10th\b/, /\b12th\b/, /\bclass\s*(10|12)\b/, /\b(10|12)\s*pass\b/, /10वीं/, /12वीं/],
  },
];

const LEVEL_ONLY_RULES: Array<{ level: EducationLevel; patterns: RegExp[] }> = [
  { level: 'professional', patterns: [/\bphd\b/, /\bph\.?\s*d\b/, /पीएचडी/] },
  { level: 'postgraduate', patterns: [/\bpost\s*graduate\b/, /\bmasters?\b/, /\bpg\b/, /स्नातकोत्तर/] },
  { level: 'undergraduate', patterns: [/\bgraduate\b/, /\bbachelor\b/, /स्नातक/] },
];

function normalizeDegree(value: string): string {
  return value
    .toLowerCase()
    .replace(/[०-९]/g, (digit) => DEVANAGARI_DIGITS[digit] || digit)
    .replace(/[.\-_/(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseDegree(degreeName: string): DegreeParse {
  const normalized = normalizeDegree(degreeName);
  if (!normalized) return { stream: null, level: null };

  for (const rule of DEGREE_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return { stream: rule.stream, level: rule.level };
    }
  }

  for (const rule of LEVEL_ONLY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return { stream: null, level: rule.level };
    }
  }

  return { stream: null, level: null };
}
