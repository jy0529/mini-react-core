import { scheduleMicroTask } from 'hostConfig';
import { beginWork } from './ReactBeginWork';
import {
    commitHookEffectListCreate,
    commitHookEffectListDestroy,
    commitHookEffectListUnMount,
    commitMutationEffect
} from './ReactCommitRoot';
import { completeWork } from './ReactCompleteWork';
import { FiberNode, createWorkInProgress } from './ReactFiber';
import { MutationMask, NoFlags, PassiveMask } from './ReactFiberFlags';
import { Lane, NoLane, SyncLane, getHighestPriorityLane, markRootFinished, mergeLanes } from './ReactFiberLanes';
import { FiberRoot, PendingPassiveEffect } from './ReactFiberRoot';
import { flushSyncCallbacks, scheduleSyncCallback } from './ReactSyncQueue';
import { HostRoot } from './ReactWorkTags';
import { unstable_NormalPriority as NormalPriority, unstable_scheduleCallback as scheduleCallback } from 'scheduler';
import { HookHasSideEffect, Passive } from './ReactHookEffectTags';

let workInProgress: FiberNode | null;
let wipRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;

function prepareFreshState(fiberRoot: FiberRoot, lane: Lane) {
    workInProgress = createWorkInProgress(fiberRoot.current, {});
    wipRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiberNode: FiberNode, lane: Lane) {
    const root = markUpdateFromFiberToRoot(fiberNode);
    markRootUpdated(root, lane);
    ensureIsRootScheduled(root);
}

// schedule 阶段
function ensureIsRootScheduled(root: FiberRoot) {
    const updateLane = getHighestPriorityLane(root.pendingLanes);
    if (updateLane === NoLane) {
        return;
    }
    if (updateLane === SyncLane) {
        // 同步 微任务
        scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
        scheduleMicroTask(flushSyncCallbacks);
    } else {
        // 其他优先级 宏任务
    }
}

function markRootUpdated(root: FiberRoot, lane: Lane) {
    root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

function markUpdateFromFiberToRoot(fiberNode: FiberNode) {
    let node = fiberNode;
    let parent = node.return;
    while (parent !== null) {
        node = parent;
        parent = parent.return;
    }
    if (node.tag === HostRoot) {
        return node.stateNode;
    }

    return null;
}

export function performSyncWorkOnRoot(root: FiberRoot, lane: Lane) {
    const nextLane = getHighestPriorityLane(root.pendingLanes);
    if (nextLane !== SyncLane) {
        ensureIsRootScheduled(root);
        return;
    }

    prepareFreshState(root, lane);
    do {
        try {
            workLoop();
            break;
        } catch (error) {
            console.error(error);
        }
    } while (true);
    const finishedWork = root.current.alternative;
    root.finishedWork = finishedWork;
    root.finishedLane = lane;
    wipRenderLane = NoLane;
    commitRoot(root);
}

function flushPassiveEffect(pendingPassiveEffects: PendingPassiveEffect) {
    pendingPassiveEffects.unmount.forEach((effect) => {
        commitHookEffectListUnMount(Passive, effect);
    });
    pendingPassiveEffects.unmount = [];

    pendingPassiveEffects.update.forEach((effect) => {
        commitHookEffectListDestroy(Passive | HookHasSideEffect, effect);
    });

    pendingPassiveEffects.update.forEach((effect) => {
        commitHookEffectListCreate(Passive | HookHasSideEffect, effect);
    });
    pendingPassiveEffects.update = [];

    flushSyncCallbacks();
}

export function workLoop() {
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}

function performUnitOfWork(unitOfWork: FiberNode) {
    const next: FiberNode | null = beginWork(unitOfWork, wipRenderLane);
    unitOfWork.memorizedProps = unitOfWork.pendingProps;

    if (next === null) {
        completeUnitOfWork(unitOfWork);
    } else {
        workInProgress = next;
    }
}

function completeUnitOfWork(unitOfWork: FiberNode) {
    let node: FiberNode | null = unitOfWork;
    do {
        completeWork(node);

        const sibling = node.sibling;
        if (sibling !== null) {
            workInProgress = sibling;
            return;
        }
        node = node.return;
        workInProgress = node;
    } while (node !== null);
}

function commitRoot(root: FiberRoot) {
    const finishedWork = root.finishedWork;
    if (finishedWork === null) {
        return;
    }

    if (__DEV__) {
        console.warn('commit 阶段开始', finishedWork);
    }

    const lane = root.finishedLane;
    if (lane === NoLane && __DEV__) {
        console.error('commit 阶段不应该有 NoLane');
    }

    // reset
    root.finishedWork = null;
    root.finishedLane = NoLane;

    markRootFinished(root, lane);

    // Effect flags
    if ((finishedWork.flags & PassiveMask) !== NoFlags || (finishedWork.subtreeFlags & PassiveMask) !== NoFlags) {
        if (!rootDoesHasPassiveEffects) {
            rootDoesHasPassiveEffects = true;

            // 调度
            scheduleCallback(NormalPriority, () => {
                flushPassiveEffect(root.pendingPassiveEffects);
                return;
            });
        }
    }

    // 检查是否需要更新 subtreeFlags flags
    const subtreeHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags;
    const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

    if (subtreeHasEffect || rootHasEffect) {
        // beforeMutation
        // mutation Placement
        commitMutationEffect(finishedWork, root);
        root.current = finishedWork;
        // layout
    } else {
        root.current = finishedWork;
    }

    rootDoesHasPassiveEffects = false;
    ensureIsRootScheduled(root);
}
