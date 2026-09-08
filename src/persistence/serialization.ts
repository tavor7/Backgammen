import { createEmptyBoard } from '../game/board';
import type { BoardState, Player } from '../game/types';

/**
 * Compact URL-safe encoding of a board position (not the full GameState/history).
 * One byte per point: bit7 = owner (0 white/1 black), bits0-6 = count (0-15 fits easily).
 * Plus 4 trailing bytes for bar/borne-off counts. Intended for future position-sharing links.
 */
export function encodeBoard(board: BoardState): string {
  const bytes = new Uint8Array(24 + 4);
  for (let i = 0; i < 24; i++) {
    const point = board.points[i];
    const ownerBit = point.owner === 'black' ? 0x80 : 0;
    bytes[i] = ownerBit | (point.count & 0x7f);
  }
  bytes[24] = board.bar.white;
  bytes[25] = board.bar.black;
  bytes[26] = board.borneOff.white;
  bytes[27] = board.borneOff.black;
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeBoard(encoded: string): BoardState {
  const binary = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const board = createEmptyBoard();
  for (let i = 0; i < 24; i++) {
    const count = bytes[i] & 0x7f;
    const owner: Player | null = count === 0 ? null : bytes[i] & 0x80 ? 'black' : 'white';
    board.points[i] = { owner, count };
  }
  board.bar.white = bytes[24];
  board.bar.black = bytes[25];
  board.borneOff.white = bytes[26];
  board.borneOff.black = bytes[27];
  return board;
}
