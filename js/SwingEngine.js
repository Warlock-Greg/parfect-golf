// SwingEngine.js
// SWINGENGINE PRO — PARFECT ENGINE V1.1
// Détection : Address / Top / Impact / Finish
// Phases : IDLE → ADDRESS → BACKSWING → TOP → DOWNSWING → IMPACT → RELEASE → FINISH

const SwingEngine = (() => {

  const LM = {
    NOSE: 0,
    LEFT_WRIST: 15,
    RIGHT_WRIST: 16,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12
  };

  const SWING_THRESHOLDS = {
    WRIST_START: 0.04,
    HIP_START: 0.03
  };

  const START_SPEED = 0.015;
  const IMPACT_SPIKE = 0.25;

  const MAX_IDLE_MS = 1800;
  const FINISH_TIMEOUT_MS = 700;

  const FALLBACK_MIN_FRAMES = 20;
  const FALLBACK_MIN_ENERGY = 0.03;

  function dist(a,b){
    if(!a || !b) return 0;
    const dx=a.x-b.x;
    const dy=a.y-b.y;
    return Math.hypot(dx,dy);
  }

  function mid(a,b){
    if(!a||!b) return null;
    return {x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  }

  function create({fps=30,onKeyFrame,onSwingComplete,onSwingStart,debug=false}={}){

    let state="IDLE";
    let lastPose=null;
    let lastTime=null;

    let frames=[];
    let timestamps=[];

    let keyFrames={
      address:null,
      backswing:null,
      top:null,
      downswing:null,
      impact:null,
      release:null,
      finish:null
    };

    let swingStartTime=null;
    let lastMotionTime=performance.now();

    let impactDetected=false;
    let releaseStartTime=null;

    let maxBackswingSpeed=0;
    let armed=false;

    let extensionDetected=false;
    let extensionStartTime=null;

    let fallbackActiveFrames=0;

    let lastWristDx=0;
    let lastWristDy=0;

    function reset(){

      frames=[];
      timestamps=[];

      keyFrames={
        address:null,
        backswing:null,
        top:null,
        downswing:null,
        impact:null,
        release:null,
        finish:null
      };

      state="IDLE";

      impactDetected=false;
      releaseStartTime=null;

      maxBackswingSpeed=0;

      extensionDetected=false;
      extensionStartTime=null;

      fallbackActiveFrames=0;

      lastPose=null;
      lastTime=null;

      lastWristDx=0;
      lastWristDy=0;
    }

    function armForSwing(timeMs=performance.now()){

      reset();

      armed=true;
      swingStartTime=timeMs;
      lastMotionTime=timeMs;

      if(debug) console.log("🎯 SwingEngine ARMÉ");
    }

    function clonePose(p){
      try{
        if(typeof structuredClone==="function")
          return structuredClone(p);
      }catch{}
      return p?JSON.parse(JSON.stringify(p)):null;
    }

    function markKeyFrame(type,index,pose){

      keyFrames[type]={
        index,
        pose:clonePose(pose)
      };

      if(onKeyFrame){
        onKeyFrame({
          type,
          index,
          pose:clonePose(pose)
        });
      }
    }

    function processPose(pose,timeMs,clubType){

      if(!pose) return null;

      const dt=lastTime!=null?(timeMs-lastTime)/1000:1/fps;
      lastTime=timeMs;

      const Rw=pose[LM.RIGHT_WRIST];
      const Lw=pose[LM.LEFT_WRIST];
      const Rh=pose[LM.RIGHT_HIP];
      const Lh=pose[LM.LEFT_HIP];

      const midHip=mid(Rh,Lh);
      const midWrist=mid(Rw,Lw);

      if(!lastPose){
        lastPose=pose;
        return null;
      }

      const prevPose=lastPose;
      lastPose=pose;

      const prevMidWrist=mid(prevPose[LM.RIGHT_WRIST],prevPose[LM.LEFT_WRIST]);
      const prevMidHip=mid(prevPose[LM.RIGHT_HIP],prevPose[LM.LEFT_HIP]);

      if(!midWrist||!midHip||!prevMidWrist||!prevMidHip) return null;

      const speedWrist=dist(midWrist,prevMidWrist)/(dt||0.033);
      const speedHip=dist(midHip,prevMidHip)/(dt||0.033);

      const now=timeMs;

      if(now-lastMotionTime>MAX_IDLE_MS){
        reset();
        return null;
      }

      if(speedWrist>0.005||speedHip>0.005)
        lastMotionTime=now;

      // IDLE

      if(state==="IDLE"){

        if(!armed) return null;

        const motionEnergy=speedWrist+speedHip;

        if(speedWrist>SWING_THRESHOLDS.WRIST_START &&
           speedHip>SWING_THRESHOLDS.HIP_START){

          state="ADDRESS";
          armed=false;

          swingStartTime=timeMs;
          fallbackActiveFrames=0;

          if(onSwingStart)
            onSwingStart({t:timeMs,club:clubType});

          return null;
        }

        if(motionEnergy>FALLBACK_MIN_ENERGY)
          fallbackActiveFrames++;
        else
          fallbackActiveFrames=0;

        if(fallbackActiveFrames>=FALLBACK_MIN_FRAMES){

          state="ADDRESS";
          swingStartTime=timeMs;
          fallbackActiveFrames=0;

          if(onSwingStart)
            onSwingStart({t:timeMs,club:clubType});
        }

        return null;
      }

      // ADDRESS

      if(state==="ADDRESS"){

        frames.push(pose);
        timestamps.push(timeMs);

        if(frames.length<3) return null;

        if(speedWrist>START_SPEED){

          state="BACKSWING";

          markKeyFrame("backswing",frames.length-1,pose);
        }

        return null;
      }

      // BACKSWING

      if(state==="BACKSWING"){

        frames.push(pose);
        timestamps.push(timeMs);

        maxBackswingSpeed=Math.max(maxBackswingSpeed,speedWrist);

        const dx=midWrist.x-prevMidWrist.x;
        const dy=midWrist.y-prevMidWrist.y;

        const directionChange=(dx*lastWristDx+dy*lastWristDy)<0;

        const speedDrop=
          maxBackswingSpeed>0.10 &&
          speedWrist<maxBackswingSpeed*0.65;

        if(speedDrop||directionChange){

          state="TOP";

          markKeyFrame("top",frames.length-1,pose);

          if(debug) console.log("🔝 TOP DETECTED");
        }

        lastWristDx=dx;
        lastWristDy=dy;

        return null;
      }

      // TOP

      if(state==="TOP"){

        frames.push(pose);
        timestamps.push(timeMs);

        if(speedWrist>0.10){

          state="DOWNSWING";

          markKeyFrame("downswing",frames.length-1,pose);
        }

        return null;
      }

      // DOWNSWING

      if(state==="DOWNSWING"){

        frames.push(pose);
        timestamps.push(timeMs);

        if(!impactDetected && speedWrist>IMPACT_SPIKE){

          impactDetected=true;
          state="IMPACT";

          markKeyFrame("impact",frames.length-1,pose);
        }

        return null;
      }

      // IMPACT

      if(state==="IMPACT"){

        frames.push(pose);
        timestamps.push(timeMs);

        const wristLead=pose[LM.LEFT_WRIST];
        const hipsMid=mid(pose[LM.LEFT_HIP],pose[LM.RIGHT_HIP]);

        if(!extensionDetected &&
           wristLead && hipsMid &&
           wristLead.x>hipsMid.x+0.02){

          extensionDetected=true;
          extensionStartTime=timeMs;
        }

        if(speedWrist<0.03){

          state="RELEASE";
          releaseStartTime=timeMs;

          markKeyFrame("release",frames.length-1,pose);
        }

        return null;
      }

      // RELEASE

      if(state==="RELEASE"){

        frames.push(pose);
        timestamps.push(timeMs);

        const timeInRelease=timeMs-(releaseStartTime??timeMs);

        const stable=
          speedWrist<0.035 &&
          speedHip<0.025;

        const enoughFramesAfterImpact=
          keyFrames.impact &&
          frames.length-keyFrames.impact.index>5;

        if((stable && enoughFramesAfterImpact) ||
           timeInRelease>FINISH_TIMEOUT_MS){

          state="FINISH";

          markKeyFrame("finish",frames.length-1,pose);

          const data={
            frames:[...frames],
            timestamps:[...timestamps],
            keyFrames:{...keyFrames},
            club:clubType,
            fps,
            extensionDetected,
            extensionStartTime
          };

          if(onSwingComplete)
            onSwingComplete({type:"swingComplete",data});

          reset();
        }

        return null;
      }

      return null;
    }

    return{
      processPose,
      reset,
      armForSwing
    };
  }

  return{create};

})();

if(typeof window!=="undefined"){
  window.SwingEngine=SwingEngine;
}
