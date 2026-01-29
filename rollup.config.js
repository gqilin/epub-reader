import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';

// 创建自定义的TypeScript配置
const createTSConfig = (overrides = {}) => ({
  tsconfig: './tsconfig.json',
  declaration: false,
  declarationMap: false,
  sourceMap: true,
  ...overrides
});

export default [
  // UMD build
  {
    input: 'src/index.umd.ts',
    output: {
      file: 'dist/epubreader.js',
      format: 'umd',
      name: 'EPUBReader',
      sourcemap: true,
      exports: 'default'
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript(createTSConfig()),
      babel({
        babelHelpers: 'bundled',
        presets: ['@babel/preset-env'],
        extensions: ['.ts', '.js']
      })
    ]
  },
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/epubreader.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationMap: true,
        sourceMap: true
      })
    ]
  },
  // Minified UMD build
  {
    input: 'src/index.umd.ts',
    output: {
      file: 'dist/epubreader.min.js',
      format: 'umd',
      name: 'EPUBReader',
      sourcemap: true,
      exports: 'default'
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript(createTSConfig()),
      babel({
        babelHelpers: 'bundled',
        presets: ['@babel/preset-env'],
        extensions: ['.ts', '.js']
      }),
      terser()
    ]
  }
];