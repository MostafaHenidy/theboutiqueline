#!/usr/bin/env python3
"""Deploy theboutiqueline: tar archives + SCP + remote extract."""
import os
import subprocess
import sys
import tarfile
import tempfile
import paramiko
from scp import SCPClient

HOST = '77.237.232.181'
USER = 'root'
REMOTE_BASE = '/home/adminanmkavps/web/theboutiqueline.anmka.com'
REMOTE_PUBLIC = f'{REMOTE_BASE}/public_html'
REMOTE_BACKEND = f'{REMOTE_BASE}/backend'
SKIP = {'node_modules', '.git', '__pycache__'}


def make_tar(source_dir, arc_path, exclude_dirs=None):
    exclude_dirs = exclude_dirs or set()
    with tarfile.open(arc_path, 'w:gz') as tar:
        for root, dirs, files in os.walk(source_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for f in files:
                if f == '.env':
                    continue
                full = os.path.join(root, f)
                arcname = os.path.relpath(full, source_dir).replace('\\', '/')
                tar.add(full, arcname=arcname)


def run_ssh(client, cmd, timeout=300):
    print(f'\n>>> {cmd}')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
        sys.stdout.buffer.write(b'\n')
        sys.stdout.flush()
    if err.strip():
        print('stderr:', err.encode('ascii', errors='replace').decode('ascii'))
    return stdout.channel.recv_exit_status()


def main():
    password = sys.argv[1]
    dist_dir = sys.argv[2]
    backend_dir = sys.argv[3]
    skip_backup = os.environ.get('DEPLOY_SKIP_BACKUP') == '1'

    if not skip_backup:
        backup_script = os.path.join(os.path.dirname(__file__), 'backup-server-db.py')
        print('Backing up production database before deploy...')
        result = subprocess.run([sys.executable, backup_script, password], check=False)
        if result.returncode != 0:
            print('Database backup failed — aborting deploy.', file=sys.stderr)
            sys.exit(1)
    else:
        print('Skipping database backup (DEPLOY_SKIP_BACKUP=1).')

    tmp = tempfile.mkdtemp()
    fe_tar = os.path.join(tmp, 'frontend.tar.gz')
    be_tar = os.path.join(tmp, 'backend.tar.gz')

    print('Packing frontend...')
    make_tar(dist_dir, fe_tar)
    print('Packing backend...')
    make_tar(backend_dir, be_tar, exclude_dirs=SKIP)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print('Connecting...')
    client.connect(HOST, port=22, username=USER, password=password, timeout=60)

    remote_tmp = '/tmp/tbl-deploy'
    run_ssh(client, f'mkdir -p {remote_tmp}')

    print('Uploading archives...')
    with SCPClient(client.get_transport(), progress=lambda f, s, t: None) as scp:
        scp.put(fe_tar, f'{remote_tmp}/frontend.tar.gz')
        scp.put(be_tar, f'{remote_tmp}/backend.tar.gz')

    cmds = [
        f'mkdir -p {REMOTE_PUBLIC} {REMOTE_BACKEND}',
        f'cd {REMOTE_PUBLIC} && tar -xzf {remote_tmp}/frontend.tar.gz',
        f'cd {REMOTE_BACKEND} && tar -xzf {remote_tmp}/backend.tar.gz',
        f'rm -rf {remote_tmp}',
        f'cd {REMOTE_BACKEND} && npm install --omit=dev 2>&1 | tail -12',
        f'cd {REMOTE_BACKEND} && npm run migrate 2>&1 | tail -15',
        f'chown -R adminanmkavps:www-data {REMOTE_PUBLIC} 2>/dev/null || true',
        'pm2 restart tbl-backend',
        'sleep 4 && curl -s https://theboutiqueline.com/api/health',
        'curl -sI https://theboutiqueline.com/api/uploads/ 2>/dev/null | head -6 || true',
        'curl -sI https://theboutiqueline.com/ | head -6',
    ]
    for cmd in cmds:
        run_ssh(client, cmd)

    client.close()
    print('\nDeploy finished.')


if __name__ == '__main__':
    main()
