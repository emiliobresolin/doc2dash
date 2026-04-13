interface PresenterToolbarProps {
  enabled: boolean;
  canPresent: boolean;
  sectionLabel: string;
  sectionPosition: string;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function PresenterToolbar({
  enabled,
  canPresent,
  sectionLabel,
  sectionPosition,
  onToggle,
  onPrevious,
  onNext,
}: PresenterToolbarProps) {
  return (
    <div className="presenter-toolbar" aria-label="Presenter controls">
      <button
        className={`presenter-toggle${enabled ? " presenter-toggle--active" : ""}`}
        onClick={onToggle}
        type="button"
        disabled={!canPresent}
      >
        {enabled ? "Exit presenter mode" : "Enter presenter mode"}
      </button>
      <div className="presenter-status" aria-live="polite">
        <span>{enabled ? `Focus: ${sectionLabel}` : "Analysis mode"}</span>
        <span>{enabled ? sectionPosition : "Presenter mode available"}</span>
      </div>
      <div className="presenter-nav">
        <button onClick={onPrevious} type="button" disabled={!enabled}>
          Previous
        </button>
        <button onClick={onNext} type="button" disabled={!enabled}>
          Next
        </button>
      </div>
    </div>
  );
}
