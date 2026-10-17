import * as esbuild from 'esbuild';
import fs from 'node:fs/promises';
import pkgJson from './package.json' with { type: 'json' };

const isWatch = process.argv.includes('--watch');

/**
 * esbuild plugin to transform and minify imported CSS files as raw text strings
 */
const CSSMinifyPlugin = {
  name: 'CSSMinifyPlugin',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const source = await fs.readFile(args.path, 'utf8');
      const minified = await esbuild.transform(source, { loader: 'css', minify: true });
      return { loader: 'text', contents: minified.code };
    });
  },
};

const buildOptions = {
  entryPoints: [pkgJson.main || 'src/ExamplePlugin.ts'],
  outfile: 'dist/plugin.js',
  bundle: true,
  minify: false,
  format: 'esm',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  // The CamelKit client provides these at runtime via import maps; never bundle them.
  external: [
    '@camelkit/core',
    '@camelkit/core/*',
    '@babylonjs/*',
    '@babylonjs/core',
  ],
  plugins: [CSSMinifyPlugin],
  loader: {
    '.html': 'text',
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.jpeg': 'dataurl',
    '.gif': 'dataurl',
    '.svg': 'dataurl',
    '.webp': 'dataurl',
    '.wav': 'dataurl',
    '.mp3': 'dataurl',
  },
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('[CamelKit Plugin-Builder] Watching for source changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('[CamelKit Plugin-Builder] Successfully bundled to dist/plugin.js');
}
