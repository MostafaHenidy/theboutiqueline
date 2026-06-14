#!/usr/bin/env python3
"""Append production env keys on server if missing."""
import paramiko
import sys

HOST = '77.237.232.181'
USER = 'root'
ENV_PATH = '/home/adminanmkavps/web/theboutiqueline.anmka.com/backend/.env'
PASSWORD = sys.argv[1]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(HOST, port=22, username=USER, password=PASSWORD, timeout=60)

cmds = [
    f"grep -q '^BACKEND_URL=' {ENV_PATH} || echo 'BACKEND_URL=https://theboutiqueline.com' >> {ENV_PATH}",
    f"grep BACKEND_URL {ENV_PATH}",
]
for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    print(stdout.read().decode('utf-8', errors='replace').strip())

client.close()
print('done')
