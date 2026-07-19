import { parseDegree } from './degree-parser';
import type {
  DimensionVector,
  EducationStream,
  ObjectiveEvidence,
  PersonEvidence,
} from './types';

export interface SelectedAnswerEvidence {
  id?: string;
  vector: number[];
  roleScores?: Record<string, number>;
}

export interface ProfileEvidence {
  numbersConfidence?: string;
  speakingConfidence?: string;
  dataConfidence?: string;
  educationStream?: string;
  degreeName?: string;
  objectiveEvidence?: ObjectiveEvidence;
}

const EDUCATION_STREAMS = new Set<EducationStream>([
  'commerce',
  'management',
  'arts-humanities',
  'science',
  'healthcare',
  'law',
  'open',
]);

function normalizeEducationStream(value: string | undefined): EducationStream | undefined {
  return value && EDUCATION_STREAMS.has(value as EducationStream)
    ? (value as EducationStream)
    : undefined;
}

export function buildPersonEvidence(
  answers: SelectedAnswerEvidence[],
  profile: ProfileEvidence,
  requiredAnswerCount: number
): PersonEvidence {
  const preferenceVector: DimensionVector = [0, 0, 0, 0, 0, 0];
  const branchRoleScores: Record<string, number> = {};
  let directRolePreference: string | undefined;

  for (const answer of answers) {
    for (let index = 0; index < preferenceVector.length; index += 1) {
      preferenceVector[index] += answer.vector[index] || 0;
    }
    for (const [roleId, points] of Object.entries(answer.roleScores || {})) {
      branchRoleScores[roleId] = (branchRoleScores[roleId] || 0) + points;
    }
    if (answer.id?.startsWith('rf_')) {
      directRolePreference = answer.id.slice(3);
    }
  }

  const parsedDegree = parseDegree(profile.degreeName || '');
  const explicitEducationStream = normalizeEducationStream(profile.educationStream);

  return {
    preferenceVector,
    branchRoleScores,
    selectedAnswerCount: answers.length,
    requiredAnswerCount,
    readiness: {
      numbers: profile.numbersConfidence,
      speaking: profile.speakingConfidence,
      dataAccuracy: profile.dataConfidence,
    },
    educationStream: explicitEducationStream || parsedDegree.stream || undefined,
    educationLevel: parsedDegree.level || undefined,
    directRolePreference,
    objectiveEvidence: profile.objectiveEvidence,
  };
}
