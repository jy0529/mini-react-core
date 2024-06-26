import { ReactElement } from 'react-shared';
import { FiberNode } from './ReactFiber';
import { UpdateQueue, processUpdateQueue } from './ReactFiberUpdateQueue';
import { Fragment, FunctionComponent, HostComponent, HostRoot, HostText } from './ReactWorkTags';
import { mountChildrenFibers, reconcileChildrenFibers } from './ReactChildFiber';
import { renderWithHooks } from './ReactFiberHook';
import { Lane } from './ReactFiberLanes';

export const beginWork = (wip: FiberNode, renderLane: Lane): FiberNode | null => {
    switch (wip.tag) {
        case HostRoot:
            return updateHostRoot(wip, renderLane);
        case HostComponent:
            return updateHostComponent(wip);
        case HostText:
            return null;
        case FunctionComponent:
            return updateFunctionComponent(wip, renderLane);
        case Fragment:
            return updateFragment(wip);
        default: {
            if (__DEV__) {
                console.warn('unexpected tag: ' + wip.tag);
            }
            return null;
        }
    }
};

function updateHostRoot(wip: FiberNode, renderLane: Lane): FiberNode | null {
    // 1. update state
    const baseState = wip.memorizedState;
    const updateQueue = wip.updateQueue as UpdateQueue<ReactElement>;

    const pendingUpdate = updateQueue.shared.pending;
    updateQueue.shared.pending = null;

    const { memorizedState } = processUpdateQueue(baseState, pendingUpdate, renderLane);
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

function updateFunctionComponent(wip: FiberNode, renderLane: Lane): FiberNode | null {
    const nextChildren = renderWithHooks(wip, renderLane);
    reconcileChildren(wip, nextChildren);
    return wip.child;
}

function updateFragment(wip: FiberNode): FiberNode | null {
    const nextChildren = wip.pendingProps;
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
