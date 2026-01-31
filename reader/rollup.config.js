import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import replace from '@rollup/plugin-replace';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/epub-reader.js',
    format: 'iife',
    name: 'EpubReaderLib'
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'global': 'window'
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript()
  ]
};