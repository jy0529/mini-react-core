import { Container } from 'hostConfig';
import { FiberNode } from './ReactFiber';

export class FiberRoot {
    current: FiberNode;
    container: Container;
    finishedWork: FiberNode | null;

    constructor(container: Container, hostRootFiber: FiberNode) {
        this.current = hostRootFiber;
        this.container = container;
        this.finishedWork = null;
    }
}
