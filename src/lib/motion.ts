export const motionTransition = {
  reduced: { duration: 0.12, ease: 'linear' as const },
  press: { duration: 0.14, ease: [0.25, 1, 0.5, 1] as const },
  focus: { duration: 0.18, ease: [0.25, 1, 0.5, 1] as const },
  loading: { duration: 0.18, ease: [0.25, 1, 0.5, 1] as const },
  quick: { duration: 0.14, ease: [0.25, 1, 0.5, 1] as const },
  selection: { duration: 0.2, ease: [0.25, 1, 0.5, 1] as const },
  state: { duration: 0.22, ease: [0.25, 1, 0.5, 1] as const },
  optimistic: { duration: 0.2, ease: [0.25, 1, 0.5, 1] as const },
  success: { duration: 0.22, ease: [0.25, 1, 0.5, 1] as const },
  warning: { duration: 0.22, ease: [0.25, 1, 0.5, 1] as const },
  error: { duration: 0.22, ease: [0.25, 1, 0.5, 1] as const },
  route: { duration: 0.2, ease: [0.25, 1, 0.5, 1] as const },
  sheet: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  modal: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
  panel: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
  entrance: { duration: 0.46, ease: [0.16, 1, 0.3, 1] as const },
  progress: { duration: 0.62, ease: [0.16, 1, 0.3, 1] as const },
  ambient: { duration: 14, ease: 'linear' as const },
};

export const pressMotion = { scale: 0.98 };
export const hoverMotion = { y: -2, scale: 1.01 };
