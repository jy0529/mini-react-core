import path from 'path';
import fs from 'fs';

export const getPkgPath = (name) => {
    return path.resolve(__dirname, `../packages/${name}`);
};

export const getDistPath = (name) => {
    return path.resolve(__dirname, `../dist/${name}`);
};

export const getPkgJson = (name) => {
    const path = `${getPkgPath(name)}/package.json`;
    const str = fs.readFileSync(path, { encoding: 'utf-8' });
    return JSON.parse(str);
};
