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
import {
    Lane,
    NoLane,
    SyncLane,
    getHighestPriorityLane,
    laneToSchedulerPriority,
    markRootFinished,
    mergeLanes
} from './ReactFiberLanes';
import { FiberRoot, PendingPassiveEffect } from './ReactFiberRoot';
import { flushSyncCallbacks, scheduleSyncCallback } from './ReactSyncQueue';
import { HostRoot } from './ReactWorkTags';
import {
    unstable_NormalPriority as NormalPriority,
    unstable_scheduleCallback as scheduleCallback,
    unstable_cancelCallback,
    unstable_shouldYield
} from 'scheduler';
import { HookHasSideEffect, Passive } from './ReactHookEffectTags';

let workInProgress: FiberNode | null;
let wipRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;

type RootExitStatus = number;
const RootInComplete: RootExitStatus = 1;
const RootCompleted: RootExitStatus = 2;

function prepareFreshState(fiberRoot: FiberRoot, lane: Lane) {
    fiberRoot.finishedLane = NoLane;
    fiberRoot.finishedWork = null;
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
    const existingCallback = root.callbackNode;
    if (updateLane === NoLane) {
        if (existingCallback !== null) {
            unstable_cancelCallback(existingCallback);
        }
        root.callbackNode = null;
        root.callbackPriority = NoLane;
        return;
    }

    const curPriority = updateLane;
    const prevPriority = root.callbackPriority;
    if (curPriority === prevPriority) {
        return;
    }

    if (existingCallback !== null) {
        unstable_cancelCallback(existingCallback);
    }

    let newCallbackNode;

    if (updateLane === SyncLane) {
        // 同步 微任务
        scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
        scheduleMicroTask(flushSyncCallbacks);
    } else {
        // 其他优先级 宏任务
        const priority = laneToSchedulerPriority(updateLane);
        newCallbackNode = scheduleCallback(priority, performConcurrentWorkOnRoot.bind(null, root));
    }

    root.callbackNode = newCallbackNode;
    root.callbackPriority = curPriority;
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

export function performConcurrentWorkOnRoot(root: FiberRoot, didTimeout?: boolean) {
    // useEffect 回调执行
    const didFlushPassiveEffect = flushPassiveEffect(root.pendingPassiveEffects);
    const curCallbackNode = root.callbackNode;

    if (didFlushPassiveEffect) {
        if (root.callbackNode !== curCallbackNode) {
            return null;
        }
    }

    const lane = getHighestPriorityLane(root.pendingLanes);
    if (lane === NoLane) {
        return;
    }

    const needSync = lane === SyncLane || didTimeout;
    const exitStatus = renderRoot(root, lane, !needSync);

    ensureIsRootScheduled(root);

    if (exitStatus === RootInComplete) {
        // 中断
        if (root.callbackNode !== curCallbackNode) {
            return null;
        }
        return performConcurrentWorkOnRoot.bind(null, root);
    }

    if (exitStatus === RootCompleted) {
        const finishedWork = root.current.alternative;
        root.finishedWork = finishedWork;
        root.finishedLane = lane;
        wipRenderLane = NoLane;
        commitRoot(root);
    } else {
        if (__DEV__) {
            console.warn('还未实现的并发更新退出状态');
        }
    }
}

export function performSyncWorkOnRoot(root: FiberRoot) {
    const nextLane = getHighestPriorityLane(root.pendingLanes);
    if (nextLane !== SyncLane) {
        ensureIsRootScheduled(root);
        return;
    }

    const exitStatus = renderRoot(root, nextLane, false);
    if (exitStatus === RootCompleted) {
        const finishedWork = root.current.alternative;
        root.finishedWork = finishedWork;
        root.finishedLane = nextLane;
        wipRenderLane = NoLane;
        commitRoot(root);
    } else {
        if (__DEV__) {
            console.warn('还未实现的同步更新退出状态');
        }
    }
}

function flushPassiveEffect(pendingPassiveEffects: PendingPassiveEffect) {
    let didFlushPassiveEffect = false;
    pendingPassiveEffects.unmount.forEach((effect) => {
        didFlushPassiveEffect = true;
        commitHookEffectListUnMount(Passive, effect);
    });
    pendingPassiveEffects.unmount = [];

    pendingPassiveEffects.update.forEach((effect) => {
        didFlushPassiveEffect = true;
        commitHookEffectListDestroy(Passive | HookHasSideEffect, effect);
    });

    pendingPassiveEffects.update.forEach((effect) => {
        didFlushPassiveEffect = true;
        commitHookEffectListCreate(Passive | HookHasSideEffect, effect);
    });
    pendingPassiveEffects.update = [];

    flushSyncCallbacks();
    return didFlushPassiveEffect;
}

export function workLoopSync() {
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}

export function workLoopConcurrent() {
    while (workInProgress !== null && !unstable_shouldYield()) {
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

function renderRoot(root: FiberRoot, lane: Lane, shouldTimeSlice: boolean) {
    if (wipRenderLane !== lane) {
        prepareFreshState(root, lane);
    }
    do {
        try {
            shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
            break;
        } catch (error) {
            console.error(error);
        }
    } while (true);

    // 中断了
    if (shouldTimeSlice === true && workInProgress !== null) {
        return RootInComplete;
    }
    // 执行完了
    if (shouldTimeSlice === false && workInProgress !== null && __DEV__) {
        console.warn('非时间切片下，workInProgress 不为 null是错的');
    }
    return RootCompleted;
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
