// Heady v03.10.6. Inertial Verlet hair (NO bind-pose/rest-angle spring).
// Integrate after locomotion and before render. Works with THREE supplied by host.
export class HeadyHairMomentum {
  constructor(THREE, skinnedMesh, options={}) {
    this.T=THREE; this.mesh=skinnedMesh;
    this.root=skinnedMesh.skeleton.bones.find(b=>b.name==='HeadyHair_Root');
    this.links=Array.from({length:6},(_,i)=>skinnedMesh.skeleton.bones.find(b=>b.name==='HeadyHair_'+String(i+1).padStart(2,'0')));
    if(!this.root || this.links.some(x=>!x))throw Error('HEADY_HAIR_7_JOINT_CHAIN_MISSING');
    this.sceneRoot=options.sceneRoot||skinnedMesh;
    this.fixedDt=1/90; this.acc=0; this.gravity=options.gravity??4.5;
    this.drag=options.drag??0.09; this.bodyRadius=options.bodyRadius??0.17;
    this.enableLegCollisions=options.legCollisions??false;
    this.taper=options.taper??false;
    this.groundY=options.groundY??0.035;
    this.airflow=options.airflow??0; this.maxCatchUp=5;
    this.anchor=new THREE.Vector3();this.lastAnchor=new THREE.Vector3();this.prevHead=new THREE.Vector3();
    this.lengths=this.links.map(b=>Math.max(.0001,b.position.length()));
    this.p=this.links.map(()=>new THREE.Vector3());this.prev=this.links.map(()=>new THREE.Vector3());
    this.temp=new THREE.Vector3();this.up=new THREE.Vector3(0,1,0);
    this.colliderBones=(options.colliders||[]).map(o=>({bone:skinnedMesh.skeleton.bones.find(b=>b.name===o.name),radius:o.radius})).filter(x=>x.bone);
    this.reset();
  }
  reset(){this.root.updateWorldMatrix(true,true);this.root.getWorldPosition(this.anchor);this.lastAnchor.copy(this.anchor);
    this.links.forEach((b,i)=>{b.getWorldPosition(this.p[i]);this.prev[i].copy(this.p[i])});this.acc=0;}
  // Captures actual motion. No attraction to bind pose, no target orientation.
  update(delta){if(!Number.isFinite(delta)||delta<0)return;this.acc+=Math.min(delta,.055);
    let n=0;while(this.acc>=this.fixedDt&&n<this.maxCatchUp){this.step(this.fixedDt);this.acc-=this.fixedDt;n++;}
    if(n===this.maxCatchUp)this.acc=0;
  }
  step(dt){const T=this.T;this.root.updateWorldMatrix(true,false);this.root.getWorldPosition(this.anchor);
    const anchorVelocity=this.temp.copy(this.anchor).sub(this.lastAnchor).clone();
    this.lastAnchor.copy(this.anchor);
    const gravity=new T.Vector3(this.airflow,-this.gravity,0);
    for(let i=0;i<this.links.length;i++){
      const old=this.p[i].clone();let vel=this.p[i].clone().sub(this.prev[i]).multiplyScalar(1-this.drag);
      this.p[i].add(vel).addScaledVector(gravity,dt*dt);this.prev[i].copy(old);
    }
    // Sequential distance constraints and collisions; lower joints may carry momentum independently.
    for(let iter=0;iter<7;iter++){
      for(let i=0;i<this.p.length;i++){
        const parent=i===0?this.anchor:this.p[i-1], v=this.p[i].clone().sub(parent);
        const len=this.lengths[i]*(this.taper?[1,1,.95,.9,.85,.8][i]:1);
        if(v.lengthSq()<1e-12)v.set(0,-len,0);else v.setLength(len);
        this.p[i].copy(parent).add(v);
        if(this.p[i].y<this.groundY)this.p[i].y=this.groundY;
        for(const c of this.colliderBones){
          if(!this.enableLegCollisions && /^Bone_/.test(c.bone.name))continue;
          c.bone.getWorldPosition(this.temp);let sep=this.p[i].clone().sub(this.temp);
          if(sep.length()<c.radius){if(sep.lengthSq()<1e-10)sep.set(0,0,1);sep.setLength(c.radius);this.p[i].copy(this.temp).add(sep);}
        }
      }
    }
    // Drive joint orientation toward the *current physics segment direction*, not a rest orientation.
    // Use parent-local quaternions to preserve the current animated head transform.
    for(let i=0;i<this.links.length;i++){
      const b=this.links[i],parent=i===0?this.root:this.links[i-1];
      parent.updateWorldMatrix(true,false);
      const pos=i===0?this.anchor:this.p[i-1];
      const dir=this.p[i].clone().sub(pos).normalize();
      const inv=new T.Quaternion();parent.getWorldQuaternion(inv);inv.invert();dir.applyQuaternion(inv);
      const restDir=b.userData.headyRestDirection || b.position.clone().normalize();
      if(!b.userData.headyRestDirection)b.userData.headyRestDirection=restDir.clone();
      const q=new T.Quaternion().setFromUnitVectors(restDir,dir);
      b.quaternion.copy(q);b.updateWorldMatrix(false,true);
    }
  }
}
