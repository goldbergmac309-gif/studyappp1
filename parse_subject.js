const fs = require("fs");
try {
  const a = JSON.parse(fs.readFileSync("subjects.json", "utf8"));
  if (Array.isArray(a) && a[0] && a[0].id) process.stdout.write(a[0].id);
} catch (e) { process.exit(1); }
