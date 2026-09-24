import { Combat, idle, type InputFrame } from "../combat";
import type { CombatState } from "../combat-state";

export const MATCH_STEP_MS = 1000 / 60;
export type PlayerIndex = 0 | 1;
/** Called once per simulation step, in player order, with the pre-step state. */
export type PlayerInput = (
  combat: CombatState,
  player: PlayerIndex,
) => InputFrame;
export interface StepObserver {
  beforeStep(combat: CombatState): void;
  afterStep(combat: CombatState, stepMs: number): void;
}
export interface MatchOptions {
  practice?: boolean;
  inputs?: readonly [PlayerInput, PlayerInput];
}

/** Application coordinator. No browser, renderer, audio or wall clock dependencies. */
export class MatchSession {
  private current = new Combat();
  private sources: readonly [PlayerInput, PlayerInput] = [idle, idle];
  private accumulator = 0;
  private running = false;
  private suspended = false;

  constructor(
    private readonly observer?: StepObserver,
    private readonly onFinished: (combat: CombatState) => void = () => {},
  ) {}

  get combat(): CombatState {
    return this.current;
  }
  get active(): boolean {
    return this.running;
  }
  get paused(): boolean {
    return this.suspended;
  }

  start({ practice = false, inputs = [idle, idle] }: MatchOptions = {}): void {
    this.current = new Combat(practice);
    this.sources = inputs;
    this.accumulator = 0;
    this.suspended = false;
    this.running = true;
  }

  advance(deltaMs: number): void {
    if (!this.running || this.suspended) return;
    if (!Number.isFinite(deltaMs) || deltaMs < 0) return;
    this.accumulator += deltaMs;
    while (
      this.accumulator >= MATCH_STEP_MS &&
      this.running &&
      !this.suspended
    ) {
      this.observer?.beforeStep(this.current);
      this.current.step([
        this.sources[0](this.current, 0),
        this.sources[1](this.current, 1),
      ]);
      this.observer?.afterStep(this.current, MATCH_STEP_MS);
      this.accumulator -= MATCH_STEP_MS;
      if (this.current.phase === "over") {
        // Mark stopped before notifying; callbacks cannot finish twice.
        this.finish();
        this.onFinished(this.current);
        break;
      }
    }
  }

  pause(): void {
    if (!this.running || this.suspended) return;
    this.suspended = true;
    this.accumulator = 0;
  }

  resume(): void {
    if (!this.running || !this.suspended) return;
    this.current.fighters.forEach((fighter) => {
      fighter.previous = idle();
    });
    this.suspended = false;
  }

  /** Stop/abandon without reporting a winner. Natural completion notifies separately. */
  finish(): void {
    this.running = false;
    this.suspended = false;
    this.accumulator = 0;
    this.current.clearCombos();
  }

  /** Preserve the existing practice reset: positions/round timer, not session time. */
  resetPractice(): void {
    if (this.running && this.current.practice) this.current.resetPositions();
  }
}
