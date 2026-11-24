export type Correction = {start: number; end: number; text: string; anchor?: 'DpD' | 'CD' | 'O' | 'AD' | 'sectionC'};

// Only confirmed mathematical slips. These offsets stay on the original audio clock.
export const corrections: readonly Correction[] = [
  {start: 184.70, end: 186.86, text: '口播更正：这里是与 xOz 平行的截面，不是 xOy', anchor: 'sectionC'},
  {start: 219.36, end: 223.12, text: '口播顺序说反：应为 D′→D', anchor: 'DpD'},
  {start: 335.50, end: 339.92, text: '口播更正：这里说的是 CD 的 x、z 分量，不是 AB', anchor: 'CD'},
];

export const correctionAt = (t: number) => corrections.find(({start, end}) => t >= start && t < end);
