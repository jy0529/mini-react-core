import { REACT_SYMBOL_ELEMENT_TYPE, ReactElement, ReactElementProps } from 'react-shared';
import { FiberNode, createFiberNodeFromElement, createWorkInProgress } from './ReactFiber';
import { HostText } from './ReactWorkTags';
import { ChildDeletion, Placement } from './ReactFiberFlags';

function ChildFiberReconciler(shouldTrackEffects: boolean) {
    function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
        if (shouldTrackEffects === false) {
            return;
        }
        const deletions = returnFiber.deletions;
        if (deletions === null) {
            returnFiber.deletions = [childToDelete];
            returnFiber.flags |= ChildDeletion;
        } else {
            returnFiber.deletions?.push(childToDelete);
        }
    }

    function reconcileSingleElement(returnFiber: FiberNode, currentFiber: FiberNode | null, element: ReactElement) {
        const key = element.key;

        work: if (currentFiber !== null) {
            if (key === currentFiber.key) {
                if (element.$$typeof === REACT_SYMBOL_ELEMENT_TYPE) {
                    if (element.type === currentFiber.type) {
                        // reuse
                        const existing = useFiber(currentFiber, element.props);
                        existing.return = returnFiber;
                        return existing;
                    }
                    deleteChild(returnFiber, currentFiber);
                    break work;
                } else {
                    if (__DEV__) {
                        console.warn('未定义的 react element 类型', element.type);
                        break work;
                    }
                }
            } else {
                // delete
                deleteChild(returnFiber, currentFiber);
            }
        }

        // create
        const fiber = createFiberNodeFromElement(element);
        fiber.return = returnFiber;
        return fiber;
    }

    function reconcileSingleTextNode(returnFiber: FiberNode, currentFiber: FiberNode | null, content: string | number) {
        if (currentFiber !== null) {
            if (currentFiber.tag === HostText) {
                const existing = useFiber(currentFiber, { content });
                existing.return = returnFiber;
                return existing;
            }
            deleteChild(returnFiber, currentFiber);
        }

        // create
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

        if (currentFiber !== null) {
            deleteChild(returnFiber, currentFiber);
        }

        return null;
    };
}

function useFiber(fiberNode: FiberNode, pendingProps: ReactElementProps) {
    const clone = createWorkInProgress(fiberNode, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
}

export const reconcileChildrenFibers = ChildFiberReconciler(true);
export const mountChildrenFibers = ChildFiberReconciler(false);
