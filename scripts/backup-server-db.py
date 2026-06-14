#!/usr/bin/env python3
"""Backup production MySQL database via SSH (mariadb-dump) and download locally."""
import os
import sys
import shlex
import paramiko
from scp import SCPClient
from datetime import datetime, timezone

HOST = os.environ.get('DEPLOY_HOST', '77.237.232.181')
USER = os.environ.get('DEPLOY_USER', 'root')
REMOTE_BACKEND = os.environ.get(
    'REMOTE_BACKEND',
    '/home/adminanmkavps/web/theboutiqueline.anmka.com/backend',
)
LOCAL_BACKUP_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'backups',
)


def parse_env(text):
    out = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, val = line.partition('=')
        out[key.strip()] = val.strip().strip('"').strip("'")
    return out


def main():
    password = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('DEPLOY_PASS')
    if not password:
        print('DEPLOY_PASS or password argument required', file=sys.stderr)
        sys.exit(1)

    stamp = datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
    remote_dir = '/home/adminanmkavps/backups/theboutiqueline'
    remote_file = f'{remote_dir}/tbl-db-{stamp}.sql.gz'
    local_dir = LOCAL_BACKUP_DIR
    os.makedirs(local_dir, exist_ok=True)
    local_file = os.path.join(local_dir, f'tbl-db-{stamp}.sql.gz')

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f'Connecting to {HOST}...')
    client.connect(HOST, port=22, username=USER, password=password, timeout=60)

    stdin, stdout, stderr = client.exec_command(
        f'cat {REMOTE_BACKEND}/.env', timeout=30,
    )
    env_text = stdout.read().decode('utf-8', errors='replace')
    if not env_text.strip():
        print('Could not read backend .env on server', file=sys.stderr)
        client.close()
        sys.exit(1)

    env = parse_env(env_text)
    db_name = env.get('DB_NAME', 'adminanmkavps_tbl')

    print(f'Database: {db_name}')

    # Root credentials live in /root/.my.cnf — do not pass -h localhost (forces TCP auth).
    dump_cmd = (
        f'set -euo pipefail; '
        f'mkdir -p {shlex.quote(remote_dir)}; '
        f'mariadb-dump --defaults-file=/root/.my.cnf --single-transaction --routines --triggers --events '
        f'{shlex.quote(db_name)} | gzip -9 > {shlex.quote(remote_file)}; '
        f'test -s {shlex.quote(remote_file)}; '
        f'ls -lh {shlex.quote(remote_file)}'
    )

    print('Creating remote dump...')
    stdin, stdout, stderr = client.exec_command(
        f'bash -lc {shlex.quote(dump_cmd)}',
        timeout=600,
    )
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace').strip()
    code = stdout.channel.recv_exit_status()
    if out:
        sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
        sys.stdout.buffer.write(b'\n')
    if err:
        print('stderr:', err)
    if code != 0:
        print(f'Backup failed with exit code {code}', file=sys.stderr)
        client.close()
        sys.exit(1)

    print(f'Downloading to {local_file}')
    with SCPClient(client.get_transport()) as scp:
        scp.get(remote_file, local_file)

    size_mb = os.path.getsize(local_file) / (1024 * 1024)
    print(f'Local backup saved: {local_file} ({size_mb:.2f} MB)')
    print(f'Remote backup kept: {remote_file}')
    client.close()
    print('Backup complete.')


if __name__ == '__main__':
    main()
