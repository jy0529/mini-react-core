import { FiberNode } from 'react-reconciler/src/ReactFiber';
import { HostText, WorkTag } from 'react-reconciler/src/ReactWorkTags';
import { ReactElementProps } from 'shared';
import { DOMElement, updateFiberProps } from './events';

export type Container = Element;
export type Instance = Element;

export const createInstance = (type: string, props: ReactElementProps): Instance => {
    const element = document.createElement(type) as unknown;
    updateFiberProps(element as DOMElement, props);

    return element as DOMElement;
};

export const appendInitialChildren = (parent: Instance | Container, child: Instance) => {
    parent.appendChild(child);
};

export const createTextInstance = (content: string | number) => {
    return document.createTextNode(String(content));
};

export const appendChildToContainer = (child: Instance, parent: Container) => {
    parent.appendChild(child);
};

export const commitUpdate = (fiberNode: FiberNode) => {
    const tag: WorkTag = fiberNode.tag;
    switch (tag) {
        case HostText: {
            const content = fiberNode.memorizedProps.content;
            commitTextUpdate(fiberNode.stateNode, content);
            break;
        }
        default: {
            if (__DEV__) {
                console.warn('未实现的 update tag', tag);
            }
        }
    }
};

function commitTextUpdate(node: Instance, content: string) {
    node.textContent = content;
}

export const deleteChild = (node: Instance, parent: Container) => {
    parent.removeChild(node);
};

export const insertChildToContainer = (child: Instance, container: Container, before: Instance) => {
    container.insertBefore(child, before);
};

export const scheduleMicroTask =
    typeof queueMicrotask === 'function'
        ? queueMicrotask
        : (callback: () => void) => {
              Promise.resolve().then(callback);
          };
