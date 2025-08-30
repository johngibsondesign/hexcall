import { build } from 'esbuild';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

async function main() {
  const entries = [
    { in: 'electron/main.ts', out: 'dist/electron/main.js' },
    { in: 'electron/preload.ts', out: 'dist/electron/preload.js' },
  ];
  for (const e of entries) {
    mkdirSync(dirname(e.out), { recursive: true });
    await build({
      entryPoints: [e.in],
      outfile: e.out,
      platform: 'node',
      target: 'node20',
      bundle: true,
      sourcemap: false,
      format: 'cjs',
      external: ['electron-updater', 'electron'],
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


