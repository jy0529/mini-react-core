import { beginWork } from './ReactBeginWork';
import { completeWork } from './ReactCompleteWork';
import { FiberNode, createWorkInProgress } from './ReactFiber';
import { FiberRoot } from './ReactFiberRoot';
import { HostRoot } from './ReactWorkTags';

let workInProgress: FiberNode | null;

function prepareFreshState(fiberRoot: FiberRoot) {
    workInProgress = createWorkInProgress(fiberRoot.current, {});
}

export function scheduleUpdateOnFiber(fiberNode: FiberNode) {
    const root = markUpdateFromFiberToRoot(fiberNode);
    renderRoot(root);
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

export function renderRoot(root: FiberRoot) {
    prepareFreshState(root);
    do {
        try {
            workLoop();
            break;
        } catch (error) {
            console.error(error);
        }
    } while (true);
}

export function workLoop() {
    while (workInProgress !== null) {
        performUnitOfWork(workInProgress);
    }
}

function performUnitOfWork(unitOfWork: FiberNode) {
    const next: FiberNode | null = beginWork(unitOfWork);
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
