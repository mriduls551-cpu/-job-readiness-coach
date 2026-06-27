import type { DimensionVector, ObjectiveEvidence, PersonEvidence } from './types';

export interface SelectedAnswerEvidence {
  vector: number[];
  roleScores?: Record<string, number>;
}

export interface ProfileEvidence {
  numbersConfidence?: string;
  speakingConfidence?: string;
  dataConfidence?: string;
  educationStream?: string;
  objectiveEvidence?: ObjectiveEvidence;
}

export function buildPersonEvidence(
  answers: SelectedAnswerEvidence[],
  profile: ProfileEvidence,
  requiredAnswerCount: number
): PersonEvidence {
  const preferenceVector: DimensionVector = [0, 0, 0, 0, 0, 0];
  const branchRoleScores: Record<string, number> = {};

  for (const answer of answers) {
    for (let index = 0; index < preferenceVector.length; index += 1) {
      preferenceVector[index] += answer.vector[index] || 0;
    }
    for (const [roleId, points] of Object.entries(answer.roleScores || {})) {
      branchRoleScores[roleId] = (branchRoleScores[roleId] || 0) + points;
    }
  }

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
    educationStream: profile.educationStream,
    objectiveEvidence: profile.objectiveEvidence,
  };
}
