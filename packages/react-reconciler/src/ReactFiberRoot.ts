import { Container } from 'hostConfig';
import { FiberNode } from './ReactFiber';
import { Lane, Lanes, NoLane, NoLanes } from './ReactFiberLanes';
import { Effect } from './ReactFiberHook';

export interface PendingPassiveEffect {
    update: Effect[];
    unmount: Effect[];
}
export class FiberRoot {
    current: FiberNode;
    container: Container;
    finishedWork: FiberNode | null;
    pendingLanes: Lanes;
    finishedLane: Lane;
    pendingPassiveEffects: PendingPassiveEffect;

    constructor(container: Container, hostRootFiber: FiberNode) {
        this.current = hostRootFiber;
        this.container = container;
        hostRootFiber.stateNode = this;
        this.finishedWork = null;
        this.pendingLanes = NoLanes;
        this.finishedLane = NoLane;

        this.pendingPassiveEffects = {
            unmount: [],
            update: []
        };
    }
}
