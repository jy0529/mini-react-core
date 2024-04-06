import {
    Container,
    Instance,
    appendChildToContainer,
    commitUpdate,
    deleteChild,
    insertChildToContainer
} from 'hostConfig';
import { FiberNode } from './ReactFiber';
import {
    ChildDeletion,
    MutationMask,
    NoFlags,
    PassiveEffect,
    PassiveMask,
    Placement,
    ReactFlags,
    Update
} from './ReactFiberFlags';
import { FunctionComponent, HostComponent, HostRoot, HostText } from './ReactWorkTags';
import { FiberRoot, PendingPassiveEffect } from './ReactFiberRoot';
import { Effect, FCComponentUpdateQueue } from './ReactFiberHook';
import { HookHasSideEffect } from './ReactHookEffectTags';

export const commitMutationEffect = (finishedWork: FiberNode, root: FiberRoot) => {
    let nextEffect: FiberNode | null = finishedWork;

    while (nextEffect !== null) {
        const child: FiberNode | null = nextEffect.child;
        if ((nextEffect.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags && child !== null) {
            nextEffect = child;
        } else {
            up: while (nextEffect !== null) {
                commitMutationEffectsOnFiber(nextEffect, root);
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

function commitMutationEffectsOnFiber(finishedWork: FiberNode, root: FiberRoot) {
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
                commitChildDeletion(childToDelete, root);
            });
        }
        finishedWork.flags &= ~ChildDeletion;
    }

    if ((flags & PassiveEffect) !== NoFlags) {
        commitPassiveEffect(finishedWork, root, 'update');
        finishedWork.flags &= ~PassiveEffect;
    }
}

function commitPassiveEffect(fiber: FiberNode, root: FiberRoot, type: keyof PendingPassiveEffect) {
    if (fiber.tag !== FunctionComponent || (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)) {
        return;
    }
    const updateQueue = fiber.updateQueue as FCComponentUpdateQueue<any>;
    if (updateQueue !== null) {
        if (updateQueue.lastEffect === null && __DEV__) {
            console.error('Should have update queue, but it was not');
        }
        root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect);
    }
}

function commitPlacement(finishedWork: FiberNode) {
    // 1. get host parent
    const hostParent = getHostParent(finishedWork);
    // get host sibling
    const sibling = getHostSibling(finishedWork);
    // 2. insert to parent
    if (hostParent !== null) {
        insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling);
    }
}

function getHostSibling(finishedWork: FiberNode) {
    let node = finishedWork;

    whileSibling: while (true) {
        while (node.sibling === null) {
            const parent = node.return;

            if (parent === null || parent.tag === HostComponent || parent.tag === HostRoot) {
                return null;
            }

            node = parent;
        }

        node.sibling.return = node.return;
        node = node.sibling;

        while (node.tag !== HostText && node.tag !== HostComponent) {
            if ((node.flags & Placement) !== NoFlags) {
                continue whileSibling;
            }
            if (node.child === null) {
                continue whileSibling;
            } else {
                node.child.return = node;
                node = node.child;
            }
        }
        if ((node.flags & Placement) === NoFlags) {
            return node.stateNode;
        }
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

function insertOrAppendPlacementNodeIntoContainer(finishedWork: FiberNode, hostParent: Container, before?: Instance) {
    const tag = finishedWork.tag;
    if (tag === HostComponent || tag === HostText) {
        if (before) {
            insertChildToContainer(finishedWork.stateNode, hostParent, before);
        } else {
            appendChildToContainer(finishedWork.stateNode, hostParent);
        }
        return;
    }

    const child = finishedWork.child;
    if (child !== null) {
        insertOrAppendPlacementNodeIntoContainer(child, hostParent);

        let sibling = child.sibling;
        while (sibling !== null) {
            insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
            sibling = sibling.sibling;
        }
    }
}

function recordHostChildrenToDelete(childrenToDelete: FiberNode[], unmountFiber: FiberNode) {
    const lastOne = childrenToDelete[childrenToDelete.length - 1];
    if (!lastOne) {
        childrenToDelete.push(unmountFiber);
    } else {
        let node = lastOne.sibling;
        while (node !== null) {
            if (unmountFiber === node) {
                childrenToDelete.push(unmountFiber);
            }
            node = node.sibling;
        }
    }
}

function commitChildDeletion(childToDelete: FiberNode, root: FiberRoot) {
    const rootChildrenToDelete: FiberNode[] = [];
    commitNestChildDeletion(childToDelete, (unmountFiber: FiberNode) => {
        switch (unmountFiber.tag) {
            case HostComponent: {
                recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
                break;
            }
            case HostText: {
                recordHostChildrenToDelete(rootChildrenToDelete, unmountFiber);
                break;
            }
            case FunctionComponent: {
                commitPassiveEffect(unmountFiber, root, 'unmount');
                break;
            }
            default: {
                if (__DEV__) {
                    console.warn('未识别的 unmount fiber tag', unmountFiber.tag);
                }
            }
        }
    });
    if (rootChildrenToDelete.length !== 0) {
        const parent = getHostParent(childToDelete);
        if (parent !== null) {
            rootChildrenToDelete.forEach((childToDelete) => {
                deleteChild((childToDelete as FiberNode).stateNode, parent);
            });
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

export function commitHookEffectList(flags: ReactFlags, lastEffect: Effect, callback: (effect: Effect) => void) {
    let effect = lastEffect.next as Effect;

    do {
        if ((effect.tag & flags) === flags) {
            callback(effect);
        }
        effect = effect.next as Effect;
    } while (effect !== lastEffect.next);
}

export function commitHookEffectListUnMount(flags: ReactFlags, lastEffect: Effect) {
    commitHookEffectList(flags, lastEffect, (effect) => {
        const destroy = effect.destroy;
        if (typeof destroy === 'function') {
            destroy();
        }
        effect.tag &= ~HookHasSideEffect;
    });
}

export function commitHookEffectListDestroy(flags: ReactFlags, lastEffect: Effect) {
    commitHookEffectList(flags, lastEffect, (effect) => {
        const destroy = effect.destroy;
        if (typeof destroy === 'function') {
            destroy();
        }
    });
}

export function commitHookEffectListCreate(flags: ReactFlags, lastEffect: Effect) {
    commitHookEffectList(flags, lastEffect, (effect) => {
        const create = effect.create;
        if (typeof create === 'function') {
            effect.destroy = create();
        }
    });
}
