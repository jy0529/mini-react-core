import { Container, appendChildToContainer } from 'hostConfig';
import { FiberNode } from './ReactFiber';
import { MutationMask, NoFlags, Placement } from './ReactFiberFlags';
import { HostComponent, HostRoot, HostText } from './ReactWorkTags';
import { FiberRoot } from './ReactFiberRoot';

export const commitMutationEffect = (finishedWork: FiberNode) => {
    let nextEffect: FiberNode | null = finishedWork;

    while (nextEffect !== null) {
        const child: FiberNode | null = nextEffect.child;
        if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
            nextEffect = child;
        } else {
            up: while (nextEffect !== null) {
                commitMutationEffectsOnFiber(nextEffect);
                const sibling = nextEffect.sibling;
                if (sibling !== null) {
                    nextEffect = sibling;
                    break up;
                }
                nextEffect = nextEffect.return;
            }
        }
    }
};

function commitMutationEffectsOnFiber(finishedWork: FiberNode) {
    const flags = finishedWork.flags;
    if ((flags & Placement) !== NoFlags) {
        commitPlacement(finishedWork);
        finishedWork.flags &= ~Placement;
    }
    // update
    // childDeletion
}

function commitPlacement(finishedWork: FiberNode) {
    // 1. get host parent
    const hostParent = getHostParent(finishedWork);
    // 2. insert to parent
    if (hostParent !== null) {
        appendPlacementNodeIntoContainer(finishedWork, hostParent);
    }
}

function getHostParent(finishedWork: FiberNode): Container | null {
    let parent = finishedWork.return;

    while (parent) {
        const tag = parent.tag;
        // HostComponent | HostRoot
        if (tag === HostComponent) {
            return parent.stateNode as Container;
        }
        if (tag === HostRoot) {
            return (parent.stateNode as FiberRoot).container as Container;
        }
        parent = parent.return;
    }
    return null;
}

function appendPlacementNodeIntoContainer(finishedWork: FiberNode, hostParent: Container) {
    const tag = finishedWork.tag;
    if (tag === HostComponent || tag === HostText) {
        appendChildToContainer(finishedWork.stateNode, hostParent);
        return;
    }

    const child = finishedWork.child;
    if (child !== null) {
        appendPlacementNodeIntoContainer(child, hostParent);

        let sibling = child.sibling;
        while (sibling !== null) {
            appendPlacementNodeIntoContainer(sibling, hostParent);
            sibling = sibling.sibling;
        }
    }
}
