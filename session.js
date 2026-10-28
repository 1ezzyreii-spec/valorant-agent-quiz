import { QUESTIONS } from './data.js';

export function newSession() {
  return { answers: Array(QUESTIONS.length).fill(null), index: 0, completed: false };
}
export function chooseAnswer(state, value) {
  if (!Number.isInteger(value) || value < 0 || value > 3) throw new RangeError('选项必须为0到3');
  const answers = [...state.answers];
  answers[state.index] = value;
  return { ...state, answers, completed: false };
}
export function nextQuestion(state) {
  if (state.answers[state.index] === null) throw new Error('请选择一个最像你的答案');
  if (state.index === state.answers.length - 1) return { ...state, completed: true };
  return { ...state, index: state.index + 1 };
}
export function previousQuestion(state) {
  return { ...state, index: Math.max(0, state.index - 1), completed: false };
}
