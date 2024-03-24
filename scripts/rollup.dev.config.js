import cjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import typescript from 'rollup-plugin-typescript2';
import alias from '@rollup/plugin-alias';
import { getDistPath, getPkgJson, getPkgPath } from './utils';

const reactPkg = getPkgJson('react');
const reactDomPkg = getPkgJson('react-dom');

const replaceVars = {
    __DEV__: true,
    preventAssignment: true
};

const config = [
    {
        input: `${getPkgPath('react')}/${reactPkg.module}`,
        output: {
            name: 'React',
            file: `${getDistPath('react')}/${reactPkg.main}`,
            format: 'umd'
        },
        plugins: [replace(replaceVars), cjs(), typescript()]
    },
    {
        input: `${getPkgPath('react')}/src/ReactJSXElement.ts`,
        output: [
            {
                name: 'jsx-runtime',
                file: `${getDistPath('react')}/jsx-runtime.js`,
                format: 'umd'
            },
            {
                name: 'jsx-dev-runtime',
                file: `${getDistPath('react')}/jsx-dev-runtime.js`,
                format: 'umd'
            }
        ],
        plugins: [replace(replaceVars), cjs(), typescript()]
    },
    // react-dom
    {
        input: `${getPkgPath('react-dom')}/${reactDomPkg.module}`,
        output: [
            {
                name: 'ReactDom',
                file: `${getDistPath('react-dom')}/index.js`,
                format: 'umd'
            },
            {
                name: 'ReactDomClient',
                file: `${getDistPath('react-dom')}/client.js`,
                format: 'umd'
            }
        ],
        external: [...Object.keys(reactDomPkg.peerDependencies)],
        plugins: [
            alias({
                entries: {
                    hostConfig: `${getPkgPath('react-dom')}/src/hostConfig.ts`
                }
            }),
            replace(replaceVars),
            cjs(),
            typescript()
        ]
    }
];

export default config;
