import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import dts from 'rollup-plugin-dts';

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/aura.umd.js',
        format: 'umd',
        name: 'Aura',
        sourcemap: true,
        exports: 'default',
      },
      {
        file: 'dist/aura.esm.js',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        outDir: 'dist',
        declaration: false,
        noEmit: false,
        incremental: false,
        include: ['src/**/*.ts'],
        exclude: ['node_modules', 'example/**', 'portfolio/**', '**/*.tsx', 'next-env.d.ts'],
      }),
      terser({
        compress: { passes: 2, pure_getters: true, unsafe_arrows: true },
        mangle: { properties: { regex: /^_/ } },
        format: { comments: false },
      }),
    ],
  },
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/aura.d.ts',
      format: 'es',
    },
    plugins: [dts()],
  },
];
