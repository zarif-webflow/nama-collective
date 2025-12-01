import { getHtmlElement } from "@taj-wf/utils";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SELECTORS = {
  canvas: "canvas[hero-video-reveal=canvas]",
  scrollTarget: "[hero-video-reveal=scroll-target]",
};

const initHeroVideoReveal = () => {
  const canvas = getHtmlElement<HTMLCanvasElement>({ selector: SELECTORS.canvas });
  const scrollTarget = getHtmlElement<HTMLElement>({ selector: SELECTORS.scrollTarget });

  if (!canvas || !scrollTarget) return;
};

initHeroVideoReveal();
