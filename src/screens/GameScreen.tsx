import { useEffect, useMemo, useRef, useState } from 'react';
import { Board } from '../components/Board/Board';
import { Dice } from '../components/Dice/Dice';
import { ManualDiceEntry } from '../components/Dice/ManualDiceEntry';
import { Controls } from '../components/Controls/Controls';
import { MoveHistory } from '../components/MoveHistory/MoveHistory';
import { EditBoardToolbar } from '../components/EditBoardToolbar/EditBoardToolbar';
import { useEditBoardTool } from '../components/EditBoardToolbar/useEditBoardTool';
import { AnalysisPanel } from '../components/MoveAdvisor/AnalysisPanel';
import { SideMenu } from '../components/Menu/SideMenu';
import { ConfirmDialog } from '../components/ConfirmDialog/ConfirmDialog';
import { Toast } from '../components/Toast/Toast';
import { OrientationDialog } from '../components/OrientationDialog/OrientationDialog';
import { useGameStore } from '../state/gameStore';
import { useUiStore } from '../state/uiStore';
import { requestAdvice, requestComputerMove } from '../ai/advisorClient';
import type { RankedCandidate } from '../ai/moveAdvisor';
import { probabilityBlotIsHit } from '../ai/probabilities';
import { hashBoard, opponent } from '../game/board';
import { mustEnterFromBar as engineMustEnterFromBar } from '../game/rules';
import type { BoardState } from '../game/types';
import { useT, useLanguageStore } from '../i18n/useT';

const HUMAN_PLAYER = 'white';
const COMPUTER_PLAYER = 'black';

function computeBlotHitProbabilities(board: BoardState): Map<number, number> {
  const map = new Map<number, number>();
  for (let p = 1; p <= 24; p++) {
    const point = board.points[p - 1];
    if (point.owner && point.count === 1) {
      map.set(p, probabilityBlotIsHit(board, p, opponent(point.owner)));
    }
  }
  return map;
}

export function GameScreen() {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const game = useGameStore((s) => s.game);
  const pendingMoves = useGameStore((s) => s.pendingMoves);
  const rollDice = useGameStore((s) => s.rollDice);
  const displayBoard = useGameStore((s) => s.displayBoard);
  const remainingDiceFn = useGameStore((s) => s.remainingDice);
  const playMoves = useGameStore((s) => s.playMoves);
  const playSequence = useGameStore((s) => s.playSequence);
  const undoPendingMove = useGameStore((s) => s.undoPendingMove);
  const undo = useGameStore((s) => s.undo);
  const redo = useGameStore((s) => s.redo);
  const switchTurn = useGameStore((s) => s.switchTurn);
  const truncateHistoryAt = useGameStore((s) => s.truncateHistoryAt);
  const setEditMode = useGameStore((s) => s.setEditMode);
  const applyEdit = useGameStore((s) => s.applyEdit);
  const landingSpotsFrom = useGameStore((s) => s.landingSpotsFrom);
  const currentWarnings = useGameStore((s) => s.currentWarnings);
  const newGame = useGameStore((s) => s.newGame);
  const onlyLegalSequenceFn = useGameStore((s) => s.onlyLegalSequence);

  const goHome = useUiStore((s) => s.goHome);
  const difficulty = useUiStore((s) => s.difficulty);
  const topN = useUiStore((s) => s.topN);
  const advisorOpen = useUiStore((s) => s.advisorOpen);
  const advisorLoading = useUiStore((s) => s.advisorLoading);
  const candidates = useUiStore((s) => s.candidates);
  const previewCandidate = useUiStore((s) => s.previewCandidate);
  const openAdvisor = useUiStore((s) => s.openAdvisor);
  const closeAdvisor = useUiStore((s) => s.closeAdvisor);
  const setAdvisorLoading = useUiStore((s) => s.setAdvisorLoading);
  const setCandidates = useUiStore((s) => s.setCandidates);
  const setPreview = useUiStore((s) => s.setPreview);
  const menuOpen = useUiStore((s) => s.menuOpen);
  const openMenu = useUiStore((s) => s.openMenu);
  const closeMenu = useUiStore((s) => s.closeMenu);
  const confirmDialog = useUiStore((s) => s.confirmDialog);
  const dismissConfirm = useUiStore((s) => s.dismissConfirm);
  const boardOrientation = useUiStore((s) => s.boardOrientation);
  const askOrientation = useUiStore((s) => s.askOrientation);
  const resolveOrientationPrompt = useUiStore((s) => s.resolveOrientationPrompt);
  const orientationPromptCallback = useUiStore((s) => s.orientationPromptCallback);
  const toast = useUiStore((s) => s.toast);
  const showToast = useUiStore((s) => s.showToast);
  const clearToast = useUiStore((s) => s.clearToast);

  const [selected, setSelected] = useState<number | 'bar' | null>(null);
  const editTool = useEditBoardTool(applyEdit);
  const [computerThinking, setComputerThinking] = useState(false);
  const advisorConsultedRef = useRef(false);
  const tapMoveRef = useRef(false);
  const [lastRolls, setLastRolls] = useState<{ white: [number, number] | null; black: [number, number] | null }>({ white: null, black: null });

  // Each player's dice stay visible after their turn ends, until they roll again.
  useEffect(() => {
    setLastRolls({ white: null, black: null });
  }, [game?.id]);

  useEffect(() => {
    if (game?.dice.rolled) {
      setLastRolls((prev) => ({ ...prev, [game.currentPlayer]: game.dice.rolled }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.dice.rolled?.join(','), game?.currentPlayer]);

  const board = game ? displayBoard() : null;
  const remainingDice = game ? remainingDiceFn() : [];
  const onlyLegalSequence = game ? onlyLegalSequenceFn() : null;
  const isComputerTurn = game?.mode === 'vsComputer' && game.currentPlayer === COMPUTER_PLAYER;
  const interactive = !!game && !game.editMode && game.turnPhase === 'awaitingMove' && !isComputerTurn && game.status === 'inProgress';

  const boardKey = board ? hashBoard(board) : '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hitProbabilities = useMemo(() => (board ? computeBlotHitProbabilities(board) : new Map()), [boardKey]);

  // Computer opponent: auto-roll then auto-move.
  useEffect(() => {
    if (!game || game.mode !== 'vsComputer' || game.status !== 'inProgress' || game.currentPlayer !== COMPUTER_PLAYER) {
      setComputerThinking(false);
      return;
    }

    let cancelled = false;
    setComputerThinking(true);

    async function act() {
      if (game!.turnPhase === 'awaitingRoll') {
        await delay(500);
        if (cancelled) return;
        rollDice();
        return;
      }
      if (game!.turnPhase === 'awaitingMove' && game!.dice.rolled) {
        await delay(600);
        if (cancelled) return;
        const sequence = await requestComputerMove(game!.board, COMPUTER_PLAYER, game!.dice.rolled, difficulty);
        if (cancelled) return;
        await delay(400);
        if (cancelled) return;
        playSequence(sequence);
      }
    }
    act().finally(() => !cancelled && setComputerThinking(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.currentPlayer, game?.turnPhase, game?.dice.rolled, game?.mode, game?.status]);

  // A fresh roll starts a new "did they open the advisor this turn" window.
  useEffect(() => {
    advisorConsultedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.dice.rolled?.join(',')]);

  // If the player completed a turn by tapping through moves themselves (never opened the
  // Advisor), check — after the fact — whether what they played was actually the top-ranked
  // move, and let them know.
  useEffect(() => {
    if (!game || !tapMoveRef.current) return;
    tapMoveRef.current = false;
    if (advisorConsultedRef.current) return;

    const lastTurnRecord = game.moveHistory[game.moveHistory.length - 1];
    if (!lastTurnRecord || lastTurnRecord.type !== 'move' || !lastTurnRecord.dice) return;

    let cancelled = false;
    requestAdvice(lastTurnRecord.boardBefore, lastTurnRecord.player, lastTurnRecord.dice, 1, language).then((top) => {
      if (cancelled || top.length === 0) return;
      if (hashBoard(top[0].resultingBoard) === hashBoard(lastTurnRecord.boardAfter)) {
        showToast(t('gameScreen.bestMoveToast'));
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.moveHistory.length]);

  if (!game || !board) return null;

  const mustEnter = engineMustEnterFromBar(board, game.currentPlayer);

  function handlePointClick(point: number) {
    if (game!.editMode) {
      editTool.handlePointClick(point);
      return;
    }
    if (!interactive) return;

    if (selected === point) {
      setSelected(null);
      return;
    }

    if (selected !== null) {
      const spot = landingSpotsFrom(selected).find((s) => s.to === point);
      if (spot) {
        tapMoveRef.current = true;
        playMoves(spot.moves);
        setSelected(null);
        return;
      }
    }

    const spots = landingSpotsFrom(point);
    setSelected(spots.length > 0 ? point : null);
  }

  function handleBarClick() {
    if (game!.editMode || !interactive) return;
    if (!mustEnter) return;
    setSelected((prev) => (prev === 'bar' ? null : 'bar'));
  }

  function handleBearOffClick(player: 'white' | 'black') {
    if (!interactive || player !== game!.currentPlayer || selected === null) return;
    const spot = landingSpotsFrom(selected).find((s) => s.to === 'off');
    if (spot) {
      tapMoveRef.current = true;
      playMoves(spot.moves);
      setSelected(null);
    }
  }

  const landingSpots = selected !== null ? landingSpotsFrom(selected) : [];

  async function handleOpenAdvisor() {
    if (!game!.dice.rolled) return;
    advisorConsultedRef.current = true;
    openAdvisor();
    setAdvisorLoading(true);
    const result = await requestAdvice(game!.board, game!.currentPlayer, game!.dice.remaining, topN, language);
    setCandidates(result);
    setAdvisorLoading(false);
  }

  function handlePlayCandidate(c: RankedCandidate) {
    playSequence(c.sequence);
    closeAdvisor();
  }

  const previewBoard = previewCandidate ? previewCandidate.resultingBoard : board;

  const lastTurn = game.moveHistory[game.moveHistory.length - 1];
  // Only the final resting spot of each checker — a move whose destination is immediately reused
  // as another move's origin was just a pass-through (a single checker playing 2+ dice in a chain),
  // not a place a checker actually ended up, so it shouldn't get its own highlight. Counted (not just
  // a set of points) so two checkers landing on the same point — e.g. "6/2 8/2" — both get marked,
  // not just one.
  const lastMoveCounts = new Map<number | 'off', number>();
  const hitPoints = new Set<number>();
  if (pendingMoves.length === 0 && lastTurn) {
    for (const [i, m] of lastTurn.moves.entries()) {
      const isPassThrough = lastTurn.moves.slice(i + 1).some((later) => later.from === m.to);
      if (!isPassThrough) lastMoveCounts.set(m.to, (lastMoveCounts.get(m.to) ?? 0) + 1);
      if (m.hit && typeof m.to === 'number') hitPoints.add(m.to);
    }
  }

  return (
    <div className="game-screen">
      {game.status === 'won' && game.winner && (
        <div className="win-banner">
          <strong>{t('gameScreen.win', { player: t(`player.${game.winner}`) })}</strong>
          {t(`gameScreen.winSuffix.${game.winType ?? 'single'}`)}
        </div>
      )}

      <div className="board-wrapper">
        <Board
          board={previewCandidate ? previewBoard : board}
          currentPlayer={game.currentPlayer}
          interactive={interactive && !previewCandidate}
          editMode={game.editMode}
          selected={selected}
          destinationPoints={previewCandidate ? [] : landingSpots.map((s) => s.to)}
          onPointClick={handlePointClick}
          onBarClick={handleBarClick}
          onBearOffClick={handleBearOffClick}
          mustEnterFromBar={mustEnter}
          lastMoveCounts={previewCandidate ? new Map() : lastMoveCounts}
          hitProbabilities={hitProbabilities}
          animationTick={game.moveHistory.length}
          hitPoints={previewCandidate ? new Set() : hitPoints}
          orientation={boardOrientation}
        />

        <div className="dice-row">
          {(['white', 'black'] as const).map((p) => {
            const isActive = p === game.currentPlayer;
            if (!isActive && !lastRolls[p]) return null;
            return (
              <div key={p} className={`player-dice${isActive ? ' player-dice--active' : ''}`}>
                <span className="player-dice__label">{t(`player.${p}`)}</span>
                {isActive ? (
                  <Dice
                    key={`${game.currentPlayer}-${game.dice.rolled?.join(',') ?? 'none'}-${game.moveHistory.length}`}
                    rolled={game.dice.rolled}
                    remaining={remainingDice}
                    canRoll={game.turnPhase === 'awaitingRoll' && game.status === 'inProgress' && !game.editMode && (game.mode !== 'vsComputer' || game.currentPlayer === HUMAN_PLAYER)}
                    onRoll={() => rollDice()}
                  />
                ) : (
                  <div className="dice--static">
                    <Dice rolled={lastRolls[p]} remaining={[]} interactive={false} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {computerThinking && <div className="thinking-indicator">{t('gameScreen.computerThinking')}</div>}
      {interactive && pendingMoves.length > 0 && (
        <button type="button" className="btn btn--wide" onClick={undoPendingMove}>
          {t('gameScreen.undoLastMove', { move: `${pendingMoves[pendingMoves.length - 1].from}/${pendingMoves[pendingMoves.length - 1].to}` })}
        </button>
      )}
      {interactive && pendingMoves.length === 0 && onlyLegalSequence && (
        <button type="button" className="btn btn--primary btn--wide" onClick={() => playSequence(onlyLegalSequence)}>
          {t('gameScreen.playOnlyMove', { sequence: onlyLegalSequence.map((m) => `${m.from}/${m.to}`).join(' ') })}
        </button>
      )}

      {game.mode === 'liveAssistant' && !game.editMode && game.turnPhase === 'awaitingRoll' && (
        <ManualDiceEntry onEnter={(dice) => rollDice(dice)} onRollForMe={() => rollDice()} />
      )}

      <Controls
        mode={game.mode}
        currentPlayer={game.currentPlayer}
        editMode={game.editMode}
        onToggleEdit={() => setEditMode(!game.editMode)}
        onSwitchTurn={switchTurn}
        onOpenMenu={openMenu}
      />

      <button
        type="button"
        className="advisor-fab"
        onClick={handleOpenAdvisor}
        disabled={!game.dice.rolled || game.editMode || pendingMoves.length > 0}
        aria-label={t('advisor.label')}
      >
        <span className="advisor-fab__icon">💡</span>
        {t('advisor.label')}
      </button>

      <SideMenu
        open={menuOpen}
        onClose={closeMenu}
        onNewGame={() => askOrientation(() => newGame(game.mode))}
        onHome={goHome}
        onUndo={undo}
        onRedo={redo}
        canUndo={game.moveHistory.length > 0}
        canRedo={game.redoStack.length > 0}
      />

      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          onCancel={dismissConfirm}
          onConfirm={() => {
            confirmDialog.onConfirm();
            dismissConfirm();
          }}
        />
      )}

      {orientationPromptCallback && <OrientationDialog onChoose={resolveOrientationPrompt} />}

      {game.editMode && (
        <EditBoardToolbar
          activePlayer={editTool.activePlayer}
          setActivePlayer={editTool.setActivePlayer}
          tool={editTool.tool}
          setTool={editTool.setTool}
          onClear={() => applyEdit({ type: 'clearBoard' })}
          onReset={() => applyEdit({ type: 'resetStartingPosition' })}
          onSwitchTurn={switchTurn}
          warnings={currentWarnings()}
        />
      )}

      <MoveHistory
        history={game.moveHistory}
        correctable={game.mode === 'liveAssistant'}
        onCorrect={(index) => truncateHistoryAt(index)}
      />

      <AnalysisPanel
        open={advisorOpen}
        loading={advisorLoading}
        candidates={candidates}
        previewCandidate={previewCandidate}
        onClose={closeAdvisor}
        onPreview={setPreview}
        onStopPreview={() => setPreview(null)}
        onPlay={handlePlayCandidate}
      />

      {toast && <Toast message={toast} onDismiss={clearToast} />}
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
