(function(){
  'use strict';
  function mount(opts){
    var host=opts.host,pkg=opts.pkg,beats=pkg.beats||[],index=0,renderId=0;
    if(!host||!beats.length)return null;
    host.innerHTML='<article class="baked-cg-reader"><h1 class="baked-cg-title"></h1><figure class="baked-cg-figure" aria-label="Scene illustration"></figure><div class="baked-cg-copy"><p class="baked-cg-speaker"></p><p class="baked-cg-text"></p></div><nav class="baked-cg-controls" aria-label="Cinegraphic scene"><button class="baked-cg-prev">Previous beat</button><span class="baked-cg-progress" aria-live="polite"></span><button class="baked-cg-next">Next beat</button></nav></article>';
    host.querySelector('.baked-cg-title').textContent=pkg.title||'';
    var figure=host.querySelector('figure'),speaker=host.querySelector('.baked-cg-speaker'),text=host.querySelector('.baked-cg-text'),prev=host.querySelector('.baked-cg-prev'),next=host.querySelector('.baked-cg-next'),progress=host.querySelector('.baked-cg-progress');
    async function render(){
      var token=++renderId,beat=beats[index];if(opts.onChange)opts.onChange(index);host.dataset.beatIndex=String(index);host.dataset.beatCount=String(beats.length);
      speaker.textContent=beat.kind==='dialogue'?(beat.speaker||''):'';speaker.hidden=!speaker.textContent;text.textContent=beat.text||'';
      prev.disabled=index===0;next.textContent=index===beats.length-1?'Enter the encounter':'Next beat';progress.textContent=(index+1)+' / '+beats.length;
      var stage=document.createElement('div');await opts.mountOccurrence(stage,beat.image,pkg);if(token!==renderId)return;
      figure.replaceChildren(...Array.from(stage.childNodes));if(!figure.querySelector('img')){var msg=document.createElement('p');msg.textContent='The illustration could not be loaded.';figure.appendChild(msg);}
    }
    prev.onclick=function(){if(index>0){index--;render();}};
    next.onclick=function(){if(index<beats.length-1){index++;render();}else if(opts.onComplete)opts.onComplete();};
    render();return {getIndex:function(){return index;},show:function(n){index=Math.max(0,Math.min(beats.length-1,Number(n)||0));return render();}};
  }
  window.SB_BAKED_CG_READER={mount:mount};
})();
