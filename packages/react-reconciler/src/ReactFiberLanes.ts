import { FiberRoot } from './ReactFiberRoot';

export type Lane = number;
export type Lanes = number;

export const SyncLane = 0b0001;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export function mergeLanes(lane1: Lane, lane2: Lane) {
    return lane1 | lane2;
}

export function requestUpdateLane() {
    return SyncLane;
}

export function getHighestPriorityLane(lanes: Lanes) {
    return lanes & -lanes;
}

export function markRootFinished(root: FiberRoot, lane: Lane) {
    root.pendingLanes = root.pendingLanes & ~lane;
}
