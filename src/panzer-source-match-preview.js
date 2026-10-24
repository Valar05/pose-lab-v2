const app=document.querySelector('#app');
app.replaceChildren();
const style=document.createElement('style');
style.textContent='*{box-sizing:border-box}body{margin:0;background:#111a22;color:#e6edf0;font-family:system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:16px}h1{font-size:1.35rem}p{color:#bfd0d9;line-height:1.5}button{margin:6px 7px 8px 0;padding:11px 14px;border:1px solid #8393a0;border-radius:8px;background:#2c3b45;color:white}button[aria-pressed=true]{background:#d9a961;color:#10161b}img{display:block;width:100%;height:auto;border:1px solid #607482;border-radius:8px}a{color:#e8bb78}figure{margin:8px 0}figcaption{padding:8px 2px;color:#bccfdb}';
app.append(style);
const main=document.createElement('main');app.append(main);
const heading=document.createElement('h1');heading.textContent='Panzer · Sprite-First Matching Study';main.append(heading);
const text=document.createElement('p');text.textContent='Source-only review. Eight measured alpha silhouettes. The original hull and turret sheets remain locked. One uniform turret scale candidate (59%) and an independently optional hull palette study. No composition, barrel, or deformation is performed here.';main.append(text);
const nav=document.createElement('nav');main.append(nav);
const fig=document.createElement('figure');main.append(fig);
const pic=document.createElement('img');fig.append(pic);
const cap=document.createElement('figcaption');fig.append(cap);
const files=[['isolated-angle-comparison.png','Measured source geometry · each hull and turret isolated, never stacked'],['palette-comparison.png','Hue/brightness matching candidate · hull only; no new painting']];
const revision=new URLSearchParams(location.search).get('rev')||'source-match-v1';
const asset=file=>'./assets/panzer-pose-experiment/matching-study-v1/'+file+'?rev='+encodeURIComponent(revision);
const buttons=[];
for(let i=0;i<files.length;i++){
  const button=document.createElement('button');
  button.textContent=i===0?'Silhouette / scale':'Palette alternatives';
  button.addEventListener('click',()=>activate(i));
  nav.append(button);buttons.push(button);
}
function activate(index){
  pic.src=asset(files[index][0]);pic.alt=files[index][1];
  cap.textContent=files[index][1];
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
}
const link=document.createElement('a');link.textContent='Measurement manifest and exact source hashes';
link.href=asset('source-match-manifest.json');link.target='_blank';link.rel='noopener';
main.append(link);
activate(0);
