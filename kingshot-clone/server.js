const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
const PORT = parseInt(process.env.PORT || '3000');
const CONFIG_PATH = path.join(__dirname, 'data', 'configs.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..'))); // serve root files
app.use('/kingshot-clone/public', express.static(path.join(__dirname, 'public')));

function readConfigs() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function writeConfigs(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: '/uploads/' + req.file.filename });
});

app.post('/api/save-config', (req, res) => {
  try {
    const configs = req.body;
    const indexPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(indexPath, 'utf-8');
    const json = JSON.stringify(configs, null, 2);
    const updated = html.replace(/var CONFIGS = \{[\s\S]*?\};\n/, 'var CONFIGS = ' + json + ';\n');
    fs.writeFileSync(indexPath, updated, 'utf-8');
    // Also save to configs.json for the original API
    writeConfigs(configs);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
