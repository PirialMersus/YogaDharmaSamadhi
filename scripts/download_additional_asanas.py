import os
import sys
import json
import shutil
import glob

sys.path.insert(0, '/tmp/SketchFang')
import sketchfang.__main__ as sf

with open('scripts/additional_new_asanas.json', 'r') as f:
    items = json.load(f)

output_dir = 'public/models/lily'
os.makedirs(output_dir, exist_ok=True)

for item in items:
    key = item['key']
    uid = item['uid']
    target_glb = os.path.join(output_dir, f"{key}.glb")

    if os.path.exists(target_glb) and os.path.getsize(target_glb) > 10000:
        print(f"Skipping {key}, already exists")
        continue

    print(f"Downloading {key} ({uid})...")
    tmp_out = f"/tmp/{key}_out"
    if os.path.exists(tmp_out):
        shutil.rmtree(tmp_out)
    os.makedirs(tmp_out, exist_ok=True)

    sys.argv = ["sketchfang", uid, "-o", tmp_out]
    try:
        sf.main()
        glbs = glob.glob(f"{tmp_out}/**/*.glb", recursive=True)
        if glbs:
            shutil.copyfile(glbs[0], target_glb)
            print(f"Successfully saved {target_glb} ({os.path.getsize(target_glb)} bytes)")
        else:
            print(f"No GLB produced for {key}")
    except Exception as e:
        print(f"Failed to download {key}: {e}")
