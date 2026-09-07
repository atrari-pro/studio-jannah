import { writeFile } from 'node:fs/promises';
import { scanUrls } from '../dist/electron/scan-runner.js';

const args = process.argv.slice(2);
if (args.includes('--help') || args.length < 2) {
  console.log('Usage: node scripts/scan-urls.mjs rapport.json URL [URL ...]');
  process.exitCode = args.includes('--help') ? 0 : 1;
} else {
  const [output, ...urls] = args;
  try {
    const report = await scanUrls(urls);
    await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Rapport écrit : ${output} (${report.summary.completed}/${report.summary.requested} pages)`);
    if (report.summary.failed > 0) process.exitCode = 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
