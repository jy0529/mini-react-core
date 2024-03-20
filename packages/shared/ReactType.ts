export type ReactElementType = any;
export type ReactElementConfig = object;
export type ReactElementProps = any;
export type ReactKeyType = any;

export const REACT_SYMBOL_ELEMENT_TYPE = Symbol.for('react.symbol');

export type ReactElement = {
    $$typeof: symbol | number;
    type: ReactElementType;
    key: any;
    props: ReactElementProps;
};
