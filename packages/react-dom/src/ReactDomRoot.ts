import { Container } from 'hostConfig';
import { createContainer, updateContainer } from 'react-reconciler/src/ReactFiberReconciler';
import { ReactElement } from 'shared';

export const createRoot = (container: Container) => {
    const root = createContainer(container);

    return {
        render(element: ReactElement) {
            updateContainer(element, root);
        }
    };
};
