import type { CSSProperties } from "react";

import type { LightFrame } from "@/lib/performance/mapper";
import type { LightMotionMode } from "@/lib/lighting/light-motion";

export function virtualLightStyle(
  light: LightFrame,
  motion: LightMotionMode = "flow",
): CSSProperties {
  const primary = `hsl(${light.hue} ${light.saturation}% ${light.brightness}%)`;
  const secondaryHue = (light.hue + 46) % 360;
  const secondary = `hsl(${secondaryHue} ${Math.max(20, light.saturation - 16)}% ${Math.max(7, light.brightness - 12)}%)`;

  const visualTransitionMs = motion === "flow"
    ? light.transitionMs
    : motion === "color-steps"
      ? 140
      : 60;

  return {
    "--light-primary": primary,
    "--light-secondary": secondary,
    "--light-transition": `${visualTransitionMs}ms`,
    backgroundImage: `radial-gradient(circle at 22% 22%, ${primary}, transparent 44%), radial-gradient(circle at 84% 76%, ${secondary}, transparent 48%)`,
    transition: `background-image ${visualTransitionMs}ms linear, background-color ${visualTransitionMs}ms linear`,
  } as CSSProperties;
}
