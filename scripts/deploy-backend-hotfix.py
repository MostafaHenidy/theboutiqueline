#!/usr/bin/env python3
"""Upload specific backend hotfix files and restart pm2."""
import sys
import paramiko
from scp import SCPClient

HOST = '77.237.232.181'
USER = 'root'
REMOTE_BACKEND = '/home/adminanmkavps/web/theboutiqueline.anmka.com/backend'

FILES = [
    ('backend/server.js', 'server.js'),
    ('backend/src/utils/storefrontUrl.js', 'src/utils/storefrontUrl.js'),
    ('backend/src/utils/emailTemplate.js', 'src/utils/emailTemplate.js'),
    ('backend/src/utils/orderCustomerEmail.js', 'src/utils/orderCustomerEmail.js'),
    ('backend/src/utils/sendEmail.js', 'src/utils/sendEmail.js'),
    ('backend/src/controllers/paymobController.js', 'src/controllers/paymobController.js'),
    ('backend/src/services/domainDns.js', 'src/services/domainDns.js'),
    ('backend/src/integrations/constants.js', 'src/integrations/constants.js'),
    ('backend/src/integrations/marketingDispatcher.js', 'src/integrations/marketingDispatcher.js'),
    ('backend/src/controllers/marketingIntegrationsController.js', 'src/controllers/marketingIntegrationsController.js'),
    ('backend/src/utils/adaptProductSchema.js', 'src/utils/adaptProductSchema.js'),
    ('backend/src/utils/heroTickerImageStore.js', 'src/utils/heroTickerImageStore.js'),
    ('backend/src/utils/productVariants.js', 'src/utils/productVariants.js'),
    ('backend/src/controllers/productController.js', 'src/controllers/productController.js'),
    ('backend/src/controllers/cartController.js', 'src/controllers/cartController.js'),
    ('backend/src/controllers/wishlistController.js', 'src/controllers/wishlistController.js'),
    ('backend/src/controllers/orderController.js', 'src/controllers/orderController.js'),
    ('backend/src/controllers/authController.js', 'src/controllers/authController.js'),
    ('backend/src/controllers/landingPageController.js', 'src/controllers/landingPageController.js'),
]


def main():
    password = sys.argv[1]
    root = __import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__), '..'))

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, port=22, username=USER, password=password, timeout=60)

    with SCPClient(client.get_transport()) as scp:
        for local_rel, remote_rel in FILES:
            local_path = __import__('os').path.join(root, local_rel.replace('/', __import__('os').sep))
            remote_path = f'{REMOTE_BACKEND}/{remote_rel}'
            print(f'Upload {local_rel} -> {remote_path}')
            scp.put(local_path, remote_path)

    for cmd in [
        'pm2 restart tbl-backend',
        'sleep 5',
        "curl -s 'https://theboutiqueline.com/api/products?limit=1' | head -c 200",
        "curl -s 'https://theboutiqueline.com/api/health'",
    ]:
        print(f'\n>>> {cmd}')
        stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
        out = stdout.read().decode('utf-8', errors='replace')
        err = stderr.read().decode('utf-8', errors='replace')
        if out:
            print(out.rstrip())
        if err.strip():
            print(err)

    client.close()
    print('\nHotfix deployed.')


if __name__ == '__main__':
    main()
