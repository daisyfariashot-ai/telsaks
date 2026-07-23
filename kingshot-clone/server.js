const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000');
const DATA_DIR = path.join(__dirname, '..', 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const INDEX_PATH = path.join(DATA_DIR, 'index.html');
const PUBLIC_DIR = path.join(__dirname, 'public');
const TEMPLATE_PATH = path.join(PUBLIC_DIR, '_index_template.html');

// Ensure data directories exist
[DATA_DIR, UPLOAD_DIR].forEach(function(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// Copy template to volume if no persisted index
if (!fs.existsSync(INDEX_PATH) && fs.existsSync(TEMPLATE_PATH)) {
  fs.copyFileSync(TEMPLATE_PATH, INDEX_PATH);
}

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..'))); // serve root files
app.use('/kingshot-clone/public', express.static(PUBLIC_DIR)); // serve built admin etc.

app.get('/kingshot-clone/public/index.html', function(req, res) {
  if (fs.existsSync(INDEX_PATH)) {
    res.sendFile(INDEX_PATH);
  } else if (fs.existsSync(TEMPLATE_PATH)) {
    res.sendFile(TEMPLATE_PATH);
  } else {
    res.status(404).send('index not found');
  }
});

// Serve uploads from data dir
app.use('/uploads', express.static(UPLOAD_DIR));

app.use(express.static(path.join(__dirname, '..'))); // serve root files
app.use('/kingshot-clone/public', express.static(PUBLIC_DIR)); // serve built admin etc.

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

app.post('/api/upload-apk', upload.single('apk'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: '/uploads/' + req.file.filename });
});

function replaceConfigsInHTML(html, json) {
  const marker = 'var CONFIGS = ';
  const start = html.indexOf(marker);
  if (start === -1) throw new Error('CONFIGS marker not found');
  let pos = start + marker.length;
  let braceCount = 0, started = false, inStr = false, esc = false;
  while (pos < html.length) {
    const ch = html[pos];
    if (esc) { esc = false; pos++; continue; }
    if (ch === '\\' && inStr) { esc = true; pos++; continue; }
    if (ch === '"') { inStr = !inStr; pos++; continue; }
    if (!inStr) {
      if (ch === '{') { braceCount++; started = true; }
      else if (ch === '}') { braceCount--; }
    }
    pos++;
    if (started && braceCount === 0) break;
  }
  while (pos < html.length && html[pos] !== '\n') pos++;
  if (pos < html.length && html[pos] === '\n') pos++;
  return html.slice(0, start) + marker + json + ';\n' + html.slice(pos);
}

app.post('/api/save-config', (req, res) => {
  try {
    const configs = req.body;
    const tplPath = fs.existsSync(TEMPLATE_PATH) ? TEMPLATE_PATH : INDEX_PATH;
    if (!fs.existsSync(tplPath)) throw new Error('no template found');
    let html = fs.readFileSync(tplPath, 'utf-8');
    const json = JSON.stringify(configs, null, 2);
    const updated = replaceConfigsInHTML(html, json);
    fs.writeFileSync(INDEX_PATH, updated, 'utf-8');
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
