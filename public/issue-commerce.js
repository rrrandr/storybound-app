// One issue is one purchase. Shared by the browser and the purchase endpoint.
(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SB_ISSUE_COMMERCE=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var prices=Object.freeze({literary:Object.freeze({scenesPerIssue:20,fortuneCost:60}),cg:Object.freeze({scenesPerIssue:10,fortuneCost:130})});
  var starters=Object.freeze({starter_the_first_taste:'literary',starter_glass_house:'literary',starter_famous_fate:'literary',starter_first_sacrifice:'cg'});
  var pending=new Map();
  function format(value){return /^(cg|graphic|graphic_novel|staged_story_mode|cinematic)$/.test(String(value))?'cg':'literary';}
  function purchase(opts){
    var key=opts.accountId+':'+opts.storyId+':'+opts.issueIndex;
    if(pending.has(key))return pending.get(key);
    var promise=new Promise(function(resolve){
      var modal=document.createElement('div');modal.className='issue-purchase-overlay';modal.id='issuePurchaseModal';
      modal.innerHTML='<section class="issue-purchase-card" role="dialog" aria-modal="true" aria-labelledby="issuePurchaseTitle"><p class="issue-purchase-eyebrow">Issue purchase</p><h2 id="issuePurchaseTitle"></h2><p id="issuePurchaseDescription"></p><p id="issuePurchaseBalance"></p><p id="issuePurchaseError" role="alert"></p><button id="issuePurchaseConfirm"></button><button id="issuePurchaseTopup" hidden>Get Fortunes</button><button id="issuePurchaseCancel">Not now</button></section>';
      var mode=format(opts.format),price=prices[mode],cost=price.fortuneCost,balance=Number(opts.balance)||0;
      modal.querySelector('#issuePurchaseTitle').textContent=opts.title||'Your story';
      modal.querySelector('#issuePurchaseDescription').textContent='Issue '+opts.issueIndex+' · '+(mode==='cg'?'Cinegraphic':'Literary')+' · '+price.scenesPerIssue+' scenes. One purchase covers every scene in this issue.';
      modal.querySelector('#issuePurchaseBalance').textContent='Price: '+cost+' Fortunes. Your balance: '+balance+' Fortunes.'+(balance<cost?' You need '+(cost-balance)+' more.':' Balance after purchase: '+(balance-cost)+' Fortunes.');
      if(opts.retryPending)modal.querySelector('#issuePurchaseBalance').textContent='A purchase was previously attempted. Check that same purchase to recover it safely. A completed purchase will not be charged again.';
      var confirm=modal.querySelector('#issuePurchaseConfirm'),cancel=modal.querySelector('#issuePurchaseCancel'),topup=modal.querySelector('#issuePurchaseTopup');
      confirm.textContent=opts.retryPending?'Check previous purchase':'Buy Issue '+opts.issueIndex+' — '+cost+' Fortunes';confirm.disabled=balance<cost&&!opts.retryPending;
      topup.hidden=balance>=cost||!opts.onTopUp;topup.onclick=function(){close(false);opts.onTopUp();};
      var closed=false,busy=false;function close(result){if(closed||busy)return;closed=true;modal.remove();resolve(result);}
      cancel.onclick=function(){close(false);};modal.addEventListener('click',function(e){if(e.target===modal)close(false);});
      modal.addEventListener('keydown',function(e){if(e.key==='Escape')close(false);});
      confirm.onclick=async function(){if(busy||closed||(balance<cost&&!opts.retryPending))return;busy=true;confirm.disabled=true;cancel.disabled=true;
        try{var receipt=await opts.charge(cost);if(!receipt)throw Error('The purchase was not confirmed.');busy=false;close(receipt);}
        catch(e){busy=false;confirm.disabled=false;cancel.disabled=false;modal.querySelector('#issuePurchaseError').textContent=e.message||'Could not confirm the purchase. Please try again.';}
      };
      document.body.appendChild(modal);cancel.focus();
    }).finally(function(){pending.delete(key);});pending.set(key,promise);return promise;
  }
  return {ISSUE_PRICING:prices,STARTER_FORMATS:starters,format:format,purchase:purchase};
});
