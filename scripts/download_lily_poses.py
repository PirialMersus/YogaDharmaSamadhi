import os
import sys
import shutil
import glob

sys.path.insert(0, '/tmp/SketchFang')
import sketchfang.__main__ as sf

poses = [
    ("virabhadrasana_ii", "d64fbdb70eb4471ca4080ee4958c3645"),
    ("virabhadrasana_i", "8e550327103941a897a0d263c7d07591"),
    ("padangusthasana", "71dd9e7b3e724be98daee285e4df5f4f"),
    ("uttanasana", "d555645c5ca44cbb818bbb5becb47cfe"),
    ("astavakrasana", "b3c9098fc8414892b74a806895f11551"),
    ("urdhva_dhanurasana", "565ebd26b9564188a475e65fc2857706"),
    ("savasana", "26c9760c2c9146518ce411f1af63aa41"),
    ("vriksasana", "9f5ee6af931d41239b7d244a80b4672e"),
    ("halasana", "94c77b14a1214c79abb9ee791aaf6620"),
    ("dhanurasana", "615641f68c7a4b9b8ac37a999a66d53d"),
    ("bujangasana", "88c5e04dda4d414e888bbce9caf8c505"),
    ("marjaryasana", "776585dfb1904f83b0441f11a82509f4"),
    ("trikonasana", "018042558539473ba29e9430f19ecf59"),
    ("paschimottanasana", "809aba7f41324827bfd37de6c15a1617"),
    ("vasisthasana", "2a8f9bc5456841ca9870c52d98e800b1"),
    ("tadasana", "0135d946cc4d48048e786d4e385bf8b0")
]

output_dir = "public/models/lily"
os.makedirs(output_dir, exist_ok=True)

for key, uid in poses:
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
            print(f"Warning: no glb found in {tmp_out}")
    except Exception as exc:
        print(f"Error downloading {key}: {exc}")
