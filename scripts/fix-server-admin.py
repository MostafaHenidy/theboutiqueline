#!/usr/bin/env python3
"""Sync server admin credentials from local .env and run seed-admin."""
import json
import os
import sys

import paramiko

HOST = '77.237.232.181'
USER = 'root'
REMOTE_BACKEND = '/home/adminanmkavps/web/theboutiqueline.anmka.com/backend'
LOCAL_BACKEND = os.path.join(os.path.dirname(__file__), '..', 'backend')


def load_local_admin():
    env_path = os.path.join(LOCAL_BACKEND, '.env')
    email = password = None
    with open(env_path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line.startswith('ADMIN_EMAIL='):
                email = line.split('=', 1)[1].strip()
            elif line.startswith('ADMIN_PASSWORD='):
                password = line.split('=', 1)[1].strip()
    return email, password or 'Admin@123456'


def run(client, cmd):
    print('>>>', cmd[:200])
    _, stdout, stderr = client.exec_command(cmd, timeout=120)
    code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out[:4000])
    if err.strip():
        print('stderr:', err[:600])
    print('exit', code)
    return code, out


def main():
    password = os.environ.get('DEPLOY_PASS')
    if not password:
        print('Set DEPLOY_PASS environment variable', file=sys.stderr)
        sys.exit(1)

    email, admin_pass = load_local_admin()
    if not email:
        print('ADMIN_EMAIL missing in backend/.env', file=sys.stderr)
        sys.exit(1)

    env_file = f'{REMOTE_BACKEND}/.env'
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, 22, USER, password, timeout=60)

    # Escape for shell single-quoted sed replacement
    email_esc = email.replace("'", "'\\''")
    pass_esc = admin_pass.replace("'", "'\\''")

    run(client, f"sed -i 's/^ADMIN_EMAIL=.*/ADMIN_EMAIL={email_esc}/' {env_file}")
    run(
        client,
        f"grep -q '^ADMIN_PASSWORD=' {env_file} && "
        f"sed -i 's/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD={pass_esc}/' {env_file} || "
        f"echo 'ADMIN_PASSWORD={pass_esc}' >> {env_file}",
    )
    run(client, f"grep '^ADMIN_EMAIL=' {env_file}")

    sftp = client.open_sftp()
    sftp.put(
        os.path.join(LOCAL_BACKEND, 'scripts', 'seed-admin.js'),
        f'{REMOTE_BACKEND}/scripts/seed-admin.js',
    )
    sftp.close()

    run(client, f'cd {REMOTE_BACKEND} && node scripts/seed-admin.js 2>&1')

    payload = json.dumps({'email': email, 'password': admin_pass})
    payload_esc = payload.replace("'", "'\\''")
    _, out = run(
        client,
        "curl -s -X POST https://theboutiqueline.anmka.com/api/auth/login "
        "-H 'Content-Type: application/json' "
        f"-d '{payload_esc}'",
    )
    try:
        data = json.loads(out)
        print('Login test:', 'OK' if data.get('success') else 'FAILED')
        if data.get('user'):
            print('  role:', data['user'].get('role'))
    except json.JSONDecodeError:
        print('Login response not JSON')

    run(client, 'pm2 restart tbl-backend 2>&1 | tail -5')
    client.close()
    print('Done.')


if __name__ == '__main__':
    main()
