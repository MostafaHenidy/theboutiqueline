#!/usr/bin/env python3
"""Dump local MySQL DB and import into production server DB."""
import os
import subprocess
import sys
import tempfile
import paramiko
from scp import SCPClient

HOST = '77.237.232.181'
USER = 'root'
REMOTE_BACKEND = '/home/adminanmkavps/web/theboutiqueline.anmka.com/backend'
LOCAL_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))


def parse_env(path):
    data = {}
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            data[k.strip()] = v.strip()
    return data


def find_mysqldump():
    for name in ('mysqldump', 'mysqldump.exe'):
        try:
            subprocess.run([name, '--version'], capture_output=True, check=True)
            return name
        except (FileNotFoundError, subprocess.CalledProcessError):
            pass
    for base in (
        r'C:\Program Files\MySQL\MySQL Server 8.4\bin',
        r'C:\Program Files\MySQL\MySQL Server 8.0\bin',
        r'C:\xampp\mysql\bin',
        r'C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin',
    ):
        exe = os.path.join(base, 'mysqldump.exe')
        if os.path.isfile(exe):
            return exe
    return None


def run_ssh(client, cmd, timeout=600):
    print(f'\n>>> {cmd}')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    if out:
        print(out)
    if err.strip():
        print('stderr:', err)
    if code != 0:
        raise RuntimeError(f'Command failed ({code}): {cmd}')
    return out


def main():
    password = sys.argv[1]
    local_env = parse_env(os.path.join(LOCAL_BACKEND, '.env'))

    tmp = tempfile.mkdtemp()
    dump_path = os.path.join(tmp, 'local_dump.sql')

    mysqldump = find_mysqldump()
    if mysqldump:
        dump_cmd = [
            mysqldump,
            f"--host={local_env.get('DB_HOST', 'localhost')}",
            f"--port={local_env.get('DB_PORT', '3306')}",
            f"--user={local_env.get('DB_USER', 'root')}",
            '--single-transaction',
            '--routines',
            '--triggers',
            '--set-gtid-purged=OFF',
            '--add-drop-table',
            local_env.get('DB_NAME', 'theboutiqueline'),
        ]
        if local_env.get('DB_PASSWORD'):
            dump_cmd.insert(1, f"--password={local_env['DB_PASSWORD']}")
        print('Dumping local database with mysqldump...')
        with open(dump_path, 'w', encoding='utf-8', newline='\n') as f:
            subprocess.run(dump_cmd, stdout=f, check=True)
    else:
        export_script = os.path.join(LOCAL_BACKEND, 'scripts', 'export-db-sql.js')
        print('mysqldump not found — exporting via Node.js...')
        subprocess.run(['node', export_script, dump_path], cwd=LOCAL_BACKEND, check=True)

    size_mb = os.path.getsize(dump_path) / (1024 * 1024)
    print(f'Local dump: {dump_path} ({size_mb:.2f} MB)')

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print('Connecting to server...')
    client.connect(HOST, port=22, username=USER, password=password, timeout=60)

    remote_env_raw = run_ssh(client, f'grep -E "^DB_" {REMOTE_BACKEND}/.env')
    remote_env = {}
    for line in remote_env_raw.splitlines():
        if '=' in line:
            k, v = line.split('=', 1)
            remote_env[k.strip()] = v.strip()

    remote_dump = '/tmp/tbl-local-sync.sql'
    db_name = remote_env.get('DB_NAME', '')
    db_user = remote_env.get('DB_USER', '')
    db_pass = remote_env.get('DB_PASSWORD', '').replace("'", "'\\''")
    db_host = remote_env.get('DB_HOST', 'localhost')
    local_db = local_env.get('DB_NAME', 'theboutiqueline')

    # Rewrite local DB name in dump for production target
    with open(dump_path, 'r', encoding='utf-8') as f:
        dump_sql = f.read()
    dump_sql = dump_sql.replace(f'`{local_db}`', f'`{db_name}`')
    dump_sql = dump_sql.replace(f'USE `{local_db}`', f'USE `{db_name}`')
    with open(dump_path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(dump_sql)

    print('Uploading dump...')
    with SCPClient(client.get_transport()) as scp:
        scp.put(dump_path, remote_dump)

    import_cmd = (
        f"mysql -h {db_host} -u {db_user} -p'{db_pass}' {db_name} < {remote_dump} "
        f'&& rm -f {remote_dump}'
    )
    print('Importing into production database...')
    run_ssh(client, import_cmd, timeout=900)

    mysql_q = f"mysql -h {db_host} -u {db_user} -p'{db_pass}' -N -e"
    tables = run_ssh(
        client,
        f"{mysql_q} \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='{db_name}';\"",
    ).strip()
    products = run_ssh(
        client,
        f"{mysql_q} \"SELECT COUNT(*) FROM {db_name}.products;\"",
    ).strip()
    print(f'Production DB synced: {tables} tables, {products} products')

    client.close()
    print('Database sync finished.')


if __name__ == '__main__':
    main()
