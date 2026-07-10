import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { getUserGuideConfig, GuidePlacement, UserGuideConfig } from '../../config/userGuide';
import { useAuthStore } from '../../store/authStore';
import { UserGuideContext } from '../../hooks/useUserGuide';

const GUIDE_VERSION = 'v1';
const STORAGE_PREFIX = `hi:user-guide:${GUIDE_VERSION}`;
const TARGET_PADDING = 10;

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function storageKey(userId: string, routeKey: string) {
  return `${STORAGE_PREFIX}:${userId}:${routeKey}`;
}

function hasCompletedGuide(userId: string, routeKey: string) {
  try {
    return localStorage.getItem(storageKey(userId, routeKey)) === 'done';
  } catch {
    return false;
  }
}

function markGuideCompleted(userId: string, routeKey: string) {
  try {
    localStorage.setItem(storageKey(userId, routeKey), 'done');
  } catch {
    // Guide persistence is best-effort.
  }
}

function clearGuideCompleted(userId: string, routeKey: string) {
  try {
    localStorage.removeItem(storageKey(userId, routeKey));
  } catch {
    // Replay still works in memory when storage is unavailable.
  }
}

function getElementRect(selector?: string): TargetRect | null {
  if (!selector) return null;
  const element = document.querySelector(selector);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function getCardPosition(rect: TargetRect | null, placement: GuidePlacement) {
  const gap = 18;
  const margin = 16;
  const cardWidth = Math.min(380, window.innerWidth - margin * 2);
  const cardHeight = 260;
  const centerLeft = rect ? rect.left + rect.width / 2 - cardWidth / 2 : (window.innerWidth - cardWidth) / 2;
  const centerTop = rect ? rect.top + rect.height / 2 - cardHeight / 2 : (window.innerHeight - cardHeight) / 2;

  if (!rect || placement === 'center' || window.innerWidth < 640) {
    return {
      left: clamp(centerLeft, margin, window.innerWidth - cardWidth - margin),
      top: clamp(window.innerHeight - cardHeight - 24, margin, window.innerHeight - cardHeight - margin),
      width: cardWidth,
    };
  }

  if (placement === 'top') {
    return {
      left: clamp(centerLeft, margin, window.innerWidth - cardWidth - margin),
      top: clamp(rect.top - cardHeight - gap, margin, window.innerHeight - cardHeight - margin),
      width: cardWidth,
    };
  }

  if (placement === 'left') {
    return {
      left: clamp(rect.left - cardWidth - gap, margin, window.innerWidth - cardWidth - margin),
      top: clamp(centerTop, margin, window.innerHeight - cardHeight - margin),
      width: cardWidth,
    };
  }

  if (placement === 'right') {
    return {
      left: clamp(rect.left + rect.width + gap, margin, window.innerWidth - cardWidth - margin),
      top: clamp(centerTop, margin, window.innerHeight - cardHeight - margin),
      width: cardWidth,
    };
  }

  return {
    left: clamp(centerLeft, margin, window.innerWidth - cardWidth - margin),
    top: clamp(rect.top + rect.height + gap, margin, window.innerHeight - cardHeight - margin),
    width: cardWidth,
  };
}

function useCurrentGuideTarget(active: boolean, selector?: string) {
  const [rect, setRect] = useState<TargetRect | null>(null);

  useEffect(() => {
    if (!active) {
      setRect(null);
      return undefined;
    }

    let frame = 0;
    let attempts = 0;
    let disposed = false;

    const measure = () => {
      if (disposed) return;
      setRect(getElementRect(selector));
      attempts += 1;
      if (attempts < 18) {
        frame = window.requestAnimationFrame(measure);
      }
    };

    measure();

    const handleChange = () => setRect(getElementRect(selector));
    window.addEventListener('resize', handleChange);
    window.addEventListener('scroll', handleChange, true);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('scroll', handleChange, true);
    };
  }, [active, selector]);

  return rect;
}

function ReplayButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-4 left-4 z-[70] inline-flex h-11 items-center gap-2 rounded-full border border-white/70 bg-white/55 px-4 text-sm font-black text-slate-700 shadow-xl shadow-slate-900/10 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/70 hover:text-pink-600 focus:outline-none focus:ring-4 focus:ring-pink-100"
      style={{
        WebkitBackdropFilter: 'blur(22px) saturate(170%)',
        backdropFilter: 'blur(22px) saturate(170%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72), 0 18px 42px rgba(15,23,42,0.14)',
      }}
      aria-label="Mở hướng dẫn trang này"
    >
      <span className="material-symbols-outlined text-[18px] text-pink-500">help</span>
      <span className="hidden sm:inline">Hướng dẫn</span>
    </button>
  );
}

function Spotlight({ rect }: { rect: TargetRect | null }) {
  if (!rect) return null;
  return (
    <motion.div
      className="pointer-events-none fixed z-[80] rounded-[1.5rem] border-2 border-white/90 bg-white/15 shadow-[0_0_0_9999px_rgba(15,23,42,0.48),0_20px_60px_rgba(15,23,42,0.22)] backdrop-blur-[2px]"
      initial={false}
      animate={{
        top: rect.top - TARGET_PADDING,
        left: rect.left - TARGET_PADDING,
        width: rect.width + TARGET_PADDING * 2,
        height: rect.height + TARGET_PADDING * 2,
      }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
    />
  );
}

function GuideCard({
  config,
  stepIndex,
  targetRect,
  onNext,
  onBack,
  onSkip,
  onClose,
}: {
  config: UserGuideConfig;
  stepIndex: number;
  targetRect: TargetRect | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const step = config.steps[stepIndex];
  const isLast = stepIndex === config.steps.length - 1;
  const position = typeof window === 'undefined'
    ? { left: 16, top: 16, width: 360 }
    : getCardPosition(targetRect, step.placement ?? 'bottom');

  return (
    <motion.section
      key={`${config.routeKey}-${step.id}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="user-guide-title"
      className="fixed isolate z-[90] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-[1.75rem] border border-white/70 bg-white/65 p-4 text-slate-950 shadow-2xl shadow-slate-900/20 backdrop-blur-2xl md:p-5"
      style={{
        left: position.left,
        top: position.top,
        width: position.width,
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        backdropFilter: 'blur(28px) saturate(180%)',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.78), rgba(255,255,255,0.56) 48%, rgba(255,241,246,0.68))',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -1px 0 rgba(255,255,255,0.28), 0 24px 70px rgba(15,23,42,0.22)',
      }}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: reduceMotion ? 0.05 : 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.88),transparent_38%),linear-gradient(120deg,rgba(255,255,255,0.26),transparent_42%,rgba(249,168,201,0.18))]" />
      <div className="pointer-events-none absolute inset-px -z-10 rounded-[1.7rem] border border-white/35" />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black text-pink-500">{config.label}</p>
          <h2 id="user-guide-title" className="mt-1 text-xl font-black leading-tight text-slate-950">
            {step.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 focus:outline-none focus:ring-4 focus:ring-pink-100"
          aria-label="Đóng hướng dẫn"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-500">{step.body}</p>

      <div className="mt-5 flex items-center gap-2">
        {config.steps.map((item, index) => (
          <span
            key={item.id}
            className={`h-1.5 rounded-full transition-all ${index === stepIndex ? 'w-8 bg-pink-500' : 'w-2 bg-slate-200'}`}
          />
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-black text-slate-400">
          Bước {stepIndex + 1}/{config.steps.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="h-11 rounded-full px-4 text-sm font-black text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-100"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={onBack}
            disabled={stepIndex === 0}
            className="grid h-11 w-11 place-items-center rounded-full border border-slate-100 bg-white text-slate-500 shadow-sm transition hover:border-pink-100 hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Bước trước"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-black text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-pink-600 focus:outline-none focus:ring-4 focus:ring-pink-100"
          >
            {isLast ? 'Xong' : 'Tiếp'}
            <span className="material-symbols-outlined text-[18px]">{isLast ? 'check' : 'arrow_forward'}</span>
          </button>
        </div>
      </div>
    </motion.section>
  );
}

export default function UserGuideProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, isBootstrapping } = useAuthStore();
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const manuallyOpenedRef = useRef(false);

  const userId = user?._id ?? 'guest';
  const blocked = isBootstrapping || location.pathname.startsWith('/admin') || user?.role === 'admin';
  const config = useMemo(() => getUserGuideConfig(location.pathname), [location.pathname]);
  const currentStep = config?.steps[stepIndex] ?? config?.steps[0];
  const targetRect = useCurrentGuideTarget(active, currentStep?.target);
  const available = !blocked && Boolean(config?.steps.length);

  const closeAndComplete = useCallback(() => {
    if (!config) return;
    markGuideCompleted(userId, config.routeKey);
    setActive(false);
    setStepIndex(0);
    manuallyOpenedRef.current = false;
  }, [config, userId]);

  const openCurrentGuide = useCallback(() => {
    if (!available) return;
    manuallyOpenedRef.current = true;
    setStepIndex(0);
    setActive(true);
  }, [available]);

  const resetCurrentGuide = useCallback(() => {
    if (!config) return;
    clearGuideCompleted(userId, config.routeKey);
    if (!available) return;
    manuallyOpenedRef.current = true;
    setStepIndex(0);
    setActive(true);
  }, [available, config, userId]);

  useEffect(() => {
    setActive(false);
    setStepIndex(0);
    manuallyOpenedRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    if (!available || !config || manuallyOpenedRef.current) return;
    if (hasCompletedGuide(userId, config.routeKey)) return;
    const timer = window.setTimeout(() => setActive(true), 550);
    return () => window.clearTimeout(timer);
  }, [available, config, userId, location.pathname]);

  const contextValue = useMemo(() => ({
    openCurrentGuide,
    resetCurrentGuide,
    isGuideActive: active,
    isGuideAvailable: available,
  }), [active, available, openCurrentGuide, resetCurrentGuide]);

  const goNext = () => {
    if (!config) return;
    if (stepIndex >= config.steps.length - 1) {
      closeAndComplete();
      return;
    }
    setStepIndex((current) => Math.min(current + 1, config.steps.length - 1));
  };

  const goBack = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  return (
    <UserGuideContext.Provider value={contextValue}>
      {children}
      {available && !active ? <ReplayButton onClick={openCurrentGuide} /> : null}
      <AnimatePresence>
        {available && active && config && currentStep ? (
          <>
            <motion.div
              className="fixed inset-0 z-[75] bg-slate-950/30 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={closeAndComplete}
            />
            <Spotlight rect={targetRect} />
            <GuideCard
              config={config}
              stepIndex={stepIndex}
              targetRect={targetRect}
              onNext={goNext}
              onBack={goBack}
              onSkip={closeAndComplete}
              onClose={closeAndComplete}
            />
          </>
        ) : null}
      </AnimatePresence>
    </UserGuideContext.Provider>
  );
}
