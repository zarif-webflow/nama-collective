import { getHtmlElement } from "@taj-wf/utils";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SELECTORS = {
  canvas: "canvas[hero-video-reveal=canvas]",
  scrollTarget: "[hero-video-reveal=scroll-target]",
  logo: "svg[hero-video-reveal=logo]",
  logoPlaceholder: "svg[hero-video-reveal=logo-placeholder]",
  placeholder: "[hero-video-reveal=placeholder]",
  video: "video[hero-video-reveal=video]",
};

const getVarBGColor = () => {
  const root = document.documentElement;
  const videoUpperBg = getComputedStyle(root)
    .getPropertyValue("--_hero-scroll-animation---colors--video-upper-bg")
    .trim();

  return videoUpperBg || "#ffffff";
};

const getActiveScrollPercentageColor = () => {
  const root = document.documentElement;
  const activeScrollPercentage = getComputedStyle(root)
    .getPropertyValue("--_hero-scroll-animation---sizes--active-scroll-percentage")
    .trim();

  return activeScrollPercentage || "90%";
};

const SVG_SCALE_ANCHOR = {
  originLeftRatio: 0.63,
  originTopRatio: 0.717,
};

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
  //   @ts-expect-error SVGSVGElement type
  const logoPlaceholderSvg = getHtmlElement<HTMLElement>({
    selector: SELECTORS.logoPlaceholder,
    log: "error",
  }) as SVGSVGElement;
  const placeholderEl = getHtmlElement<HTMLElement>({
    selector: SELECTORS.placeholder,
    log: "error",
  });
  const videoEl = getHtmlElement<HTMLVideoElement>({
    selector: SELECTORS.video,
    log: "error",
  });

  if (!canvas || !scrollTarget || !logoSvg || !logoPlaceholderSvg || !placeholderEl) return;

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

  const hidePlaceholder = () => {
    gsap.to(placeholderEl, { opacity: 0, duration: 0.2 });
  };

  const getLogoWidth = () => {
    const logoRect = logoPlaceholderSvg.getBoundingClientRect();
    return logoRect.width;
  };

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

  const paintCanvasInitAnimation = ({ isFirstTime }: { isFirstTime?: boolean }) => {
    initializeCanvas();
    const initialLogoSize = getLogoWidth() || 320;
    anchorScaler = createAnchoredScale(initialLogoSize, {
      originLeftRatio: SVG_SCALE_ANCHOR.originLeftRatio,
      originTopRatio: SVG_SCALE_ANCHOR.originTopRatio,
    });
    anchorScaler?.scale(initialLogoSize);
    initializeAnimation({ initialLogoSize: initialLogoSize, isFirstTime });
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

      paintCanvasInitAnimation({ isFirstTime: true });
    };

    img.src = url;
  };

  const initializeAnimation = ({
    initialLogoSize,
    isFirstTime,
  }: {
    initialLogoSize: number;
    isFirstTime?: boolean;
  }) => {
    if (animeTL) {
      animeTL.kill();
      animeTL = null;
    }

    if (scrollTrig) {
      scrollTrig.kill();
      scrollTrig = null;
    }

    const widthAnimationState = { logoWidth: initialLogoSize };
    const widthFinalAnimationState = { logoWidth: canvas.height * 11 };
    const activeScrollPercentage = getActiveScrollPercentageColor();

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
      end: `${activeScrollPercentage} bottom`,
      onUpdate: () => {
        anchorScaler?.scale(widthAnimationState.logoWidth);
      },
    });

    if (isFirstTime) {
      hidePlaceholder();
    }
  };

  drawFill();
  loadLogoImage();
  videoEl?.play();

  window.addEventListener("resize", () => {
    paintCanvasInitAnimation({ isFirstTime: false });
    videoEl?.play();
  });
};

initHeroVideoReveal();
