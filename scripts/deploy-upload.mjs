import SftpClient from 'ssh2-sftp-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOCAL_DIR = process.env.DEPLOY_LOCAL || path.resolve(__dirname, '../../dist');
const REMOTE_DIR =
  process.env.DEPLOY_REMOTE || '/home/adminanmkavps/web/theboutiqueline.anmka.com/public_html';

const config = {
  host: process.env.DEPLOY_HOST || '77.237.232.181',
  port: Number(process.env.DEPLOY_PORT || 22),
  username: process.env.DEPLOY_USER || 'root',
  password: process.env.DEPLOY_PASS || process.argv[2],
  readyTimeout: 20000,
  tryKeyboard: true,
};

async function uploadDir(sftp, localPath, remotePath) {
  const entries = fs.readdirSync(localPath, { withFileTypes: true });
  for (const entry of entries) {
    const lp = path.join(localPath, entry.name);
    const rp = `${remotePath}/${entry.name}`.replace(/\\/g, '/');
    if (entry.isDirectory()) {
      await sftp.mkdir(rp, true).catch(() => {});
      await uploadDir(sftp, lp, rp);
    } else {
      await sftp.put(lp, rp);
      process.stdout.write(`  ↑ ${entry.name}\n`);
    }
  }
}

async function main() {
  if (!config.password) {
    console.error('DEPLOY_PASS is required');
    process.exit(1);
  }
  if (!fs.existsSync(LOCAL_DIR)) {
    console.error(`Local dist not found: ${LOCAL_DIR}`);
    process.exit(1);
  }

  const sftp = new SftpClient();
  console.log(`Connecting to ${config.host}:${config.port}...`);
  await sftp.connect(config);
  console.log('Connected.');

  const exists = await sftp.exists(REMOTE_DIR);
  if (!exists) {
    console.error(`Remote path missing: ${REMOTE_DIR}`);
    const webRoot = '/home/adminanmkavps/web';
    if (await sftp.exists(webRoot)) {
      const dirs = await sftp.list(webRoot);
      console.log('Available web dirs:', dirs.map((d) => d.name).join(', '));
    }
    await sftp.end();
    process.exit(1);
  }

  console.log(`Uploading ${LOCAL_DIR} → ${REMOTE_DIR}`);
  await uploadDir(sftp, LOCAL_DIR, REMOTE_DIR);
  await sftp.end();
  console.log('Deploy upload complete.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
