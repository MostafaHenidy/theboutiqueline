#!/usr/bin/env python3
"""Remove nav links from production database by slug."""
import sys
import paramiko

HOST = '77.237.232.181'
USER = 'root'
REMOTE_BACKEND = '/home/adminanmkavps/web/theboutiqueline.anmka.com/backend'
SLUGS = ('sneakers', 'collectibles', 'trading-cards')


def parse_env(raw):
    env = {}
    for line in raw.splitlines():
        if '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()
    return env


def main():
    password = sys.argv[1]
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=22, username=USER, password=password, timeout=60)

    _, stdout, _ = client.exec_command(f'grep -E "^DB_" {REMOTE_BACKEND}/.env')
    env = parse_env(stdout.read().decode())
    db_pass = env['DB_PASSWORD'].replace("'", "'\\''")
    mysql = (
        f"mysql -h {env.get('DB_HOST', 'localhost')} "
        f"-u {env['DB_USER']} -p'{db_pass}' {env['DB_NAME']}"
    )

    slug_list = "', '".join(SLUGS)
    check = f"{mysql} -e \"SELECT id, label_en, slug FROM nav_links WHERE slug IN ('{slug_list}');\""
    _, stdout, stderr = client.exec_command(check)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if err.strip():
        print(err)
    print('Before delete:')
    print(out or '(no rows)')

    delete = f"{mysql} -e \"DELETE FROM nav_links WHERE slug IN ('{slug_list}');\""
    _, stdout, stderr = client.exec_command(delete)
    err = stderr.read().decode()
    if err.strip():
        print(err)

    _, stdout, _ = client.exec_command(check)
    print('After delete:')
    print(stdout.read().decode() or '(no rows)')

    client.close()
    print('Done.')


if __name__ == '__main__':
    main()
