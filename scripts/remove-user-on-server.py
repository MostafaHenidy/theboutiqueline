#!/usr/bin/env python3
import sys
import paramiko

HOST = '77.237.232.181'
USER = 'root'
REMOTE_BACKEND = '/home/adminanmkavps/web/theboutiqueline.anmka.com/backend'


def parse_env(raw):
    env = {}
    for line in raw.splitlines():
        if '=' in line:
            k, v = line.split('=', 1)
            env[k.strip()] = v.strip()
    return env


def main():
    password = sys.argv[1]
    email = sys.argv[2] if len(sys.argv) > 2 else 'admin@miskwear.com'

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=22, username=USER, password=password, timeout=60)

    _, stdout, _ = client.exec_command(f'grep -E "^DB_" {REMOTE_BACKEND}/.env')
    env = parse_env(stdout.read().decode())

    db_name = env['DB_NAME']
    db_user = env['DB_USER']
    db_pass = env['DB_PASSWORD'].replace("'", "'\\''")
    db_host = env.get('DB_HOST', 'localhost')
    mysql = f"mysql -h {db_host} -u {db_user} -p'{db_pass}' {db_name}"

    check = f"{mysql} -N -e \"SELECT id, name, email, role_id FROM users WHERE email='{email}';\""
    _, stdout, stderr = client.exec_command(check)
    row = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if err:
        print(err)
    if not row:
        print(f'No user found with email: {email}')
        client.close()
        return

    print(f'Found user: {row}')
    user_id = row.split('\t')[0]
    delete = f"{mysql} -e \"DELETE FROM users WHERE id={user_id} AND email='{email}';\""
    _, stdout, stderr = client.exec_command(delete)
    err = stderr.read().decode().strip()
    if err and 'Deprecated' not in err:
        print(err)
        client.close()
        sys.exit(1)

    verify = f"{mysql} -N -e \"SELECT COUNT(*) FROM users WHERE email='{email}';\""
    _, stdout, _ = client.exec_command(verify)
    remaining = stdout.read().decode().strip()
    print(f'Remaining users with {email}: {remaining}')
    client.close()


if __name__ == '__main__':
    main()
