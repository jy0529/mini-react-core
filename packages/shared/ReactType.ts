export type ReactElementType = any;
export type ReactElementConfig = object;
export type ReactElementProps = any;
export type ReactKeyType = any;

export const REACT_SYMBOL_ELEMENT_TYPE = Symbol.for('react.symbol.element');
export const REACT_SYMBOL_FRAGMENT_TYPE = Symbol.for('react.symbol.fragment');

export type Action<State> = State | ((prevState: State) => State);

export type ReactElement = {
    $$typeof: symbol | number;
    type: ReactElementType;
    key: any;
    props: ReactElementProps;
};
