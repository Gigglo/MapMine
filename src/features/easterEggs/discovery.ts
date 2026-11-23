import { create } from "zustand";
import { recordEasterEgg } from "../../database/repository";
import type { Egg } from "./catalog";

export const useEggToast = create<{ egg: Egg | null }>(() => ({ egg: null }));

export async function discoverEgg(egg: Egg, replay = false) {
  try {
    if (await recordEasterEgg(egg.id) || replay) useEggToast.setState({ egg });
  } catch {
    if (replay) useEggToast.setState({ egg });
  }
}
