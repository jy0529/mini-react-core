import { Container } from 'hostConfig';
import { FiberNode } from './ReactFiber';
import { Lane, Lanes, NoLane, NoLanes } from './ReactFiberLanes';

export class FiberRoot {
    current: FiberNode;
    container: Container;
    finishedWork: FiberNode | null;
    pendingLanes: Lanes;
    finishedLane: Lane;

    constructor(container: Container, hostRootFiber: FiberNode) {
        this.current = hostRootFiber;
        this.container = container;
        hostRootFiber.stateNode = this;
        this.finishedWork = null;
        this.pendingLanes = NoLanes;
        this.finishedLane = NoLane;
    }
}
