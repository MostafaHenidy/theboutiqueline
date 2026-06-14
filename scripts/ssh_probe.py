#!/usr/bin/env python3
import paramiko
import sys

HOST = '77.237.232.181'
PORT = 22
USER = 'root'
PASSWORD = sys.argv[1] if len(sys.argv) > 1 else ''

cmds = [
    'hostname; uname -a',
    'ls -la /var/www 2>/dev/null || ls -la /home',
    'grep -r "theboutiqueline" /etc/nginx/sites-enabled /etc/nginx/conf.d 2>/dev/null | head -30',
    'ls -la /etc/nginx/sites-enabled/ 2>/dev/null',
    'pm2 list 2>/dev/null || systemctl list-units --type=service | grep -i boutique 2>/dev/null || true',
    'which node; node -v 2>/dev/null; which mysql; mysql --version 2>/dev/null',
    'find /var/www /home /opt -maxdepth 4 -iname "*boutique*" 2>/dev/null | head -20',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=30)
for c in cmds:
    print(f'\n=== {c} ===')
    stdin, stdout, stderr = client.exec_command(c, timeout=60)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out)
    if err:
        print('STDERR:', err)
client.close()
