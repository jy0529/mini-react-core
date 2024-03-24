import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import replace from '@rollup/plugin-replace';
import path from 'path';

import { getPkgPath } from './utils';

const replaceVars = {
    __DEV__: true,
    preventAssignment: true
};

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), replace(replaceVars)],
    resolve: {
        alias: [
            {
                find: 'react',
                replacement: getPkgPath('react')
            },
            {
                find: 'react-dom',
                replacement: getPkgPath('react-dom')
            },
            {
                find: 'hostConfig',
                replacement: path.resolve(getPkgPath('react-dom'), './src/hostConfig.ts')
            }
        ]
    }
});
