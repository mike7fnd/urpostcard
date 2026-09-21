import type { DesignConfig } from "@/lib/types";

/**
 * Art direction for the unauthenticated landing page only.
 *
 * Not postcard data — a signed-out visitor cannot read postcard_templates (nor
 * should they), so the hero needs a design of its own. Every real postcard in
 * the app renders a template row from the database.
 */
export const HERO_DESIGN: DesignConfig = {
  paper: "#faf7f0",
  ink: "#17160f",
  accent: "#a8563c",
  texture: "linen",
  grain: 0.24,
  edge: "hairline",
  rule: "#ded7c7",
  typography: { family: "sans", tracking: "0.02em" },
  stamp: { bg: "#efe9dc", ink: "#6b665e", label: "POST" },
  scene: {
    type: "dunes",
    palette: ["#f0e2c4", "#d3ae76", "#a07c48", "#6f5634"],
  },
};
