#!/bin/sh
# Copies only the files the browser needs into public/ (Vercel's output folder).
# Repo files such as README, package.json, scripts/, src/3d/ (3D source) and the
# full-length raw films in src/assets/Projects/ are left out of the live site.
set -e
# Build the 3D bundle from its source (src/3d/world.js -> src/app/world.bundle.js).
npm run build:3d
rm -rf public
mkdir -p public/src
cp index.html 404.html robots.txt sitemap.xml site.webmanifest \
   favicon.svg favicon.ico favicon.png favicon-16x16.png favicon-32x32.png \
   apple-touch-icon.png icon-192.png icon-512.png public/
cp -R src/app src/styles src/data src/media public/src/
mkdir -p public/src/assets
cp -R src/assets/baten public/src/assets/
echo "public/ ready: $(find public -type f | wc -l) files"
