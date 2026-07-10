import { createContext, useContext } from 'react';

export interface UserGuideContextValue {
  openCurrentGuide: () => void;
  resetCurrentGuide: () => void;
  isGuideActive: boolean;
  isGuideAvailable: boolean;
}

export const UserGuideContext = createContext<UserGuideContextValue | null>(null);

export function useUserGuide() {
  const context = useContext(UserGuideContext);
  if (!context) {
    return {
      openCurrentGuide: () => undefined,
      resetCurrentGuide: () => undefined,
      isGuideActive: false,
      isGuideAvailable: false,
    };
  }
  return context;
}
