"use client";

/* ═══════════════════════════════════════════════════════════════════════
   AGENT LATENCY ANIMATION — turns "how long has this been loading" into a
   small side-scroller instead of a bare spinner, so long AI latency reads as
   intentional rather than broken:

     0–2s   running
     2–5s   obstacle / searching
     5–10s  climbing
     >10s   campfire, "still working…"
     answer arrives -> jump -> treasure chest -> unmounts
     request fails  -> stumble -> unmounts (instead of the cheerful jump)

   Pure inline SVG + CSS keyframes (no game engine) — see the "Option A —
   SVG" sketch this was speced from. Driven purely by elapsed wall-clock
   time since the caller's `isLoading` flipped true, so it needs no
   knowledge of *why* a request is slow, just how long it's been running.

   Two extra beats layer on top of that same character without a new
   component: `didError` swaps the post-answer flourish from
   jump/treasure-chest to a stumble, and `isTyping` (only consulted while
   idle — not mid-request) gives the character a small "listening" pose so
   it reacts to the user composing a message instead of only appearing once
   a request is already in flight.
   ═══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";

export type LatencyStage =
  | "running"
  | "obstacle"
  | "climbing"
  | "campfire"
  | "jump"
  | "complete"
  | "error"
  | "typing";

const STAGE_THRESHOLDS_MS = { obstacle: 2000, climbing: 5000, campfire: 10000 };
/** How long the post-answer "jump" + "treasure chest" (or stumble) beats
 *  stay on screen before the caller's own content (the real message) takes over. */
const JUMP_HOLD_MS = 550;
const COMPLETE_HOLD_MS = 700;
const ERROR_HOLD_MS = 1100;

/** Elapsed-time -> stage state machine, plus a brief jump/complete (or
 * stumble, on error) flourish when `isLoading` flips back to false. Callers
 * just render whatever stage this returns; they don't need to track timers
 * themselves. `didError` should reflect whether the request that just
 * finished failed — read at the moment `isLoading` flips false. */
export function useAgentLatencyStage(isLoading: boolean, didError = false): { stage: LatencyStage; visible: boolean } {
  const [stage, setStage] = useState<LatencyStage>("running");
  const [visible, setVisible] = useState(false);
  const startRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const wasLoadingRef = useRef(false);
  const didErrorRef = useRef(false);
  didErrorRef.current = didError;

  useEffect(() => {
    if (isLoading && !wasLoadingRef.current) {
      // Loading just started — reset the clock and begin ticking stages.
      wasLoadingRef.current = true;
      startRef.current = Date.now();
      setStage("running");
      setVisible(true);
      intervalRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startRef.current;
        if (elapsed >= STAGE_THRESHOLDS_MS.campfire) setStage("campfire");
        else if (elapsed >= STAGE_THRESHOLDS_MS.climbing) setStage("climbing");
        else if (elapsed >= STAGE_THRESHOLDS_MS.obstacle) setStage("obstacle");
        else setStage("running");
      }, 250);
    } else if (!isLoading && wasLoadingRef.current) {
      // Loading just finished — play the jump/treasure beat (or a stumble
      // if the request errored out), then hide.
      wasLoadingRef.current = false;
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (didErrorRef.current) {
        setStage("error");
        const t1 = window.setTimeout(() => setVisible(false), ERROR_HOLD_MS);
        return () => window.clearTimeout(t1);
      }
      setStage("jump");
      const t1 = window.setTimeout(() => setStage("complete"), JUMP_HOLD_MS);
      const t2 = window.setTimeout(() => setVisible(false), JUMP_HOLD_MS + COMPLETE_HOLD_MS);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    }
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLoading]);

  return { stage, visible };
}

const STAGE_LABEL: Record<LatencyStage, string> = {
  running: "Thinking…",
  obstacle: "Searching…",
  climbing: "Digging deeper…",
  campfire: "Still working…",
  jump: "Got it!",
  complete: "Done",
  error: "Hit a snag — try again",
  typing: "Listening…",
};

/** Runner sprite — a small stylized figure whose pose/position changes per
 * stage. Kept as one component so every stage shares the same "character".
 * "error" places it back at the obstacle marker (x=38) — reads as having
 * tripped on the same obstacle rendered below, rather than a new prop. */
function Runner({ stage }: { stage: LatencyStage }) {
  const x =
    stage === "running" || stage === "typing" ? 8 :
    stage === "obstacle" ? 30 :
    stage === "error" ? 38 :
    stage === "climbing" ? 46 :
    stage === "campfire" ? 60 :
    stage === "jump" ? 74 : 74;

  const isError = stage === "error";
  const bodyColor = isError ? "#dc2626" : "#2563eb";
  const legColor = isError ? "#991b1b" : "#1e3a8a";
  // Stumble: whole figure tips forward instead of the upright jump pose.
  const rotate = isError ? -22 : 0;

  return (
    <g
      className={
        stage === "running" ? "agentlat-bob" :
        stage === "typing" ? "agentlat-idle-bob" :
        stage === "jump" ? "agentlat-jump" : undefined
      }
      style={{
        transform: `translateX(${x}px) rotate(${rotate}deg)`,
        transformOrigin: "0px 21px",
        transition: "transform 600ms cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      {/* head */}
      <circle cx="0" cy="8" r="4.5" fill={bodyColor} />
      {/* body */}
      <line x1="0" y1="12.5" x2="0" y2="21" stroke={bodyColor} strokeWidth="2.4" strokeLinecap="round" />
      {/* arms */}
      <line
        x1="0" y1="15" x2={stage === "jump" ? -5 : isError ? -6 : -4} y2={stage === "jump" ? 8 : isError ? 12 : 19}
        stroke={bodyColor} strokeWidth="2" strokeLinecap="round"
        className={stage === "running" ? "agentlat-swing-a" : undefined}
      />
      <line
        x1="0" y1="15" x2={stage === "jump" ? 5 : isError ? 2 : 4} y2={stage === "jump" ? 8 : isError ? 11 : 19}
        stroke={bodyColor} strokeWidth="2" strokeLinecap="round"
        className={stage === "running" ? "agentlat-swing-b" : undefined}
      />
      {/* legs */}
      <line
        x1="0" y1="21" x2={stage === "jump" ? -4 : -3.5} y2={stage === "jump" ? 24 : 28}
        stroke={legColor} strokeWidth="2.4" strokeLinecap="round"
        className={stage === "running" ? "agentlat-leg-a" : undefined}
      />
      <line
        x1="0" y1="21" x2={stage === "jump" ? 4 : 3.5} y2={stage === "jump" ? 24 : 28}
        stroke={legColor} strokeWidth="2.4" strokeLinecap="round"
        className={stage === "running" ? "agentlat-leg-b" : undefined}
      />
    </g>
  );
}

/**
 * Self-contained chat-bubble version: owns its own "assistant is thinking"
 * bubble chrome and mount/unmount lifecycle. Must be rendered
 * unconditionally by the caller (not wrapped in `{isLoading && ...}`) — it
 * decides its own visibility internally so it can stay mounted just long
 * enough to play the jump/treasure-chest (or stumble) beat after `isLoading`
 * flips back to false, instead of vanishing the instant loading ends.
 *
 * `didError` — pass whether the request that just finished failed, read at
 * the moment `isLoading` flips false (e.g. from a ref/state your catch block
 * sets). Swaps the celebratory finish for a brief stumble instead.
 *
 * `isTyping` — pass whether the user currently has unsent text in the input.
 * Only consulted while idle (not mid-request or mid-flourish) — gives the
 * character a small "listening" pose so it visibly reacts to the user
 * composing, instead of only ever appearing once a request is in flight.
 */
export default function AgentLatencyAnimation({
  isLoading,
  didError = false,
  isTyping = false,
}: {
  isLoading: boolean;
  didError?: boolean;
  isTyping?: boolean;
}) {
  const { stage, visible } = useAgentLatencyStage(isLoading, didError);

  if (!visible) {
    if (!isTyping) return null;
    return (
      <div className="flex justify-start">
        <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-md bg-zinc-50 border border-zinc-200 flex items-center gap-2.5 opacity-70" role="status" aria-live="off">
          <svg width="92" height="40" viewBox="0 0 92 40" className="shrink-0 overflow-visible">
            <line x1="0" y1="32" x2="92" y2="32" stroke="#e4e4e7" strokeWidth="1.5" />
            <Runner stage="typing" />
          </svg>
          <span className="text-xs text-zinc-400 font-medium">{STAGE_LABEL.typing}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={`px-3.5 py-2.5 rounded-2xl rounded-bl-md border flex items-center gap-2.5 transition-colors ${
          stage === "error" ? "bg-red-50 border-red-200" : "bg-zinc-50 border-zinc-200"
        }`}
        role="status"
        aria-live="polite"
      >
      <svg width="92" height="40" viewBox="0 0 92 40" className="shrink-0 overflow-visible">
        {/* ground line */}
        <line x1="0" y1="32" x2="92" y2="32" stroke={stage === "error" ? "#fecaca" : "#e4e4e7"} strokeWidth="1.5" />

        {(stage === "obstacle" || stage === "error") && (
          <g transform="translate(38,20)">
            <rect x="-4" y="0" width="8" height="12" rx="1.5" fill={stage === "error" ? "#ef4444" : "#f59e0b"} className={stage === "obstacle" ? "agentlat-pulse" : undefined} />
          </g>
        )}

        {stage === "error" && (
          <text x="38" y="12" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#dc2626" className="agentlat-pop">!</text>
        )}

        {(stage === "climbing" || stage === "campfire" || stage === "jump" || stage === "complete") && (
          <path d="M 56 32 L 62 22 L 68 32" fill="none" stroke="#d4d4d8" strokeWidth="2" strokeLinejoin="round" />
        )}

        {(stage === "campfire" || stage === "jump" || stage === "complete") && (
          <g transform="translate(66,24)">
            <path d="M0 8 Q -2 4 0 0 Q 2 4 0 8" fill="#f97316" className="agentlat-flicker" />
            <path d="M0 8 L -3 8 L 3 8 Z" fill="#78350f" />
          </g>
        )}

        {stage === "complete" ? (
          <g transform="translate(74,18)" className="agentlat-pop">
            <rect x="-6" y="-2" width="12" height="9" rx="1.5" fill="#a16207" />
            <rect x="-6" y="-6" width="12" height="5" rx="1.5" fill="#ca8a04" />
            <circle cx="0" cy="-4" r="1.6" fill="#fde047" />
          </g>
        ) : (
          <Runner stage={stage} />
        )}
      </svg>
      <span className={`text-xs font-medium ${stage === "error" ? "text-red-600" : "text-zinc-500"}`}>{STAGE_LABEL[stage]}</span>
      </div>
    </div>
  );
}
