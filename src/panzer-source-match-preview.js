const app=document.querySelector('#app');
app.replaceChildren();
const style=document.createElement('style');
style.textContent='*{box-sizing:border-box}body{margin:0;background:#111a22;color:#e6edf0;font-family:system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:16px}h1{font-size:1.35rem}p{color:#bfd0d9;line-height:1.5}button{margin:6px 7px 8px 0;padding:11px 14px;border:1px solid #8393a0;border-radius:8px;background:#2c3b45;color:white}button[aria-pressed=true]{background:#d9a961;color:#10161b}img{display:block;width:100%;height:auto;border:1px solid #607482;border-radius:8px}a{color:#e8bb78}figure{margin:8px 0}figcaption{padding:8px 2px;color:#bccfdb}';
app.append(style);
const main=document.createElement('main');app.append(main);
const heading=document.createElement('h1');heading.textContent='Panzer · Sprite-First Matching Study';main.append(heading);
const text=document.createElement('p');text.textContent='Source-only review, not a new tank animation. The brighter hull redraw is compared against its matching turret reference with two deterministic lighting grades (65% and 94%). Original sheet geometry, alpha, and all existing Pose Lab animations are preserved. No barrel or three-layer composition is attempted.';main.append(text);
const nav=document.createElement('nav');main.append(nav);
const fig=document.createElement('figure');main.append(fig);
const pic=document.createElement('img');fig.append(pic);
const cap=document.createElement('figcaption');fig.append(cap);
const files=[['postprocess-v1/panzer-side-by-side-lighting-review.jpg','All eight angles · new hull redraw ungraded, two non-generative lighting grades, and the unchanged turret reference'],['postprocess-v1/panzer-three-pose-phone-review.jpg','Three diagnostic directions at portable review scale · original, 65% post-process candidate, turret reference'],['isolated-angle-comparison.png','Older first-generation hull source geometry · eight isolated hulls and turrets'],['palette-comparison.png','Earlier hue/brightness comparison for the original hull, not the new redraw']];
const revision=new URLSearchParams(location.search).get('rev')||'source-match-v1';
const asset=file=>'./assets/panzer-pose-experiment/matching-study-v1/'+file+'?rev='+encodeURIComponent(revision);
const buttons=[];
for(let i=0;i<files.length;i++){
  const button=document.createElement('button');
  button.textContent=['Lighting · all 8','Phone-size check','Older scale study','Older color study'][i];
  button.addEventListener('click',()=>activate(i));
  nav.append(button);buttons.push(button);
}
function activate(index){
  pic.src=asset(files[index][0]);pic.alt=files[index][1];
  cap.textContent=files[index][1];
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
}
const intro=document.createElement('p');intro.textContent='The candidates reduce excess highlights and lift deep shadows. Lighting direction, baked specular shapes, perspective and overlapping source silhouettes remain separate art/segmentation problems. Human review decides whether color post-processing is enough.';main.append(intro);const newLinks=document.createElement('p');main.append(newLinks);for(const [name,label] of [['postprocess-v1/panzer-hulls-tone-matched-65.png','65% RGBA hull candidate'],['postprocess-v1/panzer-hulls-tone-matched-94.png','94% RGBA hull candidate'],['postprocess-v1/panzer-postprocess-manifest.json','Post-processing manifest']]){const a=document.createElement('a');a.href=asset(name);a.textContent=label;a.target='_blank';a.rel='noopener';newLinks.append(a,document.createTextNode(' · '));}const link=document.createElement('a');link.textContent='Original measurement manifest and exact source hashes';
link.href=asset('source-match-manifest.json');link.target='_blank';link.rel='noopener';
main.append(link);
activate(0);
