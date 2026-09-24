export type ThreadFeedLiveFollowEvent =
  | { readonly type: "reset" }
  | { readonly type: "user-scroll-begin" }
  | {
      readonly type: "user-scroll-end";
      readonly isAtEnd: boolean;
      readonly userScrollSessionActive: boolean;
    }
  | {
      readonly type: "scroll";
      readonly isAtEnd: boolean;
      readonly isPastEnd: boolean;
      readonly userScrollSessionActive: boolean;
    }
  | {
      readonly type: "disclosure-settled";
      readonly isAtEnd: boolean;
      readonly userScrollSessionActive: boolean;
    };

// Both platforms let a reader pull the feed past its own last row: Android
// stretches and springs back, UIKit bounces. The list rests at the end again by
// itself, so the overshoot is only ever a gesture in progress.
const END_OVERSCROLL_EPSILON = 1;

export function isScrollPastFeedEnd(input: {
  readonly contentOffset: number;
  readonly viewportLength: number;
  readonly contentLength: number;
  // The scroll event's own inset. Android always reports zero and keeps the
  // composer overlay in the content itself, so its resting end is exactly
  // contentLength - viewportLength.
  readonly contentInsetEnd: number;
  // UIKit's automatic behavior adds the safe-area bottom on top of that raw
  // inset without reporting it anywhere in the event, which is the same extra
  // contentInsetEndStaticAdjustment feeds to the list's own scroll math.
  readonly adjustedInsetEnd: number;
}): boolean {
  const restingEnd =
    input.contentLength - input.viewportLength + input.contentInsetEnd + input.adjustedInsetEnd;
  return input.contentOffset - restingEnd > END_OVERSCROLL_EPSILON;
}

export interface ThreadWorkGroupScrollPosition {
  readonly rowId: string;
  readonly offsetWithinRow: number;
  readonly scrollOffset: number;
  readonly contentHeight: number;
}

export function resolveThreadWorkGroupInitialScroll(
  rows: ReadonlyArray<{ readonly id: string }>,
  position: ThreadWorkGroupScrollPosition | undefined,
) {
  const index = position ? rows.findIndex((row) => row.id === position.rowId) : -1;
  return index >= 0 && position ? { index, viewOffset: -position.offsetWithinRow } : undefined;
}

export function shouldFollowThreadWorkGroupAppend(input: {
  readonly previousRows: ReadonlyArray<{ readonly id: string }>;
  readonly rows: ReadonlyArray<{ readonly id: string }>;
  readonly previousContentHeight: number;
  readonly contentHeight: number;
  readonly viewportHeight: number;
  readonly scrollOffset: number;
  readonly detailsChanged: boolean;
  readonly userScrolling: boolean;
}) {
  return (
    !input.detailsChanged &&
    !input.userScrolling &&
    input.contentHeight > input.previousContentHeight &&
    input.rows.length > input.previousRows.length &&
    input.previousRows.every((row, index) => row.id === input.rows[index]?.id) &&
    input.previousContentHeight - input.viewportHeight - input.scrollOffset <= 1
  );
}

export function resolveThreadFeedSubmissionAnchor<AnchorId>(input: {
  readonly currentAnchorMessageId: AnchorId | null;
  readonly submittedMessageId: AnchorId;
  readonly hasStartedTurn: boolean;
  readonly hasUserMessage: boolean;
  readonly queuedMessageCount: number;
}): AnchorId | null {
  if (input.hasStartedTurn || input.hasUserMessage) {
    return null;
  }

  if (input.currentAnchorMessageId !== null) {
    return input.currentAnchorMessageId;
  }

  return input.queuedMessageCount > 0 ? null : input.submittedMessageId;
}

export function resolveThreadFeedLiveFollow(
  current: boolean,
  event: ThreadFeedLiveFollowEvent,
): boolean {
  switch (event.type) {
    case "reset":
      return true;
    case "user-scroll-begin":
      return false;
    case "user-scroll-end":
      return event.userScrollSessionActive ? event.isAtEnd : current;
    case "disclosure-settled":
      return !event.userScrollSessionActive && event.isAtEnd;
    case "scroll":
      // Past the end is not an escape from it. A live session normally outranks
      // the list's at-end report, because that report's tolerance is wide enough
      // for a streaming chunk to pull a reader back before their upward drag
      // clears it — but an overshoot can only be a pull toward the end, and
      // pausing there leaves a scroll-to-end control pointing at the very place
      // the reader is holding the feed.
      if (event.isPastEnd) {
        return true;
      }
      if (event.userScrollSessionActive) {
        return false;
      }
      if (event.isAtEnd) {
        return true;
      }
      return current;
  }
}
