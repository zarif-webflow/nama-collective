import { getHtmlElement } from "@taj-wf/utils";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SELECTORS = {
  canvas: "canvas[hero-video-reveal=canvas]",
  scrollTarget: "[hero-video-reveal=scroll-target]",
  logo: "svg[hero-video-reveal=logo]",
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

  if (!canvas || !scrollTarget || !logoSvg) return;

  const canvasParent = canvas.parentElement as HTMLElement;
  const canvasContext = canvas.getContext("2d") as CanvasRenderingContext2D;

  //   Image State
  let logoImage: HTMLImageElement | null = null;
  let aspectRatio = 1;
  let isImageLoaded = false;

  const initializeCanvas = () => {
    const { width, height } = canvasParent.getBoundingClientRect();
    canvas.width = width + 1;
    canvas.height = height + 1;
    drawMaskWithSize(300);
  };

  const drawFill = () => {
    canvasContext.fillStyle = "black";
    canvasContext.fillRect(0, 0, canvas.width, canvas.height);
  };

  const drawMaskWithSize = (logoWidth: number) => {
    drawFill();

    if (!logoImage || !isImageLoaded) return;

    const logoHeight = logoWidth / aspectRatio;
    const x = (canvas.width - logoWidth) / 2;
    const y = (canvas.height - logoHeight) / 2;

    canvasContext.globalCompositeOperation = "destination-out";
    canvasContext.drawImage(logoImage, x, y, logoWidth, logoHeight);
    canvasContext.globalCompositeOperation = "source-over";
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
    };

    img.src = url;
  };

  drawFill();
  loadLogoImage();
};

initHeroVideoReveal();
