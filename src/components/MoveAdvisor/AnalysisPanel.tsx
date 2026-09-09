import type { RankedCandidate } from '../../ai/moveAdvisor';
import { useT } from '../../i18n/useT';
import { CandidateMoveCard } from './CandidateMoveCard';

interface AnalysisPanelProps {
  open: boolean;
  loading: boolean;
  candidates: RankedCandidate[];
  previewCandidate: RankedCandidate | null;
  onClose: () => void;
  onPreview: (c: RankedCandidate) => void;
  onStopPreview: () => void;
  onPlay: (c: RankedCandidate) => void;
}

export function AnalysisPanel({ open, loading, candidates, previewCandidate, onClose, onPreview, onStopPreview, onPlay }: AnalysisPanelProps) {
  const t = useT();
  if (!open) return null;

  return (
    <div className="analysis-panel-overlay" onClick={onClose}>
      <div className="analysis-panel" onClick={(e) => e.stopPropagation()}>
        <div className="analysis-panel__header">
          <h2>{t('advisor.title')}</h2>
          <button type="button" className="btn btn--small" onClick={onClose}>{t('advisor.close')}</button>
        </div>
        {loading && <div className="analysis-panel__loading">{t('advisor.analyzing')}</div>}
        {!loading && candidates.length === 0 && <div className="analysis-panel__loading">{t('advisor.noMoves')}</div>}
        {!loading && candidates.map((c) => (
          <CandidateMoveCard
            key={c.rank}
            candidate={c}
            isPreviewing={previewCandidate?.rank === c.rank}
            onPreview={() => onPreview(c)}
            onStopPreview={onStopPreview}
            onPlay={() => onPlay(c)}
          />
        ))}
      </div>
    </div>
  );
}
