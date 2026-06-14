#!/usr/bin/env python3
import paramiko
import sys

def run(password, cmd, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect('77.237.232.181', port=22, username='root', password=password, timeout=30)
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout)
    channel = stdout.channel
    channel.settimeout(timeout)
    out = b''
    err = b''
    try:
        out = stdout.read()
        err = stderr.read()
    except Exception:
        pass
    client.close()
    sys.stdout.buffer.write(out)
    if err:
        sys.stdout.buffer.write(b'\nSTDERR: ' + err)

if __name__ == '__main__':
    run(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 30)
