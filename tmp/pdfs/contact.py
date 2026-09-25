from PIL import Image, ImageDraw
from pathlib import Path
fs=sorted(Path('tmp/pdfs').glob('positioningfinal-*.png'))
out=Image.new('RGB',(410*4,610*((len(fs)+3)//4)),'white')
d=ImageDraw.Draw(out)
for i,f in enumerate(fs):
    im=Image.open(f).convert('RGB')
    im.thumbnail((410,580))
    x=(i%4)*410; y=(i//4)*610
    out.paste(im,(x,y))
    d.text((x+5,y+582),f.name,fill='black')
out.save('tmp/pdfs/contact.png')
