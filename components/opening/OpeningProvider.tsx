"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Curtain, type CurtainHandle } from "./Curtain";

/** Set once the visitor has entered, so coming back to the home page skips straight to the chooser. */
const ENTERED_KEY = "rajmohan:entered";

const remember = (value: boolean) => {
  try {
    if (value) sessionStorage.setItem(ENTERED_KEY, "1");
    else sessionStorage.removeItem(ENTERED_KEY);
  } catch {
    // Storage unavailable (private mode): the opening simply plays again.
  }
};

type OpeningState = {
  entered: boolean;
  /** True when the visitor came back this session and the opening was skipped. */
  returning: boolean;
  enter: () => void;
  replay: () => void;
  /** Starts loading the 3D curtain so it is ready by the time the visitor enters. */
  prepareCurtain: () => void;
};

const OpeningContext = createContext<OpeningState | null>(null);

export function useOpening() {
  const value = useContext(OpeningContext);
  if (!value) throw new Error("useOpening must be used inside <OpeningProvider>");
  return value;
}

export function OpeningProvider({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false);
  const [returning, setReturning] = useState(false);
  const curtain = useRef<CurtainHandle>(null);
  // Entering the site goes through the curtain: the page swaps while it is closed.
  const enter = useCallback(() => {
    const done = () => {
      remember(true);
      setEntered(true);
    };
    if (curtain.current) curtain.current.play(done);
    else done();
  }, []);
  const replay = useCallback(() => {
    remember(false);
    setReturning(false);
    setEntered(false);
  }, []);

  // Back from a portfolio page in the same session: go straight to the chooser.
  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(ENTERED_KEY) === "1";
    } catch {
      // Storage unavailable: play the opening.
    }
    if (seen) {
      setReturning(true);
      setEntered(true);
    }
  }, []);
  const prepareCurtain = useCallback(() => curtain.current?.prepare(), []);

  // The opening is a single fixed frame: nothing behind it should scroll while it plays.
  useEffect(() => {
    document.documentElement.classList.toggle("op-lock", !entered);
    return () => document.documentElement.classList.remove("op-lock");
  }, [entered]);

  const value = useMemo(
    () => ({ entered, returning, enter, replay, prepareCurtain }),
    [entered, returning, enter, replay, prepareCurtain],
  );
  return (
    <OpeningContext.Provider value={value}>
      {children}
      <Curtain ref={curtain} />
    </OpeningContext.Provider>
  );
}

/** Holds the main experience behind the opening: inert until the visitor enters, then revealed. */
export function MainGate({ children }: { children: ReactNode }) {
  const { entered, returning } = useOpening();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Set after hydration rather than rendered, so the page stays usable without JavaScript.
    node.inert = !entered;
    if (entered) node.querySelector<HTMLElement>("#main")?.focus({ preventScroll: true });
  }, [entered]);

  return (
    <div ref={ref} className="main-gate" data-entered={entered} data-returning={returning}>
      {children}
    </div>
  );
}

export function ReplayOpening() {
  const { replay } = useOpening();
  return (
    <button type="button" onClick={replay} className="film-link">
      <span className="film-link-line" aria-hidden="true" />
      <span className="film-link-label">Replay opening</span>
      <span className="film-link-line" aria-hidden="true" />
    </button>
  );
}
