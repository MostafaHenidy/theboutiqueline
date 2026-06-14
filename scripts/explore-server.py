#!/usr/bin/env python3
import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = '77.237.232.181'
USER = 'root'
PASSWORD = sys.argv[1]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=60)

cmds = [
    'ls -la /home/adminanmkavps/web/theboutiqueline.anmka.com',
    'ls -la /home/adminanmkavps/web/theboutiqueline.anmka.com/public_html | head -25',
    'head -30 /home/adminanmkavps/web/theboutiqueline.anmka.com/backend/.env 2>/dev/null | sed "s/\\(PASS\\|SECRET\\|KEY\\)=.*/\\1=***/Ig"',
    'cat /home/adminanmkavps/conf/web/theboutiqueline.anmka.com/nginx.conf 2>/dev/null | head -100',
    'grep -r "theboutiqueline.com" /home/adminanmkavps/conf/web/theboutiqueline.anmka.com/ 2>/dev/null | head -20',
]

for cmd in cmds:
    print(f'\n=== {cmd} ===')
    stdin, stdout, stderr = client.exec_command(cmd, timeout=120)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        print(out)
    if err.strip():
        print('stderr:', err)

client.close()
