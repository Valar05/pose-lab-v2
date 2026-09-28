from pathlib import Path
import sys

path=Path(sys.argv[1])
text=path.read_text()
old="""  const image=images[index];
  const x=Math.round((canvas.width-image.naturalWidth)/2);
  const y=Math.round((canvas.height-image.naturalHeight)/2);
  ctx.drawImage(image,x,y);"""
new="""  const image=images[index];
  const presentationScale=1.5;
  const drawW=Math.round(image.naturalWidth*presentationScale);
  const drawH=Math.round(image.naturalHeight*presentationScale);
  const x=Math.round((canvas.width-drawW)/2);
  const y=Math.round((canvas.height-drawH)/2);
  ctx.drawImage(image,0,0,image.naturalWidth,image.naturalHeight,x,y,drawW,drawH);"""
if old not in text:
    raise SystemExit("STOP: Swarmling draw anchor changed")
path.write_text(text.replace(old,new,1))
