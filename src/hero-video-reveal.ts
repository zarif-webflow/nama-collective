import { getHtmlElement } from "@taj-wf/utils";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SELECTORS = {
  canvas: "canvas[hero-video-reveal=canvas]",
  scrollTarget: "[hero-video-reveal=scroll-target]",
  logo: "svg[hero-video-reveal=logo]",
};

const getVarBGColor = () => {
  const root = document.documentElement;
  const videoUpperBg = getComputedStyle(root)
    .getPropertyValue("--_hero-scroll-animation---colors--video-upper-bg")
    .trim();

  return videoUpperBg || "#ffffff";
};

const SVG_SCALE_ANCHOR = {
  originLeftRatio: 0.63,
  originTopRatio: 0.717,
};

/*
const getVarLogoSize = () => {
  const root = document.documentElement;
  const logoSizeValue = getComputedStyle(root)
    .getPropertyValue("--_hero-scroll-animation---sizes--logo-initial-size")
    .trim();

  if (!logoSizeValue.endsWith("px")) {
    console.error(
      `Expected logo size in px, got: ${logoSizeValue}. CSS variable: --_hero-scroll-animation---sizes--logo-initial-size`
    );
    return null;
  }

  return parseFloat(logoSizeValue);
};
*/

const initHeroVideoReveal = () => {
  const canvas = getHtmlElement<HTMLCanvasElement>({ selector: SELECTORS.canvas, log: "error" });
  const scrollTarget = getHtmlElement<HTMLElement>({
    selector: SELECTORS.scrollTarget,
    log: "error",
  });
  //   @ts-expect-error SVGSVGElement type
  const logoSvg = getHtmlElement<HTMLElement>({
    selector: SELECTORS.logo,
    log: "error",
  }) as SVGSVGElement;

  if (!canvas || !scrollTarget || !logoSvg) return;

  const canvasParent = canvas.parentElement as HTMLElement;
  const canvasContext = canvas.getContext("2d") as CanvasRenderingContext2D;

  const bgColor = getVarBGColor();

  // Image State
  let logoImage: HTMLImageElement | null = null;
  let aspectRatio = 1;
  let isImageLoaded = false;

  // Animation States

  let animeTL: gsap.core.Timeline | null = null;
  let scrollTrig: ScrollTrigger | null = null;
  let anchorScaler: ReturnType<typeof createAnchoredScale> | null = null;

  const initializeCanvas = () => {
    const { width, height } = canvasParent.getBoundingClientRect();
    canvas.width = width + 1;
    canvas.height = height + 1;

    drawFill();
  };

  const drawFill = () => {
    canvasContext.fillStyle = bgColor;
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  };

  /*
  const drawMaskWithSize = (
    logoWidth: number,
    options: { originLeftRatio: number; originTopRatio: number }
  ) => {
    drawFill();

    if (!logoImage || !isImageLoaded) return;

    const logoHeight = logoWidth / aspectRatio;

    const logoOriginX = logoWidth * options.originLeftRatio;
    const logoOriginY = logoHeight * options.originTopRatio;

    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;

    const x = canvasCenterX - logoOriginX;
    const y = canvasCenterY - logoOriginY;

    canvasContext.globalCompositeOperation = "destination-out";
    canvasContext.drawImage(logoImage, x, y, logoWidth, logoHeight);
    canvasContext.globalCompositeOperation = "source-over";
  };
  */

  const createAnchoredScale = (
    initialWidth: number,
    options: { originLeftRatio: number; originTopRatio: number }
  ) => {
    if (!logoImage || !isImageLoaded) return null;

    drawFill();

    // Initial centered position
    const initialHeight = initialWidth / aspectRatio;
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;
    const initialX = canvasCenterX - initialWidth / 2;
    const initialY = canvasCenterY - initialHeight / 2;

    // Draw initial centered logo
    canvasContext.globalCompositeOperation = "destination-out";
    canvasContext.drawImage(logoImage, initialX, initialY, initialWidth, initialHeight);
    canvasContext.globalCompositeOperation = "source-over";

    // Calculate the anchor point position on canvas at initial state
    const anchorCanvasX = initialX + initialWidth * options.originLeftRatio;
    const anchorCanvasY = initialY + initialHeight * options.originTopRatio;

    return {
      scale: (targetWidth: number) => {
        drawFill();

        if (!logoImage) return;

        const targetHeight = targetWidth / aspectRatio;

        // Calculate new position so anchor point stays at same canvas position
        const targetAnchorOffsetX = targetWidth * options.originLeftRatio;
        const targetAnchorOffsetY = targetHeight * options.originTopRatio;

        const x = anchorCanvasX - targetAnchorOffsetX;
        const y = anchorCanvasY - targetAnchorOffsetY;

        canvasContext.globalCompositeOperation = "destination-out";
        canvasContext.drawImage(logoImage, x, y, targetWidth, targetHeight);
        canvasContext.globalCompositeOperation = "source-over";
      },
    };
  };

  const loadLogoImage = () => {
    const svgData = new XMLSerializer().serializeToString(logoSvg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    const viewBox = logoSvg.getAttribute("viewBox");
    if (viewBox) {
      const [, , width, height] = viewBox.split(" ").map(Number);
      aspectRatio = width / height;
    } else {
      const svgWidth = logoSvg.width.baseVal.value || logoSvg.clientWidth;
      const svgHeight = logoSvg.height.baseVal.value || logoSvg.clientHeight;
      if (svgHeight > 0) {
        aspectRatio = svgWidth / svgHeight;
      }
    }

    img.onload = function () {
      logoImage = img;
      isImageLoaded = true;
      URL.revokeObjectURL(url);
      initializeCanvas();
      anchorScaler = createAnchoredScale(320, {
        originLeftRatio: SVG_SCALE_ANCHOR.originLeftRatio,
        originTopRatio: SVG_SCALE_ANCHOR.originTopRatio,
      });
      initializeAnimation();
    };

    img.src = url;
  };

  const initializeAnimation = () => {
    if (animeTL) {
      animeTL.kill();
      animeTL = null;
    }

    if (scrollTrig) {
      scrollTrig.kill();
      scrollTrig = null;
    }

    const widthAnimationState = { logoWidth: 320 };
    const widthFinalAnimationState = { logoWidth: 12000 };

    animeTL = gsap.timeline({});

    animeTL.fromTo(
      widthAnimationState,
      { ...widthAnimationState },
      { ...widthFinalAnimationState, ease: "none" }
    );

    scrollTrig = ScrollTrigger.create({
      animation: animeTL,
      scrub: true,
      trigger: scrollTarget,
      start: "top top",
      end: "70% bottom",
      onUpdate: () => {
        anchorScaler?.scale(widthAnimationState.logoWidth);
      },
    });
  };

  drawFill();
  loadLogoImage();

  window.addEventListener("resize", () => {
    initializeCanvas();
  });
};

initHeroVideoReveal();
