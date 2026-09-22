import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicRoomState, RevealedCardInfo } from "@mystery/shared";

type EffectSound = "dice" | "move" | "suggestion" | "reveal" | "victory";
const SOUND_SETTING = "mystery-manor-sound-enabled";

let audioContext: AudioContext | null = null;
const getAudioContext = () => {
  audioContext ??= new AudioContext();
  return audioContext;
};

function tone(context: AudioContext, frequency: number, start: number, duration: number, volume = 0.035) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + .012);
  gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + .02);
}

function playSound(sound: EffectSound) {
  try {
    const context = getAudioContext();
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    if (sound === "dice") [250, 330, 440].forEach((frequency, index) => tone(context, frequency, now + index * .055, .07, .027));
    if (sound === "move") tone(context, 360, now, .08, .025);
    if (sound === "suggestion") { tone(context, 260, now, .16); tone(context, 310, now + .11, .2); }
    if (sound === "reveal") { tone(context, 480, now, .12); tone(context, 660, now + .11, .22); }
    if (sound === "victory") [392, 494, 587, 784].forEach((frequency, index) => tone(context, frequency, now + index * .12, .22, .04));
  } catch {
    // Audio can be blocked by a browser or unavailable in a test environment.
  }
}

export function useGameEffects(room: PublicRoomState | null, revealedCard: RevealedCardInfo | null) {
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem(SOUND_SETTING) !== "false");
  const prior = useRef<{ dice: number | null; positions: string; suggestionId: string | null; gameOver: boolean; revealedId: string | null } | null>(null);
  const play = useCallback((sound: EffectSound) => { if (soundEnabled) playSound(sound); }, [soundEnabled]);
  const toggleSound = useCallback(() => {
    setSoundEnabled((current) => {
      const next = !current;
      localStorage.setItem(SOUND_SETTING, String(next));
      if (next) playSound("reveal");
      return next;
    });
  }, []);

  useEffect(() => {
    const snapshot = {
      dice: room?.diceResult ?? null,
      positions: room?.players.map((player) => `${player.playerId}:${player.position ?? ""}`).join("|") ?? "",
      suggestionId: room?.activeSuggestion?.suggestionId ?? null,
      gameOver: room?.status === "GAME_OVER",
      revealedId: revealedCard?.suggestionId ?? null
    };
    const previous = prior.current;
    if (previous) {
      if (snapshot.dice !== null && snapshot.dice !== previous.dice) play("dice");
      if (room?.status === "IN_GAME" && previous.positions && snapshot.positions !== previous.positions) play("move");
      if (snapshot.suggestionId && snapshot.suggestionId !== previous.suggestionId) play("suggestion");
      if (snapshot.revealedId && snapshot.revealedId !== previous.revealedId) play("reveal");
      if (snapshot.gameOver && !previous.gameOver) play("victory");
    }
    prior.current = snapshot;
  }, [play, revealedCard?.suggestionId, room]);

  return { soundEnabled, toggleSound };
}
