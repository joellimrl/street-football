const fs = require('node:fs/promises');
const path = require('node:path');
const { requestJson } = require('../collector/http');
const { validateSnapshot } = require('../collector/model');
const { collect } = require('../collector/collect');
const { createProviders } = require('../collector/providers');
async function preparePublication({ snapshotUrl = 'https://joellimrl.github.io/street-football/data/snapshot.json',
  bootstrap = false, outputDir = path.resolve(__dirname, '../dist'), providers = {}, request = requestJson, now = new Date().toISOString() } = {}) {
  let previous = null;
  try { previous = validateSnapshot(await request(snapshotUrl)); }
  catch (error) {
    if (!(bootstrap && error.status === 404)) {
      if (error.status === 404) throw new Error('Prior snapshot missing; explicit bootstrap required');
      throw error;
    }
  }
  const result = await collect({ previous, ...providers, now });
  if (!previous && providers.fixturesProvider && result.snapshot.sources.fixtures.status !== 'ok') throw new Error('Initial fixture collection failed');
  await fs.mkdir(outputDir, { recursive: true });
  await fs.cp(path.resolve(__dirname, '../public'), outputDir, { recursive: true });
  const dataDir = path.join(outputDir, 'data'); await fs.mkdir(dataDir, { recursive: true });
  const temporary = path.join(dataDir, 'snapshot.json.tmp');
  await fs.writeFile(temporary, JSON.stringify(result.snapshot) + '\n');
  await fs.rename(temporary, path.join(dataDir, 'snapshot.json'));
  return result;
}
if (require.main === module) {
  preparePublication({ snapshotUrl: process.env.SNAPSHOT_URL, bootstrap: process.env.BOOTSTRAP === 'true',
    providers: createProviders({ footballToken: process.env.FOOTBALL_DATA_API_TOKEN, youtubeKey: process.env.YOUTUBE_API_KEY,
      report: event => console.warn(`[collector] ${JSON.stringify(event)}`) })
  }).then(async result => {
    const states = Object.entries(result.snapshot.sources).map(([name, source]) => `${name}: ${source.status}`).join('; ');
    console.log(`[publish] ${result.snapshot.fixtures.length} fixtures; ${states}`);
    if (process.env.GITHUB_OUTPUT) await fs.appendFile(process.env.GITHUB_OUTPUT, `degraded=${result.degraded}\n`);
  }).catch(() => { console.error('[publish] Publication stopped. Check snapshot availability, bootstrap setting and provider configuration. Current deployment preserved.'); process.exitCode = 1; });
}
module.exports = { preparePublication };
