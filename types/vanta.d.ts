declare module "vanta/dist/vanta.globe.min" {
  import type * as THREE from "three";

  export type VantaGlobeOptions = {
    el: HTMLElement;
    THREE: typeof THREE;
    mouseControls?: boolean;
    touchControls?: boolean;
    gyroControls?: boolean;
    minHeight?: number;
    minWidth?: number;
    scale?: number;
    scaleMobile?: number;
    color?: number;
    color2?: number;
    backgroundColor?: number;
    size?: number;
    points?: number;
    maxDistance?: number;
    spacing?: number;
    showDots?: boolean;
  };

  export type VantaEffect = {
    destroy: () => void;
    setOptions: (opts: Partial<VantaGlobeOptions>) => void;
  };

  const GLOBE: (options: VantaGlobeOptions) => VantaEffect;
  export default GLOBE;
}
