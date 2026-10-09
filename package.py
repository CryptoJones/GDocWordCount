#!/usr/bin/env python3
"""
Chrome Extension Packaging Script
Creates a clean .zip file ready for upload to the Chrome Web Store Developer Dashboard.
"""

import os
import zipfile
import json

def package_extension(output_zip='gdoc-word-count.zip'):
    # Verify manifest exists and is valid
    if not os.path.exists('manifest.json'):
        raise FileNotFoundError("manifest.json not found in current directory!")

    with open('manifest.json', 'r') as f:
        manifest = json.load(f)

    version = manifest.get('version', '1.0.0')
    name = manifest.get('name', 'Extension')
    print(f"Packaging {name} v{version}...")

    include_files = [
        'manifest.json',
        'background.js',
        'content.js',
        'content.css',
    ]

    include_dirs = [
        'icons',
        'popup',
        'options',
    ]

    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in include_files:
            if os.path.exists(f):
                zf.write(f)
                print(f"  + {f}")
        for d in include_dirs:
            if os.path.isdir(d):
                for root, _, files in os.walk(d):
                    for file in files:
                        filepath = os.path.join(root, file)
                        zf.write(filepath)
                        print(f"  + {filepath}")

    size_kb = os.path.getsize(output_zip) / 1024
    print(f"\nSuccessfully generated '{output_zip}' ({size_kb:.1f} KB)")
    print("Ready for upload at: https://chromewebstore.google.com/devconsole")

if __name__ == '__main__':
    package_extension()
