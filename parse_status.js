const fs = require(fs); const id = process.env.DOCID;
try {
  const list = JSON.parse(fs.readFileSync(doclist.json,utf8));
  const it = Array.isArray(list) ? list.find(d => d && d.id === id) : null;
  if (it && it.status) process.stdout.write(it.status);
} catch(e) {}
