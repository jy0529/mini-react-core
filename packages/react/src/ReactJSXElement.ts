import {
    ReactElementConfig,
    ReactElementProps,
    ReactElementType,
    ReactElement,
    REACT_SYMBOL_ELEMENT_TYPE
} from 'react-shared';

function createReactElement(type: ReactElementType, key: any, props: ReactElementProps): ReactElement {
    return {
        $$typeof: REACT_SYMBOL_ELEMENT_TYPE,
        type,
        key,
        props
    };
}

export const jsxProd = (type: ReactElementType, config: ReactElementConfig, maybeKey: any) => {
    const props = {};
    const key = '' + maybeKey;

    // 从 config 中提取 props
    // 删除 key 、ref 后的 hasOwnProperty 的 config key
    for (const key in config) {
        if (config && Object.prototype.hasOwnProperty.call(config, key)) {
            if (key !== 'key' && key !== 'ref') {
                props[key] = config[key];
            }
        }
    }

    return createReactElement(type, key, props);
};

export const jsxDEV = jsxProd;
