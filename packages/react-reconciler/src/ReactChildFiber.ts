import { REACT_SYMBOL_ELEMENT_TYPE, ReactElement } from 'shared';
import { FiberNode, createFiberNodeFromElement } from './ReactFiber';
import { HostText } from './ReactWorkTags';
import { Placement } from './ReactFiberFlags';

function ChildFiberReconciler(shouldTrackEffects: boolean) {
    function reconcileSingleElement(returnFiber: FiberNode, currentFiber: FiberNode | null, element: ReactElement) {
        const fiber = createFiberNodeFromElement(element);
        fiber.return = returnFiber;
        return fiber;
    }

    function reconcileSingleTextNode(returnFiber: FiberNode, currentFiber: FiberNode | null, content: string | number) {
        const fiberNode = new FiberNode(
            HostText,
            {
                content
            },
            null
        );

        fiberNode.return = returnFiber;
        return fiberNode;
    }

    function placeSingleChild(fiberNode: FiberNode): FiberNode {
        if (shouldTrackEffects === true && fiberNode.alternative === null) {
            fiberNode.flags |= Placement;
        }

        return fiberNode;
    }

    return function reconcileChildFibers(returnFiber: FiberNode, currentFiber: FiberNode | null, newChild?: any) {
        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_SYMBOL_ELEMENT_TYPE: {
                    return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild));
                }
            }
        }
        if (typeof newChild === 'string' || typeof newChild === 'number') {
            return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFiber, newChild));
        }

        return null;
    };
}

export const reconcileChildrenFibers = ChildFiberReconciler(false);
export const mountChildrenFibers = ChildFiberReconciler(true);
