import { Container, appendChildToContainer, commitUpdate, deleteChild } from 'hostConfig';
import { FiberNode } from './ReactFiber';
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from './ReactFiberFlags';
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
    if ((flags & Update) !== NoFlags) {
        commitUpdate(finishedWork);
        finishedWork.flags &= ~Update;
    }

    // childDeletion
    if ((flags & ChildDeletion) !== NoFlags) {
        if (finishedWork.deletions !== null) {
            finishedWork.deletions.forEach((childToDelete) => {
                commitChildDeletion(childToDelete);
            });
        }
        finishedWork.flags &= ~ChildDeletion;
    }
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

function commitChildDeletion(childToDelete: FiberNode) {
    let rootChildrenToDelete: FiberNode | null = null;
    commitNestChildDeletion(childToDelete, (unmountFiber: FiberNode) => {
        switch (unmountFiber.tag) {
            case HostComponent: {
                if (rootChildrenToDelete === null) {
                    rootChildrenToDelete = unmountFiber;
                }
                break;
            }
            case HostText: {
                if (rootChildrenToDelete === null) {
                    rootChildrenToDelete = unmountFiber;
                }
                break;
            }
            default: {
                if (__DEV__) {
                    console.warn('未识别的 unmount fiber tag', unmountFiber.tag);
                }
            }
        }
    });
    if (rootChildrenToDelete !== null) {
        const parent = getHostParent(rootChildrenToDelete);
        if (parent !== null) {
            deleteChild((rootChildrenToDelete as FiberNode).stateNode, parent);
        }
    }
    childToDelete.return = null;
    childToDelete.child = null;
}

function commitNestChildDeletion(node: FiberNode, onCommitUnmount: (fiberNode: FiberNode) => void) {
    let current = node;

    while (true) {
        onCommitUnmount(current);
        if (current.child) {
            current.child.return = current;
            current = current.child;
            continue;
        }

        if (current === node) {
            return;
        }

        while (current.sibling === null) {
            if (current.return === null || current === node) {
                return;
            }
            current = current.return;
        }
        current.sibling.return = current.return;
        current = current.sibling;
    }
}