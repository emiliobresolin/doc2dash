import { useId } from "react";

import type { TableSummary } from "../../types/manifest";

interface ReviewRequiredStateProps {
  table: TableSummary;
  sourceLabel: string;
  onJumpToSource: () => void;
  compact?: boolean;
}

function formatNormalizationStatus(status: string) {
  if (!status) {
    return "Unknown";
  }

  return status
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

export function ReviewRequiredState({
  table,
  sourceLabel,
  onJumpToSource,
  compact = false,
}: ReviewRequiredStateProps) {
  const headingId = useId();
  const reasonHeadingId = useId();
  const title = compact
    ? "Charts stay locked until review"
    : "Review required before presentation";

  return (
    <section
      aria-labelledby={headingId}
      className={`review-panel${compact ? " review-panel--compact" : ""}`}
    >
      <div className="review-panel__header">
        <div>
          <p className="eyebrow">Review required</p>
          <h4 id={headingId}>{title}</h4>
        </div>
        <span className="badge badge--warning">
          Confidence: {Math.round(table.confidence * 100)}%
        </span>
      </div>

      <p className="card-copy">
        This table stays source-first until its structure is reviewed, so it is not
        promoted as presentation-ready by default.
      </p>

      <div className="badge-row review-panel__meta">
        <span className="badge">Source: {sourceLabel}</span>
        <span className="badge">
          Transformation: {formatNormalizationStatus(table.normalization.status)}
        </span>
      </div>

      <div aria-labelledby={reasonHeadingId} className="review-panel__reasons">
        <p className="review-panel__reasons-label" id={reasonHeadingId}>
          Why we paused promotion
        </p>
        <ul>
          {table.detectionReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <p className="provenance-copy">{table.normalization.reason}</p>

      <button className="secondary-button" onClick={onJumpToSource} type="button">
        Jump to source rows
      </button>
    </section>
  );
}
