import fs from 'fs';
import path from 'path';

import cjs from 'rollup-plugin-commonjs';
import replace from 'rollup-plugin-replace';
import typescript from 'rollup-plugin-typescript2';

const getPkgPath = (name) => {
    return path.resolve(__dirname, `../packages/${name}`);
};

const getDistPath = (name) => {
    return path.resolve(__dirname, `../dist/${name}`);
};

const getPkgJson = (name) => {
    const path = `${getPkgPath(name)}/package.json`;
    const str = fs.readFileSync(path, { encoding: 'utf-8' });
    return JSON.parse(str);
};

const reactPkg = getPkgJson('react');

const alias = {
    __DEV__: true
};

const config = [
    {
        input: `${getPkgPath('react')}/${reactPkg.module}`,
        output: {
            name: 'React',
            file: `${getDistPath('react')}/${reactPkg.main}`,
            format: 'umd'
        },
        plugins: [replace(alias), cjs(), typescript()]
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
        plugins: [replace(alias), cjs(), typescript()]
    }
];

export default config;
