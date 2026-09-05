#!/usr/bin/env bash
set -euo pipefail

mkdir -p e2e/fixtures
ffmpeg \
  -hide_banner \
  -loglevel error \
  -y \
  -f lavfi \
  -i color=c=black:s=160x90:r=24 \
  -t 1 \
  -an \
  -c:v libx264 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  e2e/fixtures/test.mp4
