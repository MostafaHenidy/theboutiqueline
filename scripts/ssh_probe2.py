#!/usr/bin/env python3
import paramiko
import sys

HOST = '77.237.232.181'
USER = 'root'
PASSWORD = sys.argv[1]

cmds = [
    'grep -r "theboutiqueline" /etc/nginx /etc/apache2 /home 2>/dev/null | head -40',
    'ls -la /etc/nginx/sites-available/ | grep -i boutique || ls /etc/nginx/sites-available/ | tail -20',
    'grep -r "boutique" /etc/nginx/sites-available 2>/dev/null | head -20',
    'ls -la /home/*/ 2>/dev/null | head -30',
    'find /home /root /opt -maxdepth 5 -name "theboutiqueline*" 2>/dev/null',
    'curl -sI https://theboutiqueline.anmka.com/ | head -15',
    'ss -tlnp | grep -E "5000|5001|3306|80|443"',
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=30)
for c in cmds:
    print(f'\n=== {c} ===')
    stdin, stdout, stderr = client.exec_command(c, timeout=90)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    sys.stdout.buffer.write(out.encode('utf-8', errors='replace'))
    if err.strip():
        sys.stdout.buffer.write(('STDERR: ' + err).encode('utf-8', errors='replace'))
client.close()
