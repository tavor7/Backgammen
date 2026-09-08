import { useEffect, useState } from 'react';
import { Board } from '../components/Board/Board';
import { Dice } from '../components/Dice/Dice';
import { ManualDiceEntry } from '../components/Dice/ManualDiceEntry';
import { Controls } from '../components/Controls/Controls';
import { MoveHistory } from '../components/MoveHistory/MoveHistory';
import { EditBoardToolbar } from '../components/EditBoardToolbar/EditBoardToolbar';
import { useEditBoardTool } from '../components/EditBoardToolbar/useEditBoardTool';
import { AnalysisPanel } from '../components/MoveAdvisor/AnalysisPanel';
import { useGameStore } from '../state/gameStore';
import { useUiStore } from '../state/uiStore';
import { requestAdvice, requestComputerMove } from '../ai/advisorClient';
import type { RankedCandidate } from '../ai/moveAdvisor';
import { mustEnterFromBar as engineMustEnterFromBar } from '../game/rules';

const HUMAN_PLAYER = 'white';
const COMPUTER_PLAYER = 'black';

export function GameScreen() {
  const game = useGameStore((s) => s.game);
  const pendingMoves = useGameStore((s) => s.pendingMoves);
  const rollDice = useGameStore((s) => s.rollDice);
  const displayBoard = useGameStore((s) => s.displayBoard);
  const remainingDiceFn = useGameStore((s) => s.remainingDice);
  const playSingleMove = useGameStore((s) => s.playSingleMove);
  const playSequence = useGameStore((s) => s.playSequence);
  const undo = useGameStore((s) => s.undo);
  const redo = useGameStore((s) => s.redo);
  const switchTurn = useGameStore((s) => s.switchTurn);
  const truncateHistoryAt = useGameStore((s) => s.truncateHistoryAt);
  const setEditMode = useGameStore((s) => s.setEditMode);
  const applyEdit = useGameStore((s) => s.applyEdit);
  const legalDestinationsFrom = useGameStore((s) => s.legalDestinationsFrom);
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

  const [selected, setSelected] = useState<number | 'bar' | null>(null);
  const editTool = useEditBoardTool(applyEdit);
  const [computerThinking, setComputerThinking] = useState(false);

  const board = game ? displayBoard() : null;
  const remainingDice = game ? remainingDiceFn() : [];
  const onlyLegalSequence = game ? onlyLegalSequenceFn() : null;
  const isComputerTurn = game?.mode === 'vsComputer' && game.currentPlayer === COMPUTER_PLAYER;
  const interactive = !!game && !game.editMode && game.turnPhase === 'awaitingMove' && !isComputerTurn && game.status === 'inProgress';

  // Computer opponent: auto-roll then auto-move.
  useEffect(() => {
    if (!game || game.mode !== 'vsComputer' || game.status !== 'inProgress') return;
    if (game.currentPlayer !== COMPUTER_PLAYER) return;

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

  if (!game || !board) return null;

  const mustEnter = engineMustEnterFromBar(board, game.currentPlayer);

  function handlePointClick(point: number) {
    if (game!.editMode) {
      editTool.handlePointClick(point);
      return;
    }
    if (!interactive) return;

    if (selected !== null) {
      const destinations = legalDestinationsFrom(selected);
      const move = destinations.find((m) => m.to === point);
      if (move) {
        playSingleMove(move);
        setSelected(null);
        return;
      }
    }

    const originDestinations = legalDestinationsFrom(point);
    if (originDestinations.length > 0) {
      setSelected(point);
    } else {
      setSelected(null);
    }
  }

  function handleBarClick() {
    if (game!.editMode || !interactive) return;
    if (!mustEnter) return;
    setSelected('bar');
  }

  function handleBearOffClick(player: 'white' | 'black') {
    if (!interactive || player !== game!.currentPlayer || selected === null) return;
    const destinations = legalDestinationsFrom(selected);
    const move = destinations.find((m) => m.to === 'off');
    if (move) {
      playSingleMove(move);
      setSelected(null);
    }
  }

  const legalDestinations = selected !== null ? legalDestinationsFrom(selected) : [];

  async function handleOpenAdvisor() {
    if (!game!.dice.rolled) return;
    openAdvisor();
    setAdvisorLoading(true);
    const result = await requestAdvice(game!.board, game!.currentPlayer, game!.dice.remaining, topN);
    setCandidates(result);
    setAdvisorLoading(false);
  }

  function handlePlayCandidate(c: RankedCandidate) {
    playSequence(c.sequence);
    closeAdvisor();
  }

  const previewBoard = previewCandidate ? previewCandidate.resultingBoard : board;

  return (
    <div className="game-screen">
      {game.status === 'won' && (
        <div className="win-banner">
          <strong>{game.winner === 'white' ? 'White' : 'Black'} wins</strong>
          {game.winType && game.winType !== 'single' ? ` by a ${game.winType}!` : '!'}
        </div>
      )}

      <Board
        board={previewCandidate ? previewBoard : board}
        currentPlayer={game.currentPlayer}
        interactive={interactive && !previewCandidate}
        editMode={game.editMode}
        selected={selected}
        legalDestinations={previewCandidate ? [] : legalDestinations}
        onPointClick={handlePointClick}
        onBarClick={handleBarClick}
        onBearOffClick={handleBearOffClick}
        mustEnterFromBar={mustEnter}
      />

      <Dice rolled={game.dice.rolled} remaining={remainingDice} />
      {computerThinking && <div className="thinking-indicator">Computer is thinking…</div>}
      {interactive && onlyLegalSequence && (
        <button type="button" className="btn btn--primary btn--wide" onClick={() => playSequence(onlyLegalSequence)}>
          Play Only Move ({onlyLegalSequence.map((m) => `${m.from}/${m.to}`).join(' ')})
        </button>
      )}

      {game.mode === 'liveAssistant' && !game.editMode && game.turnPhase === 'awaitingRoll' && (
        <ManualDiceEntry onEnter={(dice) => rollDice(dice)} onRollForMe={() => rollDice()} />
      )}

      <Controls
        mode={game.mode}
        currentPlayer={game.currentPlayer}
        canUndo={game.moveHistory.length > 0}
        canRedo={game.redoStack.length > 0}
        canRoll={game.turnPhase === 'awaitingRoll' && game.status === 'inProgress' && !game.editMode && (game.mode !== 'vsComputer' || game.currentPlayer === HUMAN_PLAYER)}
        editMode={game.editMode}
        onRoll={() => rollDice()}
        onUndo={undo}
        onRedo={redo}
        onNewGame={() => newGame(game.mode)}
        onAdvisor={handleOpenAdvisor}
        onToggleEdit={() => setEditMode(!game.editMode)}
        onHome={goHome}
        onSwitchTurn={switchTurn}
        advisorDisabled={!game.dice.rolled || game.editMode || pendingMoves.length > 0}
      />

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
    </div>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
