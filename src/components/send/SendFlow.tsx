"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { DesignStep } from "@/components/send/DesignStep";
import { LaunchStep } from "@/components/send/LaunchStep";
import { RecipientStep } from "@/components/send/RecipientStep";
import { ReviewStep } from "@/components/send/ReviewStep";
import { WriteStep } from "@/components/send/WriteStep";
import { humanError } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import type {
  JourneyPreview,
  PostcardTemplate,
  PostcardView,
  Profile,
  PublicProfile,
} from "@/lib/types";

type Step = "recipient" | "design" | "write" | "review" | "launch";

const ORDER: Step[] = ["recipient", "design", "write", "review", "launch"];

export function SendFlow({
  profile,
  templates,
}: {
  profile: Profile;
  templates: PostcardTemplate[];
}) {
  const [step, setStep] = useState<Step>("recipient");
  const [recipient, setRecipient] = useState<PublicProfile | null>(null);
  const [preview, setPreview] = useState<JourneyPreview | null>(null);
  const [template, setTemplate] = useState<PostcardTemplate | null>(templates[0] ?? null);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<PostcardView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const direction = ORDER.indexOf(step);

  async function send() {
    if (!recipient || !template) return;
    setError(null);

    const supabase = createClient();
    const { data: id, error: sendError } = await supabase.rpc("send_postcard", {
      p_recipient_username: recipient.username,
      p_template_id: template.id,
      p_message: message.trim(),
    });

    if (sendError || !id) {
      setError(humanError(sendError));
      return;
    }

    // The card the animation will represent comes back from the database,
    // with the duration and arrival time the server decided on.
    const { data: card, error: readError } = await supabase.rpc("get_postcard", {
      p_id: id as string,
    });

    if (readError || !card) {
      setError(humanError(readError));
      return;
    }

    setSent(card as PostcardView);
    setStep("launch");
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={step}
        initial={{ opacity: 0, y: step === "launch" ? 0 : 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: step === "launch" ? 0.7 : 0.32, ease: [0.22, 1, 0.36, 1] }}
        data-step-index={direction}
      >
        {step === "recipient" ? (
          <RecipientStep
            recipient={recipient}
            preview={preview}
            onPick={(person, journey) => {
              setRecipient(person);
              setPreview(journey);
            }}
            onClear={() => {
              setRecipient(null);
              setPreview(null);
            }}
            onNext={() => setStep("design")}
          />
        ) : null}

        {step === "design" ? (
          <DesignStep
            templates={templates}
            selected={template}
            onSelect={setTemplate}
            onBack={() => setStep("recipient")}
            onNext={() => setStep("write")}
          />
        ) : null}

        {step === "write" && template && recipient ? (
          <WriteStep
            design={template.design_config}
            to={recipient.username}
            from={profile.username ?? ""}
            message={message}
            onChange={setMessage}
            onBack={() => setStep("design")}
            onNext={() => setStep("review")}
          />
        ) : null}

        {step === "review" && template && recipient ? (
          <ReviewStep
            design={template.design_config}
            to={recipient.username}
            from={profile.username ?? ""}
            message={message}
            preview={preview}
            error={error}
            onBack={() => setStep("write")}
            onSend={send}
          />
        ) : null}

        {step === "launch" && sent ? <LaunchStep card={sent} /> : null}
      </motion.div>
    </AnimatePresence>
  );
}
