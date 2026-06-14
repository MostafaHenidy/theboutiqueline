#!/usr/bin/env python3
import paramiko, sys
c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('77.237.232.181', 22, 'root', sys.argv[1], timeout=30)
_, o, _ = c.exec_command(sys.argv[2])
sys.stdout.buffer.write(o.read())
c.close()
