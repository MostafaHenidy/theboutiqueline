import subprocess
import sys
import os

PLINK    = r"d:\theboutiqueline\scripts\plink.exe"
PSCP     = r"d:\theboutiqueline\scripts\pscp.exe"
HOST     = "77.237.232.181"
PORT     = "22"
USER     = "root"
PASS     = "|;&8B0T3+&Ix"
HOSTKEY  = "SHA256:paT6RWZIBy7isEOnuevhUJt+pB06ZSrHgqCgNM2b8Cg"
DIST     = r"D:\dist"
# Frontend-only web root — no backend/DB files touched
REMOTE   = "/home/adminanmkavps/web/theboutiqueline.anmka.com/public_html"

def run_plink(remote_cmd):
    result = subprocess.run(
        [PLINK, "-pw", PASS, "-P", PORT, "-batch", "-hostkey", HOSTKEY,
         f"{USER}@{HOST}", remote_cmd],
        capture_output=True, text=True, timeout=60
    )
    print("STDOUT:", result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return result

def run_pscp(local_path, remote_path):
    result = subprocess.run(
        [PSCP, "-pw", PASS, "-P", PORT, "-r", "-batch", "-hostkey", HOSTKEY,
         local_path, f"{USER}@{HOST}:{remote_path}"],
        capture_output=True, text=True, timeout=600
    )
    print("STDOUT:", result.stdout)
    if result.stderr:
        print("STDERR:", result.stderr)
    return result

# ── Verify dist exists ──────────────────────────────────────────
if not os.path.isdir(DIST):
    print(f"ERROR: dist directory not found at {DIST}")
    sys.exit(1)

print("=" * 60)
print(" TBL Frontend Deploy")
print(f" Source : {DIST}")
print(f" Target : {USER}@{HOST}:{REMOTE}")
print("=" * 60)

# ── Step 1: Confirm remote path exists ──────────────────────────
print("\n[1/3] Verifying remote path...")
r = run_plink(f"ls {REMOTE} | head -5")
if r.returncode != 0:
    print("ERROR: Remote path not accessible. Aborting.")
    sys.exit(1)

# ── Step 2: Backup current index.html on server ─────────────────
print("\n[2/3] Backing up current index.html on server...")
run_plink(
    f"cp {REMOTE}/index.html {REMOTE}/index.html.bak.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"
)

# ── Step 3: Upload dist/* → remote public_html ──────────────────
print("\n[3/3] Uploading frontend files (frontend only, no DB/backend touch)...")

# Upload assets folder
r = run_pscp(
    os.path.join(DIST, "assets"),
    REMOTE + "/"
)
if r.returncode != 0:
    print("ERROR: Upload of assets failed.")
    sys.exit(1)

# Upload index.html
r = run_pscp(
    os.path.join(DIST, "index.html"),
    REMOTE + "/index.html"
)
if r.returncode != 0:
    print("ERROR: Upload of index.html failed.")
    sys.exit(1)

# Upload any other top-level files (robots.txt, favicon, etc.)
for fname in os.listdir(DIST):
    fpath = os.path.join(DIST, fname)
    if os.path.isfile(fpath) and fname != "index.html":
        print(f"   Uploading {fname}...")
        run_pscp(fpath, f"{REMOTE}/{fname}")

print("\n" + "=" * 60)
print(" ✅  Deploy complete!")
print(f"    https://theboutiqueline.com")
print("=" * 60)
