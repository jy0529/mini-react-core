import {
    REACT_SYMBOL_ELEMENT_TYPE,
    REACT_SYMBOL_FRAGMENT_TYPE,
    ReactElement,
    ReactElementProps,
    ReactKeyType
} from 'react-shared';
import { FiberNode, createFiberNodeFromElement, createFiberNodeFromFragment, createWorkInProgress } from './ReactFiber';
import { Fragment, HostText } from './ReactWorkTags';
import { ChildDeletion, Placement } from './ReactFiberFlags';

type ExistingChildren = Map<string, FiberNode>;

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

    function deleteRemainingChildren(returnFiber: FiberNode, childToDelete: FiberNode | null) {
        if (childToDelete === null || shouldTrackEffects === false) {
            return;
        }
        while (childToDelete !== null) {
            deleteChild(returnFiber, childToDelete);
            childToDelete = childToDelete.sibling;
        }
    }

    function reconcileSingleElement(returnFiber: FiberNode, currentFiber: FiberNode | null, element: ReactElement) {
        const key = element.key;

        while (currentFiber !== null) {
            if (key === currentFiber.key) {
                if (element.$$typeof === REACT_SYMBOL_ELEMENT_TYPE) {
                    if (element.type === currentFiber.type) {
                        // reuse
                        let props = element.props;
                        if (element.type === REACT_SYMBOL_FRAGMENT_TYPE) {
                            props = element.props.children;
                        }
                        const existing = useFiber(currentFiber, props);
                        existing.return = returnFiber;
                        // 删除剩下所有 sibling
                        deleteRemainingChildren(returnFiber, currentFiber.sibling);
                        return existing;
                    }
                    // key 相同、type 不一样
                    deleteRemainingChildren(returnFiber, currentFiber);
                    break;
                } else {
                    if (__DEV__) {
                        console.warn('未定义的 react element 类型', element.type);
                        break;
                    }
                }
            } else {
                // key 不同、type 不同
                // delete
                deleteChild(returnFiber, currentFiber);
                currentFiber = currentFiber.sibling;
            }
        }

        // create
        let fiber;
        if (element.type === REACT_SYMBOL_FRAGMENT_TYPE) {
            fiber = createFiberNodeFromFragment(element.props.children, key);
        } else {
            fiber = createFiberNodeFromElement(element);
        }
        fiber.return = returnFiber;
        return fiber;
    }

    function reconcileSingleTextNode(returnFiber: FiberNode, currentFiber: FiberNode | null, content: string | number) {
        while (currentFiber !== null) {
            if (currentFiber.tag === HostText) {
                const existing = useFiber(currentFiber, { content });
                existing.return = returnFiber;
                deleteRemainingChildren(returnFiber, currentFiber.sibling);
                return existing;
            }
            deleteChild(returnFiber, currentFiber);
            currentFiber = currentFiber.sibling;
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

    function reconcileChildrenArray(returnFiber: FiberNode, currentFirstChild: FiberNode | null, newChild: any[]) {
        let lastPlaceIndex = 0;
        let lastNewFiber: FiberNode | null = null;
        let firstNewFiber: FiberNode | null = null;

        // 1. 将 current 保存在 map 中
        const existingChildren: ExistingChildren = new Map();
        let current = currentFirstChild;
        while (current !== null) {
            const keyToUse = current.key !== null ? current.key : current.index;
            existingChildren.set(keyToUse, current);
            current = current.sibling;
        }

        for (let i = 0; i < newChild.length; i++) {
            // 2. 遍历 newChild, 寻找是否可复用
            const after = newChild[i];
            const newFiber = updateFromMap(returnFiber, existingChildren, i, after);

            if (newFiber === null) {
                continue;
            }
            newFiber.index = i;
            newFiber.return = returnFiber;

            // 3. 标记移动还是插入
            if (lastNewFiber === null) {
                lastNewFiber = newFiber;
                firstNewFiber = newFiber;
            } else {
                lastNewFiber.sibling = newFiber;
                lastNewFiber = lastNewFiber.sibling;
            }
            if (!shouldTrackEffects) {
                continue;
            }

            const current = newFiber.alternative;
            if (current !== null) {
                // update
                const oldIndex = current.index;
                if (oldIndex < lastPlaceIndex) {
                    // 移动
                    newFiber.flags |= Placement;
                    continue;
                } else {
                    lastPlaceIndex = oldIndex;
                }
            } else {
                // mount
                newFiber.flags |= Placement;
            }
        }

        // 4. 将 Map 中剩下的标记为删除
        existingChildren.forEach((fiber) => {
            deleteChild(returnFiber, fiber);
        });

        return firstNewFiber;
    }

    function updateFromMap(
        returnFiber: FiberNode,
        existingChildren: ExistingChildren,
        index: number,
        element: any
    ): FiberNode | null {
        const keyToUse = element.key !== null ? element.key : element.index;
        const before = existingChildren.get(keyToUse);

        if (typeof element === 'string' || typeof element === 'number') {
            // HostText
            if (before) {
                return useFiber(before, { content: element + '' });
            } else {
                return new FiberNode(HostText, { content: element + '' }, keyToUse);
            }
        }
        if (typeof element === 'object' && element !== null) {
            if (Array.isArray(element)) {
                updateFragment(returnFiber, before, element, keyToUse, existingChildren);
            }
            switch (element.$$typeof) {
                case REACT_SYMBOL_ELEMENT_TYPE: {
                    if (element.type === REACT_SYMBOL_FRAGMENT_TYPE) {
                        return updateFragment(returnFiber, before, element, keyToUse, existingChildren);
                    }
                    if (before) {
                        if (before.type === element.type) {
                            existingChildren.delete(keyToUse);
                            return useFiber(before, element.props);
                        }
                    } else {
                        return createFiberNodeFromElement(element);
                    }
                }
            }
        }

        return null;
    }

    return function reconcileChildFibers(returnFiber: FiberNode, currentFiber: FiberNode | null, newChild?: any) {
        // Fragment
        const isUnKeyedTopLevelFragment =
            typeof newChild !== 'object' &&
            newChild !== null &&
            newChild.key !== null &&
            newChild.type === REACT_SYMBOL_FRAGMENT_TYPE;

        if (isUnKeyedTopLevelFragment) {
            newChild = newChild.props.children;
        }

        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_SYMBOL_ELEMENT_TYPE: {
                    return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild));
                }
            }
            if (Array.isArray(newChild)) {
                reconcileChildrenArray(returnFiber, currentFiber, newChild);
            }
        }
        if (typeof newChild === 'string' || typeof newChild === 'number') {
            return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFiber, newChild));
        }

        if (currentFiber !== null) {
            deleteRemainingChildren(returnFiber, currentFiber);
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

function updateFragment(
    returnFiber: FiberNode,
    current: FiberNode | undefined,
    elements: any[],
    key: ReactKeyType,
    existingChildren: ExistingChildren
) {
    let fiber: FiberNode | null;
    if (!current || current.tag !== Fragment) {
        fiber = createFiberNodeFromFragment(elements, key);
    } else {
        existingChildren.delete(key);
        fiber = useFiber(current, elements);
    }
    fiber.return = returnFiber;
    return fiber;
}

export const reconcileChildrenFibers = ChildFiberReconciler(true);
export const mountChildrenFibers = ChildFiberReconciler(false);
