import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const PUBLIC_ROUTES = ['/', '/help', '/terms', '/privacy', '/kien-thuc'];
const MOTION_EXCLUSIONS = [
  '[role="dialog"]',
  '[data-no-scroll-motion]',
  '.maplibregl-map',
  '.overflow-auto',
  '.overflow-y-auto',
  'table',
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => route === '/' ? pathname === route : pathname.startsWith(route));
}

function findRouteSurface() {
  const root = document.getElementById('root');
  if (!root) return null;
  const candidates = root.querySelectorAll<HTMLElement>(
    '[data-motion-page], .lp-root, .auth-shell, main, div.min-h-screen',
  );
  return Array.from(candidates).find((element) => !element.closest('[role="dialog"]')) ?? null;
}

function isSafeRevealTarget(element: HTMLElement) {
  return !MOTION_EXCLUSIONS.some((selector) => element.matches(selector) || element.closest(selector));
}

export default function RouteMotionEffects() {
  const { pathname } = useLocation();
  const progressRef = useRef<HTMLDivElement>(null);
  const showProgress = useMemo(
    () => pathname === '/' || pathname.startsWith('/kien-thuc') || pathname === '/help',
    [pathname],
  );

  useEffect(() => {
    let disposed = false;
    let cleanup: () => void = () => {};
    const timer = window.setTimeout(async () => {
      const surface = findRouteSurface();
      if (!surface || disposed) return;

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const metaBrowser = document.documentElement.classList.contains('meta-in-app-browser');
      const { animate } = await import('motion');
      if (disposed) return;

      const routeAnimation = animate(
        surface,
        reduceMotion || metaBrowser
          ? { opacity: [0.92, 1] }
          : { opacity: [0.9, 1], transform: ['translateY(8px)', 'translateY(0px)'] },
        { duration: reduceMotion ? 0.01 : 0.28, ease: [0.25, 1, 0.5, 1] },
      );

      if (reduceMotion || metaBrowser) {
        cleanup = () => routeAnimation.stop();
        return;
      }

      const [gsapModule, scrollTriggerModule] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (disposed) {
        routeAnimation.stop();
        return;
      }
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const publicRoute = isPublicRoute(pathname);
      const selector = publicRoute
        ? 'section, article > header, [data-motion-reveal], #features, #reviews, #pricing'
        : ':scope > section, :scope > div > section, [data-motion-reveal]';
      const targets = Array.from(surface.querySelectorAll<HTMLElement>(selector))
        .filter(isSafeRevealTarget)
        .slice(0, publicRoute ? 32 : 18);

      const context = gsap.context(() => {
        const initialTargets = targets.filter((element) => element.getBoundingClientRect().top < window.innerHeight * 0.9);
        if (initialTargets.length > 0) {
          gsap.fromTo(
            initialTargets,
            { autoAlpha: 0.72, y: publicRoute ? 28 : 14 },
            {
              autoAlpha: 1,
              y: 0,
              duration: publicRoute ? 0.5 : 0.34,
              stagger: publicRoute ? 0.06 : 0.035,
              ease: 'power4.out',
              clearProps: 'opacity,visibility,transform',
            },
          );
        }

        targets
          .filter((element) => !initialTargets.includes(element))
          .forEach((element) => {
            gsap.fromTo(
              element,
              { autoAlpha: 0.76, y: publicRoute ? 34 : 16 },
              {
                autoAlpha: 1,
                y: 0,
                duration: publicRoute ? 0.48 : 0.32,
                ease: 'power4.out',
                clearProps: 'opacity,visibility,transform',
                scrollTrigger: {
                  trigger: element,
                  start: 'top 88%',
                  once: true,
                },
              },
            );
          });

        if (publicRoute && window.matchMedia('(min-width: 768px)').matches) {
          surface.querySelectorAll<HTMLElement>('.lp-blob, [data-motion-parallax]').forEach((element, index) => {
            gsap.to(element, {
              yPercent: index % 2 === 0 ? 10 : -8,
              ease: 'none',
              scrollTrigger: {
                trigger: surface,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.6,
              },
            });
          });
        }

        if (showProgress && progressRef.current) {
          gsap.fromTo(
            progressRef.current,
            { scaleX: 0 },
            {
              scaleX: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: document.documentElement,
                start: 'top top',
                end: 'max',
                scrub: 0.2,
              },
            },
          );
        }
      }, surface);

      cleanup = () => {
        routeAnimation.stop();
        context.revert();
      };
    }, 80);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      cleanup();
    };
  }, [pathname, showProgress]);

  if (!showProgress) return null;
  return <div ref={progressRef} className="hi-scroll-progress" aria-hidden="true" />;
}
