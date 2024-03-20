import { ReactElement } from 'shared';
import { FiberNode } from './ReactFiber';
import { UpdateQueue, processUpdateQueue } from './ReactFiberUpdateQueue';
import { HostComponent, HostRoot, HostText } from './ReactWorkTags';
import { mountChildrenFibers, reconcileChildrenFibers } from './ReactChildFiber';

export const beginWork = (wip: FiberNode): FiberNode | null => {
    switch (wip.tag) {
        case HostRoot:
            return updateHostRoot(wip);
        case HostComponent:
            return updateHostComponent(wip);
        case HostText:
            return null;
        default: {
            if (__DEV__) {
                console.warn('unexpected tag: ' + wip.tag);
            }
            return null;
        }
    }
};

function updateHostRoot(wip: FiberNode): FiberNode | null {
    // 1. update state
    const baseState = wip.memorizedState;
    const updateQueue = wip.updateQueue as UpdateQueue<ReactElement>;

    const pendingUpdate = updateQueue.shared.pending;
    updateQueue.shared.pending = null;

    const { memorizedState } = processUpdateQueue(baseState, pendingUpdate);
    wip.memorizedState = memorizedState;

    // reconcile children
    const nextChildren = wip.memorizedState;
    reconcileChildren(wip, nextChildren);
    return wip.child;
}

function updateHostComponent(wip: FiberNode): FiberNode | null {
    // reconcile children
    const { pendingProps } = wip;
    const nextChildren = pendingProps.children;
    reconcileChildren(wip, nextChildren);

    return wip.child;
}

function reconcileChildren(wip: FiberNode, children: ReactElement): FiberNode {
    const current = wip.alternative;

    if (current !== null) {
        // update
        wip.child = reconcileChildrenFibers(wip, current.child, children);
    } else {
        wip.child = mountChildrenFibers(wip, null, children);
    }
    return wip;
}
