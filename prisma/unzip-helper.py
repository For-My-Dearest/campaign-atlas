import zipfile, os, sys

src = sys.argv[1]
dst = sys.argv[2]
z = zipfile.ZipFile(src)
for n in z.namelist():
    if n.endswith(".md"):
        out = os.path.join(dst, n)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "wb") as f:
            f.write(z.read(n))
print("OK", len([n for n in z.namelist() if n.endswith(".md")]))