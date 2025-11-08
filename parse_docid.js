const fs = require(fs);
try { const o = JSON.parse(fs.readFileSync(upload.json,utf8)); if (o && o.id) process.stdout.write(o.id); }
catch (e) { process.exit(1); }
