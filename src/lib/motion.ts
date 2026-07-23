export const motionTransition = {
  quick: { duration: 0.14, ease: [0.25, 1, 0.5, 1] as const },
  state: { duration: 0.22, ease: [0.25, 1, 0.5, 1] as const },
  panel: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
  entrance: { duration: 0.46, ease: [0.16, 1, 0.3, 1] as const },
};

export const pressMotion = { scale: 0.98 };
export const hoverMotion = { y: -2, scale: 1.01 };
