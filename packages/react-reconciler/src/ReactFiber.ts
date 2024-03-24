import { ReactElement, ReactElementProps, ReactKeyType } from 'react-shared';
import { FunctionComponent, HostComponent, WorkTag } from './ReactWorkTags';
import { NoFlags, ReactFlags } from './ReactFiberFlags';

export class FiberNode {
    tag: WorkTag;
    key: ReactKeyType;
    stateNode: any;
    type: any;

    return: FiberNode | null;
    sibling: FiberNode | null;
    child: FiberNode | null;
    index: number;

    pendingProps: ReactElementProps;
    memorizedProps: ReactElementProps;
    memorizedState: any;
    alternative: FiberNode | null;
    flags: ReactFlags;
    subtreeFlags: ReactFlags;
    updateQueue: unknown;
    deletions: FiberNode[] | null;

    constructor(tag: WorkTag, pendingProps: ReactElementProps, key: ReactKeyType) {
        this.tag = tag;
        this.key = key || null;
        this.stateNode = null;

        // relations
        this.return = null;
        this.sibling = null;
        this.child = null;
        this.index = 0;

        // work unit
        this.pendingProps = pendingProps;
        this.memorizedProps = null;
        this.memorizedState = null;
        this.alternative = null;
        this.flags = NoFlags;
        this.subtreeFlags = NoFlags;
        this.updateQueue = null;
        this.deletions = null;
    }
}

export const createWorkInProgress = (current: FiberNode, pendingProps: ReactElementProps): FiberNode => {
    let wip = current.alternative;
    if (wip === null) {
        wip = new FiberNode(current.tag, pendingProps, current.key);
        wip.stateNode = current.stateNode;
        wip.alternative = current;
        current.alternative = wip;
    } else {
        wip.pendingProps = pendingProps;
        wip.flags = NoFlags;
        wip.deletions = null;
    }
    wip.type = current.type;
    wip.updateQueue = current.updateQueue;
    wip.child = current.child;
    wip.memorizedState = current.memorizedState;

    return wip;
};

export const createFiberNodeFromElement = (element: ReactElement): FiberNode => {
    const { type, key, props } = element;
    let workTag: WorkTag = FunctionComponent;
    if (typeof type === 'string') {
        workTag = HostComponent;
    } else if (typeof type !== 'function' && __DEV__) {
        console.warn('未定义的 fiber type');
    }

    const fiberNode = new FiberNode(workTag, props, key);
    fiberNode.type = type;

    return fiberNode;
};
