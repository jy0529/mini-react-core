import { jsxDEV as jsx } from './src/ReactJSXElement';
import { Dispatcher, resolveDispatcher } from './src/currentDispatcher';
import currentDispatcher from './src/currentDispatcher';
export const config = {
    version: '0.0.1'
};
export const version = config.version;

export const jsxDEV = jsx;

export const useState: Dispatcher['useState'] = (initialState) => {
    const dispatcher = resolveDispatcher();
    return dispatcher.useState(initialState);
};

export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
    currentDispatcher
};
