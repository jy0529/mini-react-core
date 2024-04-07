import {
    unstable_IdlePriority,
    unstable_ImmediatePriority,
    unstable_NormalPriority,
    unstable_UserBlockingPriority,
    unstable_getCurrentPriorityLevel
} from 'scheduler';
import { FiberRoot } from './ReactFiberRoot';

export type Lane = number;
export type Lanes = number;

export const SyncLane = 0b0001;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;
export const InputContinuousLane = 0b0010;
export const DefaultLane = 0b0100;
export const IdleLane = 0b1000;

export function mergeLanes(lane1: Lane, lane2: Lane) {
    return lane1 | lane2;
}

export function requestUpdateLane() {
    const priority = unstable_getCurrentPriorityLevel();
    const lane = laneToSchedulerPriority(priority);
    return lane;
}

export function getHighestPriorityLane(lanes: Lanes) {
    return lanes & -lanes;
}

export function markRootFinished(root: FiberRoot, lane: Lane) {
    root.pendingLanes = root.pendingLanes & ~lane;
}

export function laneToSchedulerPriority(lane: Lane) {
    switch (lane) {
        case SyncLane:
            return unstable_ImmediatePriority;
        case InputContinuousLane:
            return unstable_UserBlockingPriority;
        case DefaultLane:
            return unstable_NormalPriority;
        case IdleLane:
            return unstable_IdlePriority;
        default:
            return unstable_IdlePriority;
    }
}

export function priorityToLane(priority: number) {
    switch (priority) {
        case unstable_ImmediatePriority:
            return SyncLane;
        case unstable_UserBlockingPriority:
            return InputContinuousLane;
        case unstable_NormalPriority:
            return DefaultLane;
        case unstable_IdlePriority:
            return IdleLane;
        default:
            return NoLane;
    }
}
