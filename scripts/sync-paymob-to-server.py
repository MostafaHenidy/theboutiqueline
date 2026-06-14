#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import tempfile
import paramiko
from scp import SCPClient

HOST = '77.237.232.181'
USER = 'root'
PASSWORD = sys.argv[1]
BACKEND = '/home/adminanmkavps/web/theboutiqueline.anmka.com/backend'

local = subprocess.check_output(
    ['node', '-e', """
require('dotenv').config();
const { Setting, sequelize } = require('./src/models');
(async () => {
  const keys = [
    'payment_paymob','paymob_public_key','paymob_secret_key','paymob_hmac_secret',
    'paymob_api_key','paymob_api_base','paymob_integration_id'
  ];
  const rows = await Setting.findAll({ where: { key: keys } });
  const o = {};
  rows.forEach((r) => { o[r.key] = r.value; });
  console.log(JSON.stringify(o));
  await sequelize.close();
})();
"""],
    cwd=os.path.join(os.path.dirname(__file__), '..', 'backend'),
    text=True,
)
lines = [ln for ln in local.splitlines() if ln.strip().startswith('{')]
settings = json.loads(lines[-1])

remote_js = f"""const {{ Setting, sequelize }} = require('./src/models');
const data = {json.dumps(settings)};
(async () => {{
  for (const [key, value] of Object.entries(data)) {{
    await Setting.upsert({{ key, value: String(value ?? ''), group: 'payment' }});
    console.log('synced', key);
  }}
  await sequelize.close();
}})().catch((e) => {{ console.error(e); process.exit(1); }});
"""

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=60)

with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f:
    f.write(remote_js)
    local_path = f.name

remote_path = f'{BACKEND}/_sync_paymob_settings.js'
try:
    with SCPClient(client.get_transport()) as scp:
        scp.put(local_path, remote_path)
    stdin, stdout, stderr = client.exec_command(f'cd {BACKEND} && node _sync_paymob_settings.js', timeout=120)
    print(stdout.read().decode('utf-8', errors='replace'))
    err = stderr.read().decode('utf-8', errors='replace')
    if err.strip():
        print('stderr:', err)
    client.exec_command(f'rm -f {remote_path} && pm2 restart tbl-backend', timeout=60)
finally:
    os.unlink(local_path)

client.close()
print('done')
