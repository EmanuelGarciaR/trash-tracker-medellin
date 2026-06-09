import { gsap } from 'gsap';

gsap.defaults({
  ease: 'power3.out',
  duration: 0.5,
});

// --- ENTRANCE ANIMATIONS ---

export const animateHeader = (ref: React.RefObject<HTMLElement>) => {
  if (!ref.current) return;
  gsap.fromTo(ref.current, 
    { y: -20, opacity: 0 }, 
    { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
  );
};

export const animateMetricCards = (containerRef: React.RefObject<HTMLElement>) => {
  if (!containerRef.current) return;
  const cards = containerRef.current.children;
  gsap.fromTo(cards, 
    { y: 30, opacity: 0 }, 
    { y: 0, opacity: 1, stagger: 0.08 }
  );
};

export const animateContainerList = (containerRef: React.RefObject<HTMLElement>) => {
  if (!containerRef.current) return;
  const items = containerRef.current.children;
  gsap.fromTo(items, 
    { x: -20, opacity: 0 }, 
    { x: 0, opacity: 1, stagger: 0.06, delay: 0.3 }
  );
};

export const animateMap = (ref: React.RefObject<HTMLElement>) => {
  if (!ref.current) return;
  gsap.fromTo(ref.current, 
    { opacity: 0, scale: 0.98 }, 
    { opacity: 1, scale: 1, duration: 0.8, ease: "power2.out", delay: 0.2 }
  );
};

export const animateRouteResults = (ref: React.RefObject<HTMLElement>) => {
  if (!ref.current) return;
  gsap.fromTo(ref.current, 
    { y: 20, opacity: 0 }, 
    { y: 0, opacity: 1, duration: 0.45 }
  );
};

export const animateNewListItem = (el: HTMLElement) => {
  gsap.fromTo(el, { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: "back.out(1.5)" });
};

// --- HOVER ANIMATIONS ---

export const hoverMetricCard = (el: HTMLElement, isEnter: boolean) => {
  gsap.to(el, { y: isEnter ? -3 : 0, duration: 0.25, ease: "power2.out" });
};

export const hoverListItem = (el: HTMLElement, isEnter: boolean) => {
  gsap.to(el, { x: isEnter ? 4 : 0, duration: 0.2, ease: "power2.out" });
  const badge = el.querySelector('.status-badge');
  if (badge) {
    gsap.to(badge, { scale: isEnter ? 1.05 : 1, duration: 0.2 });
  }
};

export const hoverPrimaryBtn = (el: HTMLElement, isEnter: boolean) => {
  gsap.to(el, { scale: isEnter ? 1.02 : 1, duration: 0.2 });
};

export const pressPrimaryBtn = (el: HTMLElement, isPress: boolean) => {
  if (isPress) {
    gsap.to(el, { scale: 0.97, duration: 0.1 });
  } else {
    gsap.to(el, { scale: 1, duration: 0.15, ease: "back.out(2)" });
  }
};

export const hoverPopupBtn = (el: HTMLElement, isEnter: boolean, defaultColor: string, targetColor: string) => {
  gsap.to(el, { backgroundColor: isEnter ? targetColor : defaultColor, duration: 0.2 });
};

// --- FEEDBACK ANIMATIONS ---

export const animateMarkerPop = (el: HTMLElement) => {
  gsap.fromTo(el, { scale: 0.8 }, { scale: 1, duration: 0.4, ease: "back.out(3)" });
};

export const animateItemFlash = (el: HTMLElement, flashColor: string) => {
  gsap.fromTo(el, { backgroundColor: flashColor }, { backgroundColor: 'transparent', duration: 0.6 });
};

export const animateSpinner = (el: HTMLElement): gsap.core.Tween => {
  return gsap.to(el, { rotation: 360, repeat: -1, duration: 0.8, ease: "none" });
};

export const stopSpinner = (el: HTMLElement, textEl: HTMLElement, spinnerTween: gsap.core.Tween) => {
  spinnerTween.kill();
  gsap.to(el, { opacity: 0, scale: 0.5, duration: 0.2 });
  gsap.fromTo(textEl, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.3 });
};

// --- MODAL ANIMATIONS ---

export const animateModalEnter = (overlay: HTMLElement, modal: HTMLElement) => {
  gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2 });
  gsap.fromTo(modal, { y: 30, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "power3.out" });
};

export const animateModalExit = (overlay: HTMLElement, modal: HTMLElement): Promise<void> => {
  return new Promise((resolve) => {
    gsap.to(modal, { y: 30, opacity: 0, scale: 0.97, duration: 0.3, ease: "power3.in" });
    gsap.to(overlay, { opacity: 0, duration: 0.3, onComplete: resolve });
  });
};
