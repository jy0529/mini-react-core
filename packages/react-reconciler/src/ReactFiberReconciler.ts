import { Container } from 'hostConfig';
import { FiberNode } from './ReactFiber';
import { HostRoot } from './ReactWorkTags';
import { FiberRoot } from './ReactFiberRoot';
import { UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdateQueue } from './ReactFiberUpdateQueue';
import { ReactElement } from 'react-shared';
import { scheduleUpdateOnFiber } from './ReactWorkLoop';
import { requestUpdateLane } from './ReactFiberLanes';

export const createContainer = (container: Container): FiberRoot => {
    const hostRootFiber = new FiberNode(HostRoot, {}, null);
    const root = new FiberRoot(container, hostRootFiber);
    hostRootFiber.updateQueue = createUpdateQueue();
    return root;
};

export const updateContainer = (element: ReactElement | null, root: FiberRoot) => {
    const hostRootFiber = root.current;
    const lane = requestUpdateLane();
    const update = createUpdate<ReactElement | null>(element, lane);

    enqueueUpdateQueue(hostRootFiber.updateQueue as UpdateQueue<ReactElement | null>, update);

    scheduleUpdateOnFiber(hostRootFiber, lane);

    return element;
};
