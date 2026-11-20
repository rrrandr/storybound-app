(function(){
  'use strict';
  var active=null;
  function mount(opts){
    var host=opts.host,pkg=opts.pkg,beats=pkg.beats||[],index=0,renderId=0,timer=null,typing=false,fullText='',destroyed=false;
    if(!host||!beats.length)return null;
    if(active)active.destroy();
    host.innerHTML='<article class="baked-cg-reader"><h1 class="baked-cg-title"></h1><div class="baked-cg-stage"><figure class="baked-cg-figure" aria-label="Scene illustration"></figure><div class="baked-cg-copy staged-beat-reader" aria-label="Current story beat"><p class="baked-cg-speaker"></p><div class="baked-cg-text-wrap"><p class="baked-cg-text"></p></div></div></div><nav class="baked-cg-controls" aria-label="Cinegraphic scene"><button class="baked-cg-prev">Previous beat</button><span class="baked-cg-progress" aria-live="polite"></span><button class="baked-cg-next">Next beat</button></nav></article>';
    host.querySelector('.baked-cg-title').textContent=pkg.title||'';
    var figure=host.querySelector('figure'),copy=host.querySelector('.baked-cg-copy'),wrap=host.querySelector('.baked-cg-text-wrap'),speaker=host.querySelector('.baked-cg-speaker'),text=host.querySelector('.baked-cg-text'),prev=host.querySelector('.baked-cg-prev'),next=host.querySelector('.baked-cg-next'),progress=host.querySelector('.baked-cg-progress');
    function stopTyping(){if(timer)clearTimeout(timer);timer=null;typing=false;copy.classList.remove('baked-cg-typing');}
    function complete(){if(!typing)return false;stopTyping();text.textContent=fullText;return true;}
    function reveal(beat){
      stopTyping();fullText=String(beat.text||'');wrap.dataset.fullText=fullText;copy.dataset.kind=beat.kind||'narration';
      // Match CG's reveal policy: exposition types at 26ms/character;
      // other beats fade in. No dialogue extraction or prose rewriting.
      var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(beat.kind==='exposition'&&fullText.length>8&&!reduced){
        var at=0;typing=true;copy.classList.add('baked-cg-typing');text.textContent='';
        function step(){if(destroyed)return;at++;text.textContent=fullText.slice(0,at);if(at>=fullText.length){stopTyping();return;}timer=setTimeout(step,26);}
        step();
      }else{text.textContent=fullText;}
      copy.classList.remove('baked-cg-beat-in');void copy.offsetWidth;copy.classList.add('baked-cg-beat-in');
    }
    async function render(){
      var token=++renderId,beat=beats[index];if(opts.onChange)opts.onChange(index);host.dataset.beatIndex=String(index);host.dataset.beatCount=String(beats.length);
      speaker.textContent=beat.kind==='dialogue'&&/["“][^"”]+["”]/.test(beat.text||'')?(beat.speaker||''):'';speaker.hidden=!speaker.textContent;reveal(beat);
      prev.disabled=index===0;next.textContent=index===beats.length-1?'Enter the encounter':'Next beat';progress.textContent=(index+1)+' / '+beats.length;
      var stage=document.createElement('div');await opts.mountOccurrence(stage,beat.image,pkg);if(destroyed||token!==renderId)return;
      figure.replaceChildren(...Array.from(stage.childNodes));if(!figure.querySelector('img')){var msg=document.createElement('p');msg.textContent='The illustration could not be loaded.';figure.appendChild(msg);}
    }
    function advance(){if(complete())return;if(index<beats.length-1){index++;render();}else if(opts.onComplete)opts.onComplete();}
    function rewind(){if(complete())return;if(index>0){index--;render();}}
    prev.onclick=rewind;next.onclick=advance;
    copy.onclick=function(){if(window.getSelection&&String(window.getSelection()).trim())return;advance();};
    function keyboard(e){
      if(destroyed||!host.isConnected||!host.getClientRects().length)return;
      var tag=document.activeElement&&document.activeElement.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(document.activeElement&&document.activeElement.isContentEditable))return;
      if(tag==='BUTTON'&&(!host.contains(document.activeElement)||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')))return;
      if(e.key==='ArrowRight'||e.code==='Space'||e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();advance();}
      else if(e.key==='ArrowLeft'){e.preventDefault();e.stopImmediatePropagation();rewind();}
    }
    document.addEventListener('keydown',keyboard,true);
    var api={getIndex:function(){return index;},complete:complete,show:function(n){index=Math.max(0,Math.min(beats.length-1,Number(n)||0));return render();},destroy:function(){destroyed=true;stopTyping();document.removeEventListener('keydown',keyboard,true);}};
    active=api;render();return api;
  }
  window.SB_BAKED_CG_READER={mount:mount,unmount:function(){if(active)active.destroy();active=null;}};
})();
