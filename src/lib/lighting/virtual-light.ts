import type { CSSProperties } from "react";

import type { LightFrame } from "@/lib/performance/mapper";

export function virtualLightStyle(light: LightFrame): CSSProperties {
  const primary = `hsl(${light.hue} ${light.saturation}% ${light.brightness}%)`;
  const secondaryHue = (light.hue + 46) % 360;
  const secondary = `hsl(${secondaryHue} ${Math.max(20, light.saturation - 16)}% ${Math.max(7, light.brightness - 12)}%)`;

  return {
    backgroundImage: `radial-gradient(circle at 22% 22%, ${primary}, transparent 44%), radial-gradient(circle at 84% 76%, ${secondary}, transparent 48%)`,
    transition: `background-image ${light.transitionMs}ms ease, background-color ${light.transitionMs}ms ease`,
  };
}
