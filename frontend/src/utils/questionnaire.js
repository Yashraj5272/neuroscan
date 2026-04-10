// questionnaire.js — symptom questions, options, and scoring logic

export const QUESTIONS = [
  {
    id: 'tremor_rest',
    category: 'Motor',
    question: 'Do you notice shaking or trembling in your hands, arms, or legs when at rest?',
    options: [
      { label: 'Never', value: 0 },
      { label: 'Rarely (a few times a year)', value: 1 },
      { label: 'Sometimes (monthly)', value: 2 },
      { label: 'Often (weekly)', value: 3 },
      { label: 'Very often / daily', value: 4 },
    ]
  },
  {
    id: 'bradykinesia',
    category: 'Motor',
    question: 'Have your movements become slower than usual (walking, getting up from a chair)?',
    options: [
      { label: 'No slowness noticed', value: 0 },
      { label: 'Very slight, barely noticeable', value: 1 },
      { label: 'Mild slowness', value: 2 },
      { label: 'Moderate — affects daily tasks', value: 3 },
      { label: 'Significant slowness', value: 4 },
    ]
  },
  {
    id: 'rigidity',
    category: 'Motor',
    question: 'Do you experience stiffness or rigidity in your limbs or neck?',
    options: [
      { label: 'No stiffness', value: 0 },
      { label: 'Very slight', value: 1 },
      { label: 'Mild stiffness', value: 2 },
      { label: 'Moderate stiffness', value: 3 },
      { label: 'Severe stiffness', value: 4 },
    ]
  },
  {
    id: 'balance',
    category: 'Postural',
    question: 'Do you have difficulty with balance or experience unexpected falls?',
    options: [
      { label: 'No balance issues', value: 0 },
      { label: 'Occasional unsteadiness', value: 1 },
      { label: 'Frequent imbalance, no falls', value: 2 },
      { label: 'Falls occasionally', value: 3 },
      { label: 'Falls frequently / needs assistance', value: 4 },
    ]
  },
  {
    id: 'writing',
    category: 'Motor',
    question: 'Has your handwriting changed (smaller, cramped, harder to control)?',
    options: [
      { label: 'No change', value: 0 },
      { label: 'Slight change, still readable', value: 1 },
      { label: 'Noticeable change', value: 2 },
      { label: 'Significant change affecting reading', value: 3 },
      { label: 'Writing very difficult', value: 4 },
    ]
  },
  {
    id: 'speech',
    category: 'Non-Motor',
    question: 'Has your voice become softer, slower, or harder to understand?',
    options: [
      { label: 'No speech changes', value: 0 },
      { label: 'Very slight change', value: 1 },
      { label: 'Noticeable, still clear', value: 2 },
      { label: 'Significant change', value: 3 },
      { label: 'Major speech difficulty', value: 4 },
    ]
  },
  {
    id: 'facial_expression',
    category: 'Non-Motor',
    question: 'Have you or others noticed reduced facial expressions (mask-like face)?',
    options: [
      { label: 'No change', value: 0 },
      { label: 'Very slight reduction', value: 1 },
      { label: 'Mild reduction', value: 2 },
      { label: 'Moderate reduction', value: 3 },
      { label: 'Significant (masked face)', value: 4 },
    ]
  },
  {
    id: 'smell',
    category: 'Non-Motor',
    question: 'Have you experienced a reduced sense of smell (not due to a cold)?',
    options: [
      { label: 'Normal smell', value: 0 },
      { label: 'Slightly reduced', value: 1 },
      { label: 'Moderately reduced', value: 2 },
      { label: 'Significantly reduced', value: 3 },
      { label: 'Smell almost absent', value: 4 },
    ]
  },
  {
    id: 'sleep',
    category: 'Non-Motor',
    question: 'Do you experience vivid dreams, nightmares, or acting out dreams during sleep?',
    options: [
      { label: 'No', value: 0 },
      { label: 'Rarely', value: 1 },
      { label: 'Sometimes', value: 2 },
      { label: 'Often', value: 3 },
      { label: 'Nightly / very frequently', value: 4 },
    ]
  },
  {
    id: 'fine_motor',
    category: 'Motor',
    question: 'Do you have difficulty with fine tasks like buttoning clothes, typing, or using utensils?',
    options: [
      { label: 'No difficulty', value: 0 },
      { label: 'Very slight', value: 1 },
      { label: 'Mild, mostly independent', value: 2 },
      { label: 'Moderate, needs more time', value: 3 },
      { label: 'Significant, needs help', value: 4 },
    ]
  },
]

// Maximum raw score = 10 questions × 4 = 40
const MAX_SCORE = QUESTIONS.length * 4

/**
 * Convert answers map { questionId: value } into a 0–20 normalised score
 * matching the training data range in train_model.py
 */
export function computeQuestionnaireScore(answers) {
  const raw = Object.values(answers).reduce((acc, v) => acc + (v || 0), 0)
  return +((raw / MAX_SCORE) * 20).toFixed(2)
}

export const CATEGORY_COLORS = {
  Motor:        '#38bdf8',
  Postural:     '#a78bfa',
  'Non-Motor':  '#34d399',
}
