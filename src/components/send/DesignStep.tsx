"use client";

import { motion } from "framer-motion";

import { Postcard } from "@/components/postcard/Postcard";
import { StepShell } from "@/components/send/StepShell";
import { Button } from "@/components/ui/Button";
import type { PostcardTemplate } from "@/lib/types";

export function DesignStep({
  templates,
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  templates: PostcardTemplate[];
  selected: PostcardTemplate | null;
  onSelect: (template: PostcardTemplate) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <StepShell title="Step two" onBack={onBack}>
      <h1 className="font-display text-[30px] leading-tight tracking-tight text-ink sm:text-[34px]">
        Pick one off the rack.
      </h1>

      <div
        className="no-scrollbar -mx-6 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-6 pt-3"
        role="radiogroup"
        aria-label="Postcard design"
      >
        {templates.map((template) => {
          const active = selected?.id === template.id;

          return (
            <motion.button
              key={template.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(template)}
              className="w-[76%] shrink-0 snap-center rounded-[var(--radius-card)] sm:w-[54%] lg:w-[44%]"
              animate={{
                scale: active ? 1 : 0.955,
                opacity: active ? 1 : 0.68,
                y: active ? -4 : 0,
              }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: active ? 0.99 : 0.94 }}
            >
              <div
                className="rounded-[var(--radius-card)]"
                style={{
                  boxShadow: active
                    ? "var(--shadow-lift-lg)"
                    : "var(--shadow-lift-sm)",
                }}
              >
                <Postcard design={template.design_config} face="front" />
              </div>

              <p className="mt-4 text-left text-[15px] text-ink">{template.name}</p>
              <p className="mt-0.5 text-left text-[13px] leading-snug text-ink-faint">
                {template.description}
              </p>
            </motion.button>
          );
        })}
      </div>

      <div className="mt-6">
        <Button onClick={onNext} disabled={!selected} className="w-full sm:w-auto">
          Start writing
        </Button>
      </div>
    </StepShell>
  );
}
