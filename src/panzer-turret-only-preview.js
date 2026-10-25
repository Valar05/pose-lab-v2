const app=document.querySelector('#app');
const root='./assets/panzer-pose-experiment/turret-only-v1/';
app.replaceChildren();
const css=document.createElement('style');css.textContent='body{background:#101820;color:#eaf0f4;font:16px system-ui}main{max-width:850px;margin:auto;padding:16px}canvas{width:100%;border:1px solid #52636e;background:#26313b;border-radius:10px}button{padding:12px;margin:5px;background:#253947;color:white;border:1px solid #8597a2;border-radius:8px}';
app.append(css);
const main=document.createElement('main');app.append(main);
const title=document.createElement('h2');title.textContent='Panzer turret · eight original directions · extraction review';main.append(title);
const note=document.createElement('p');note.textContent='Original artwork is preserved. One isolated turret per angle. No hull, barrel, shear, recolor, or composition.';main.append(note);
const canvas=document.createElement('canvas');canvas.width=800;canvas.height=450;main.append(canvas);
const controls=document.createElement('div');main.append(controls);
const names=['front','front-right','right','rear-right','rear','rear-left','left','front-left'];
let index=0;const ctx=canvas.getContext('2d');
const label=document.createElement('p');main.append(label);
const buttons=[['Previous',()=>index=(index+7)%8],['Next',()=>index=(index+1)%8]];
for(const [name,action] of buttons){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{action();draw()};controls.append(b)}
const imgs=names.map((n,i)=>{const img=new Image();img.src=root+String(i).padStart(2,'0')+'-'+n+'.png';img.onload=()=>{if(i===index)draw()};return img});
function draw(){ctx.clearRect(0,0,800,450);label.textContent='Direction '+index+' · '+index*45+'° · '+names[index];const img=imgs[index];if(!img.complete||!img.naturalWidth){label.textContent+=' · asset missing or loading';return;}const scale=Math.min(720/img.width,380/img.height,1);const w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(800-w)/2,(450-h)/2,w,h)}
draw();
