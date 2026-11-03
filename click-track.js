(function(){
 let context=null,timer=null,frame=0,next=0,beat=0,events=[],voices=new Set(),generation=0;
 const get=id=>document.getElementById(id);
 function stop(){generation++;clearInterval(timer);cancelAnimationFrame(frame);timer=null;events=[];for(const voice of voices){try{voice.stop();}catch{}}voices.clear();if(context){context.close().catch(()=>{});context=null;}get('click-start')?.removeAttribute('disabled');get('click-stop')?.setAttribute('disabled','');get('click-tempo')?.removeAttribute('disabled');document.querySelectorAll('#click-beats span').forEach(el=>el.classList.remove('playing'));}
 window.stopClickTrack=stop;
 async function start(){const input=get('click-tempo');if(!input.reportValidity())return;const bpm=Number(input.value);if(!Number.isFinite(bpm)||bpm<40||bpm>180)return;stop();const token=generation;
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Unavailable');const ctx=new Audio();context=ctx;await ctx.resume();if(token!==generation)return;next=ctx.currentTime+.08;beat=0;get('click-start').disabled=true;get('click-stop').disabled=false;input.disabled=true;get('click-status').textContent=`Playing at ${bpm} BPM. Stop to change tempo.`;
 const schedule=()=>{while(next<ctx.currentTime+.12){const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=beat===0?1000:700;gain.gain.setValueAtTime(.001,next);gain.gain.linearRampToValueAtTime(.15,next+.003);gain.gain.exponentialRampToValueAtTime(.001,next+.045);osc.connect(gain);gain.connect(ctx.destination);voices.add(osc);osc.onended=()=>voices.delete(osc);osc.start(next);osc.stop(next+.05);events.push({time:next,beat});next+=60/bpm;beat=(beat+1)%4;}};
 schedule();timer=setInterval(schedule,25);
 const paint=()=>{if(token!==generation)return;let active;while(events.length&&events[0].time<=ctx.currentTime)active=events.shift();if(active)document.querySelectorAll('#click-beats span').forEach((el,i)=>el.classList.toggle('playing',i===active.beat));frame=requestAnimationFrame(paint);};paint();
 }catch{stop();if(get('click-status'))get('click-status').textContent='Could not start audio. Check browser sound settings and try again.';}}
 document.addEventListener('click',e=>{if(e.target.closest('#click-start'))start();if(e.target.closest('#click-stop')){stop();get('click-status').textContent='Stopped. Adjust the tempo or start again.';}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&context){stop();if(get('click-status'))get('click-status').textContent='Stopped when you left the tab. Start again when ready.';}});
})();
