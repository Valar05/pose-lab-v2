#!/usr/bin/env python3
"""Connie: fail-closed exact user-source import and 10 irregular frame slices."""
from pathlib import Path
import hashlib,json,sys
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
CONTRACT=ROOT/"campaigns/connie-paper-motion-20261021.contract.json"
C=json.loads(CONTRACT.read_text())
SOURCE=ROOT/C["source"]["path"]
RECTS={
"idle":(0,60,300,445),"run_1":(305,75,660,445),"run_2":(660,75,980,445),"run_3":(980,75,1536,445),
"aerial_1":(190,460,515,790),"aerial_2":(510,460,855,790),"aerial_3":(850,460,1220,790),
"spin_1":(185,795,570,1130),"spin_2":(565,790,860,1130),"spin_3":(855,750,1220,1130)}
def main():
 if not SOURCE.is_file():
  sys.exit("BLOCKED: exact approved composite absent in GitHub: "+str(SOURCE))
 digest=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
 if digest!=C["source"]["sha256"]:sys.exit("BLOCKED: Connie source SHA mismatch")
 with Image.open(SOURCE) as img:
  if list(img.size)!=C["source"]["dimensions"]:sys.exit("BLOCKED: source dimensions changed")
  if img.mode not in ("RGB","RGBA"):sys.exit("BLOCKED: unexpected source mode")
  if img.convert("RGBA").getchannel("A").getextrema()!=(255,255):
   sys.exit("BLOCKED: expected opaque original source; do not guess alpha")
  # We intentionally refuse color-key alpha extraction. Black is part of the
  # source and global keying has already caused severe rainbow artifacts.
  # Per-frame foreground masks must be authored and visually inspected first.
  for name,box in RECTS.items():
   x0,y0,x1,y1=box
   assert 0<=x0<x1<=img.width and 0<=y0<y1<=img.height,name
   print(name,box)
 sys.exit("SOURCE VERIFIED; MASK REVIEW REQUIRED before any sprites are exported")
if __name__=="__main__":main()
