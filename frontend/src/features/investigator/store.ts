import { useState, useEffect } from "react";
import { type InvestigationResult } from "./mock-api";

export type InvestigationState = {
  text: string;
  sample: boolean;
  question: string;
  asked: string;
  result: InvestigationResult | null;
  history: InvestigationResult[];
  processing: boolean;
  step: number;
};

const defaultState: InvestigationState = {
  text: "",
  sample: false,
  question: "",
  asked: "",
  result: null,
  history: [],
  processing: false,
  step: 0,
};

let globalState: InvestigationState = { ...defaultState };
const listeners = new Set<() => void>();

export function setGlobalState(partial: Partial<InvestigationState>) {
  globalState = { ...globalState, ...partial };
  listeners.forEach((l) => l());
}

export function useInvestigationStore() {
  const [state, setState] = useState(globalState);
  useEffect(() => {
    const l = () => setState(globalState);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return [state, setGlobalState] as const;
}
