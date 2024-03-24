import { Container, appendInitialChildren, createInstance, createTextInstance } from 'hostConfig';
import { FiberNode } from './ReactFiber';
import { FunctionComponent, HostComponent, HostRoot, HostText } from './ReactWorkTags';
import { NoFlags, Update } from './ReactFiberFlags';

function markUpdate(fiberNode: FiberNode) {
    fiberNode.flags |= Update;
}

export const completeWork = (wip: FiberNode) => {
    const { tag, alternative } = wip;

    switch (tag) {
        case HostComponent: {
            // mount 时构建离屏的 DOM 树
            if (alternative !== null && wip.stateNode) {
                // TODO
            } else {
                // 1. 创建节点
                const instance = createInstance(wip.type);
                // 2. 添加 children
                appendAllChildren(instance, wip);
                wip.stateNode = instance;
            }
            bubbleProperties(wip);
            return null;
        }
        case HostText: {
            // mount 时构建离屏的 DOM 树
            if (alternative !== null && wip.stateNode) {
                // update
                const oldText = alternative.memorizedProps.content;
                const newText = wip.memorizedProps.content;
                if (oldText !== newText) {
                    markUpdate(wip);
                }
            } else {
                // 1. 创建节点
                const instance = createTextInstance(wip.pendingProps.content);
                wip.stateNode = instance;
            }
            bubbleProperties(wip);
            break;
        }
        case HostRoot: {
            bubbleProperties(wip);
            break;
        }
        case FunctionComponent: {
            bubbleProperties(wip);
            break;
        }
    }
};

function appendAllChildren(parent: Container, wip: FiberNode) {
    let node = wip.child;

    while (node !== null) {
        if (node.tag === HostComponent || node.tag === HostText) {
            appendInitialChildren(parent, node.stateNode);
        } else if (node.child !== null) {
            node.child.return = node;
            node = node.child;
            continue;
        }

        if (node === wip) {
            return;
        }

        while (node.sibling === null) {
            if (node.return === null || node.return === wip) {
                return;
            }
            node = node?.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
    }
}

function bubbleProperties(wip: FiberNode) {
    let subtreeFlags = NoFlags;
    let child = wip.child;

    while (child !== null) {
        subtreeFlags |= child.subtreeFlags;
        subtreeFlags |= child.flags;

        child.return = wip;
        child = child.sibling;
    }
    wip.subtreeFlags |= subtreeFlags;
}
