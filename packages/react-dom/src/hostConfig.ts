export type Container = Element;
export type Instance = Element;

export const createInstance = (type: string): Instance => {
    // TODO props
    const element = document.createElement(type);
    return element;
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
