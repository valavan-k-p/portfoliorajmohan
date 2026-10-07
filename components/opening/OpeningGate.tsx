/** One abstract pulse line: sixteen wavelengths over 480 units, so shifting by half loops seamlessly. */
const PULSE_PATH = (() => {
  let d = "M0 6";
  for (let x = 0; x < 480; x += 30) d += ` Q${x + 7.5} 2 ${x + 15} 6 T${x + 30} 6`;
  return d;
})();

type OpeningGateProps = {
  onChoose: (withMusic: boolean) => void;
  onMusicIntent: () => void;
};

/**
 * The pause before the film: a title card and two ways of entering it.
 * Choreography lives in CinematicOpening; this is markup only.
 */
export function OpeningGate({ onChoose, onMusicIntent }: OpeningGateProps) {
  return (
    <div className="op-gate">
      {/* The closed frame. On a choice it parts along the editorial line to reveal the film. */}
      <div className="gate-panel gate-panel--top" aria-hidden="true" />
      <div className="gate-panel gate-panel--bottom" aria-hidden="true" />
      <div className="gate-glow" aria-hidden="true" />

      <div className="gate-stack">
        <span className="gate-line" aria-hidden="true" />
        <p className="gate-name">Rajmohan</p>
        <p className="gate-tagline">A Public Service Journey</p>

        <div className="gate-choice" role="group" aria-labelledby="gate-heading">
          <p id="gate-heading" className="gate-heading">
            Enter the experience
          </p>
          <p className="gate-hint">Choose how you would like to begin.</p>

          <div className="gate-options">
            <button
              type="button"
              className="gate-option gate-option--music"
              onClick={() => onChoose(true)}
              onPointerEnter={onMusicIntent}
              onFocus={onMusicIntent}
            >
              <span className="gate-option-label">With music</span>
              <span className="gate-rule" aria-hidden="true">
                <span className="gate-rule-line" />
                <span className="gate-pulse">
                  <svg viewBox="0 0 480 12" preserveAspectRatio="none" focusable="false">
                    <path d={PULSE_PATH} vectorEffect="non-scaling-stroke" />
                  </svg>
                </span>
              </span>
            </button>

            <button type="button" className="gate-option" onClick={() => onChoose(false)}>
              <span className="gate-option-label">Without music</span>
              <span className="gate-rule" aria-hidden="true">
                <span className="gate-rule-line" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
