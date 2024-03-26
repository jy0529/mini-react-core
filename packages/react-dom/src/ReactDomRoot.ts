import { Container } from 'hostConfig';
import { createContainer, updateContainer } from 'react-reconciler/src/ReactFiberReconciler';
import { ReactElement } from 'shared';
import { initEvent } from './events';

export const createRoot = (container: Container) => {
    const root = createContainer(container);

    return {
        render(element: ReactElement) {
            initEvent(container, 'click');
            updateContainer(element, root);
        }
    };
};
