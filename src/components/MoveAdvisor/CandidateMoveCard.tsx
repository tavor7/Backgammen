import type { RankedCandidate } from '../../ai/moveAdvisor';

function formatSequence(candidate: RankedCandidate): string {
  return candidate.sequence.map((m) => `${m.from}/${m.to}`).join(' ');
}

const RATING_CLASS: Record<RankedCandidate['rating'], string> = {
  Excellent: 'rating--excellent',
  Strong: 'rating--strong',
  Playable: 'rating--playable',
  Risky: 'rating--risky',
};

interface CandidateMoveCardProps {
  candidate: RankedCandidate;
  isPreviewing: boolean;
  onPreview: () => void;
  onStopPreview: () => void;
  onPlay: () => void;
}

export function CandidateMoveCard({ candidate, isPreviewing, onPreview, onStopPreview, onPlay }: CandidateMoveCardProps) {
  return (
    <div className={`candidate-card${isPreviewing ? ' candidate-card--previewing' : ''}`}>
      <div className="candidate-card__header">
        <span className="candidate-card__rank">#{candidate.rank}</span>
        <span className="candidate-card__moves">{formatSequence(candidate)}</span>
        <span className={`rating-badge ${RATING_CLASS[candidate.rating]}`}>{candidate.rating}</span>
      </div>
      <p className="candidate-card__summary">{candidate.summary}</p>
      {candidate.pros.length > 0 && (
        <ul className="candidate-card__pros">
          {candidate.pros.map((p, i) => <li key={i}>+ {p}</li>)}
        </ul>
      )}
      {candidate.cons.length > 0 && (
        <ul className="candidate-card__cons">
          {candidate.cons.map((c, i) => <li key={i}>− {c}</li>)}
        </ul>
      )}
      <div className="candidate-card__actions">
        {isPreviewing ? (
          <button type="button" className="btn btn--small" onClick={onStopPreview}>Back to Current Position</button>
        ) : (
          <button type="button" className="btn btn--small" onClick={onPreview}>Preview</button>
        )}
        <button type="button" className="btn btn--small btn--primary" onClick={onPlay}>Play Move</button>
      </div>
    </div>
  );
}
