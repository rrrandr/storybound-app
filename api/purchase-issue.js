import commerce from '../public/issue-commerce.js';
import { handleConsumeFortune } from './consume-fortune.js';

// The server chooses the amount. A browser cannot turn an issue into a 1F scene.
export async function handlePurchaseIssue(req,res,deps={}) {
  if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');return res.status(204).end();}
  if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
  const body=req.body||{},match=/^issue_(purchase|continuation)_(literary|cg)$/.exec(body.context||'');
  if(!match)return res.status(400).json({error:'issue_context_required'});
  const mode=match[2],price=commerce.ISSUE_PRICING[mode].fortuneCost;
  if(!body.storyId||typeof body.storyId!=='string')return res.status(400).json({error:'story_id_required'});
  const starter=body.metadata?.starterId;
  if(starter&&commerce.STARTER_FORMATS[starter]!==mode)return res.status(400).json({error:'starter_format_mismatch'});
  if(body.amount!=null&&Number(body.amount)!==price)return res.status(409).json({error:'issue_price_mismatch',requiredFortunes:price});
  return handleConsumeFortune({method:req.method,headers:req.headers,body:{...body,amount:price}},res,deps);
}
export default function handler(req,res){return handlePurchaseIssue(req,res);}
