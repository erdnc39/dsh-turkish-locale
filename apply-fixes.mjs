// Apply reviewed terminology/consistency fixes to the tr batch files.
// Each fix: [batchId, namespace, key, newValue]. Also reverts command.token.*
// translations (the typed-command alias map is built statically from zh+en,
// so a tr token would be displayable but untypeable).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const trDir = join(root, 'i18n-work', 'tr');

const FIXES = [
  // -- status vocabulary -----------------------------------------------------
  ['02', 'trajectory', 'status.pending', 'Bekliyor'],
  ['08', 'agent-team', 'status.pending', 'Bekliyor'],
  // -- shared settings notices (align subagent copy to the 3x majority) ------
  ['02', 'settings.subagent', 'readOnly', 'Bu dağıtım, ayarları salt okunur olarak saklar.'],
  ['02', 'settings.subagent', 'unavailable', 'Bu eklenti yüklenmediğinden şu anda yapılandırılamaz.'],
  ['02', 'settings.subagent', 'saveFailed', 'Dağıtım bu değerleri kabul etmedi; düzeltmeniz için bıraktık.'],
  ['08', 'settings.webSearch', 'overridden', 'Üzerine yazıldı'],
  ['08', 'settings.shell', 'overridden', 'Üzerine yazıldı'],
  ['08', 'settings.agentLoop', 'overridden', 'Üzerine yazıldı'],
  // -- job vocabulary --------------------------------------------------------
  ['01b', 'conversation', 'detail.jobs.count', '{count} arka plan görevi'],
  ['01a', 'conversation', 'detail.schedule.count', '{count} hatırlatma'],
  ['03a', 'pluginManager', 'partsCountRunning', '{count} çalışıyor'],
  ['03a', 'pluginManager', 'installedTitle', 'Kurulu'],
  // -- same notice, two namespaces ------------------------------------------
  ['01b', 'conversation', 'command.attachmentsUnsupported', '/{command} ek kabul etmiyor; önce kaldırın'],
  // -- units: majority style is m/s -----------------------------------------
  ['03b', 'job', 'duration.minutes', '{minutes}m {seconds}s'],
  ['07a', 'subagent', 'duration.seconds', '{seconds}s'],
  ['07a', 'subagent', 'duration.minutes', '{minutes}m {seconds}s'],
  ['07a', 'subagent', 'tokens.total', '{value} jeton'],
  // -- settings row label ----------------------------------------------------
  ['06a', 'settings.ourFreeModel', 'forward.baseUrl', 'Temel URL'],
  // -- schedule: manager is canonical; catalog follows ----------------------
  ['06b', 'schedule.catalog', 'list.nextRun', 'Sıradaki çalışma'],
  ['06b', 'schedule.catalog', 'frequency.weekly', 'Her hafta {weekdays} {time} ({timeZone})'],
  ['06b', 'schedule.catalog', 'frequency.weeklyLocal', 'Her hafta {weekdays} {time}'],
  ['06b', 'schedule.catalog', 'cron.time.joinedEveryMinute', 'her dakika'],
  ['06b', 'schedule.catalog', 'cron.time.joinedEveryHour', 'her saat'],
  ['06b', 'schedule.catalog', 'cron.time.hoursEveryMinute', '{hours} saatleri boyunca her dakika'],
  ['06b', 'schedule.catalog', 'cron.time.hoursEveryMinutes', '{hours} saatleri boyunca her {step} dakikada bir'],
  ['06b', 'schedule.catalog', 'cron.time.hoursAt', '{hours} saatlerinde {minutes}. dakikada'],
  ['06b', 'schedule.catalog', 'relative.now', 'Zamanı geldi'],
  // -- schedule manager: Intl locale code must be tr; weekdays translatable -
  ['04a', 'schedule.manager', 'time.locale', 'tr'],
  ['04a', 'schedule.manager', 'frequency.weekday.1', 'Pzt'],
  ['04a', 'schedule.manager', 'frequency.weekday.2', 'Sal'],
  ['04a', 'schedule.manager', 'frequency.weekday.3', 'Çar'],
  ['04a', 'schedule.manager', 'frequency.weekday.4', 'Per'],
  ['04a', 'schedule.manager', 'frequency.weekday.5', 'Cum'],
  ['04a', 'schedule.manager', 'frequency.weekday.6', 'Cmt'],
  ['04a', 'schedule.manager', 'frequency.weekday.7', 'Paz'],
  // -- excel parser lang: analogous locale code ------------------------------
  ['08', 'sidebarExcel', 'language', 'tr'],
  // -- command tokens: must stay typeable (alias map is zh/en-static) --------
  ['07b', 'command', 'token.goal', 'goal'],
  ['07b', 'command', 'token.plan', 'plan'],
  ['07b', 'command', 'token.feedback', 'feedback'],
  ['07b', 'command', 'token.compact', 'compact'],
  ['07b', 'command', 'token.permission', 'permission'],
  ['07b', 'command', 'token.export', 'export'],
];

const byBatch = new Map();
for (const [batch, ns, key, value] of FIXES) {
  if (!byBatch.has(batch)) byBatch.set(batch, []);
  byBatch.get(batch).push([ns, key, value]);
}
for (const [batch, edits] of byBatch) {
  const path = join(trDir, `batch-${batch}.json`);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  for (const [ns, key, value] of edits) {
    const dict = data.dicts[ns];
    if (!dict || !(key in dict)) throw new Error(`batch-${batch}: missing ${ns}.${key}`);
    dict[key] = value;
  }
  writeFileSync(path, JSON.stringify(data, null, 1));
  console.log(`batch-${batch}: ${edits.length} fix(es)`);
}
console.log(`applied ${FIXES.length} fixes across ${byBatch.size} batches`);
