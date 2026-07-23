const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const CONFIG_PATH = path.join(__dirname, 'data', 'configs.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readConfigs() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function writeConfigs(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

app.get('/api/configs', (req, res) => {
  const all = readConfigs();
  res.json(Object.keys(all).map(k => ({ slug: k, title: all[k].app?.title || k })));
});

app.get('/api/config', (req, res) => {
  const slug = req.query.app;
  if (!slug) return res.status(400).json({ error: '?app=slug required' });
  const all = readConfigs();
  if (!all[slug]) return res.status(404).json({ error: 'not found' });
  res.json(all[slug]);
});

app.post('/api/config', (req, res) => {
  const slug = req.query.app;
  if (!slug) return res.status(400).json({ error: '?app=slug required' });
  const all = readConfigs();
  all[slug] = req.body;
  writeConfigs(all);
  res.json({ ok: true });
});

app.post('/api/configs', (req, res) => {
  const { slug, title } = req.body;
  if (!slug) return res.status(400).json({ error: 'slug required' });
  const all = readConfigs();
  if (all[slug]) return res.status(409).json({ error: 'slug exists' });
  all[slug] = { app: { title: title || slug }, header: { title: 'Google Play' } };
  writeConfigs(all);
  res.json({ ok: true });
});

app.delete('/api/config', (req, res) => {
  const slug = req.query.app;
  if (!slug) return res.status(400).json({ error: '?app=slug required' });
  const all = readConfigs();
  delete all[slug];
  writeConfigs(all);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin panel at http://localhost:${PORT}/admin.html`);
});
