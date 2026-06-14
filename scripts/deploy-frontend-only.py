#!/usr/bin/env python3
"""Deploy frontend dist only — no backend, no DB changes."""
import os
import sys
import tarfile
import tempfile
import paramiko
from scp import SCPClient

HOST = '77.237.232.181'
USER = 'root'
REMOTE_PUBLIC = '/home/adminanmkavps/web/theboutiqueline.anmka.com/public_html'


def main():
    password = sys.argv[1]
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    dist_dir = os.path.abspath(os.path.join(root, 'frontend', 'dist'))

    if not os.path.isdir(dist_dir):
        print(f'Frontend dist missing: {dist_dir}', file=sys.stderr)
        sys.exit(1)

    tmp = tempfile.mkdtemp()
    fe_tar = os.path.join(tmp, 'frontend.tar.gz')
    with tarfile.open(fe_tar, 'w:gz') as tar:
        for name in os.listdir(dist_dir):
            tar.add(os.path.join(dist_dir, name), arcname=name)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print('Connecting...')
    client.connect(HOST, port=22, username=USER, password=password, timeout=60)

    remote_tmp = '/tmp/tbl-deploy-fe'
    stdin, stdout, stderr = client.exec_command(f'rm -rf {remote_tmp} && mkdir -p {remote_tmp} {REMOTE_PUBLIC}', timeout=60)
    stdout.channel.recv_exit_status()

    print('Uploading frontend...')
    with SCPClient(client.get_transport()) as scp:
        scp.put(fe_tar, f'{remote_tmp}/frontend.tar.gz')

    for cmd in [
        f'cd {REMOTE_PUBLIC} && tar -xzf {remote_tmp}/frontend.tar.gz',
        f'rm -rf {remote_tmp}',
        f'chown -R adminanmkavps:www-data {REMOTE_PUBLIC} 2>/dev/null || true',
        'curl -sI https://theboutiqueline.com/ | head -4',
    ]:
        print(f'\n>>> {cmd}')
        stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        sys.stdout.buffer.write((out + err).encode('utf-8', errors='replace'))

    client.close()
    print('\nFrontend deploy complete.')


if __name__ == '__main__':
    main()
