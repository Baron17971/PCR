import { getCache } from '@vercel/functions';
import crypto from 'node:crypto';

const TTL = 2592000;
const NS = 'pcr-live-quiz-v1';
const SHARDS = 32;
const OPTION_COUNT = 4;
const QUESTION_COUNT = 25;
const cache = () => getCache(undefined, NS);
const roomKey = code => `room:${code}`;
const votesKey = (room, shard) => `votes:${room.code}:q${room.questionIndex}:${shard}`;
const clean = (value, max=120) => typeof value === 'string' ? value.trim().slice(0,max) : '';
const newCode = () => String(crypto.randomInt(100000,1000000));
function hash(value){let result=2166136261;for(const char of value){result^=char.charCodeAt(0);result=Math.imul(result,16777619);}return result>>>0;}
function sameToken(a,b){if(!a||!b)return false;const aa=Buffer.from(String(a));const bb=Buffer.from(String(b));return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);}
async function readBody(req){if(req.body&&typeof req.body==='object')return req.body;const chunks=[];for await(const chunk of req)chunks.push(chunk);try{return JSON.parse(Buffer.concat(chunks).toString())}catch{return{}}}
async function getRoom(code){return cache().get(roomKey(code));}
async function saveRoom(room){await cache().set(roomKey(room.code),room,{ttl:TTL});}
function publicRoom(room){return {code:room.code,className:room.className,questionIndex:room.questionIndex,status:room.status,resultsVisible:room.resultsVisible,version:room.version,createdAt:room.createdAt,updatedAt:room.updatedAt};}
async function getBucket(room,voterId){const shard=hash(voterId)%SHARDS;return {shard,key:votesKey(room,shard),bucket:(await cache().get(votesKey(room,shard)))||{}};}
async function myVote(room,voterId){if(!voterId)return null;const {bucket}=await getBucket(room,voterId);return Object.prototype.hasOwnProperty.call(bucket,voterId)?bucket[voterId].answer:null;}
async function aggregate(room){const buckets=await Promise.all(Array.from({length:SHARDS},(_,i)=>cache().get(votesKey(room,i))));const counts=Array(OPTION_COUNT).fill(0);let total=0;for(const bucket of buckets){if(!bucket)continue;for(const v of Object.values(bucket)){const a=Number(v?.answer);if(Number.isInteger(a)&&a>=0&&a<OPTION_COUNT){counts[a]++;total++;}}}return {counts,total};}
async function resetVotes(room){await Promise.all(Array.from({length:SHARDS},(_,i)=>cache().delete(votesKey(room,i))));}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  try{
    if(req.method==='GET'){
      const code=clean(req.query?.code,10); const voterId=clean(req.query?.voterId,120); const teacherToken=clean(req.query?.teacherToken,120);
      if(!code)return res.status(400).json({error:'missing_code'});
      const room=await getRoom(code); if(!room)return res.status(404).json({error:'room_not_found'});
      const teacher=sameToken(teacherToken,room.teacherToken);
      const vote=await myVote(room,voterId);
      const results=(teacher||room.resultsVisible||req.query?.projector!==undefined)?await aggregate(room):await aggregate(room);
      return res.json({...publicRoom(room),myVote:vote,results: teacher||room.resultsVisible||!voterId ? results : {counts:[],total:results.total},teacher});
    }
    if(req.method!=='POST')return res.status(405).json({error:'method'});
    const body=await readBody(req); const action=clean(body.action,30);
    if(action==='create'){
      let code=''; for(let i=0;i<10;i++){const candidate=newCode();if(!await getRoom(candidate)){code=candidate;break;}}
      if(!code)return res.status(503).json({error:'code_generation_failed'});
      const now=Date.now(); const room={code,teacherToken:crypto.randomBytes(24).toString('hex'),className:clean(body.className,60),questionIndex:0,status:'closed',resultsVisible:false,version:1,createdAt:now,updatedAt:now};
      await saveRoom(room); return res.status(201).json({...publicRoom(room),teacherToken:room.teacherToken,results:{counts:[0,0,0,0],total:0}});
    }
    const code=clean(body.code,10); const room=await getRoom(code); if(!room)return res.status(404).json({error:'room_not_found'});
    if(action==='vote'){
      if(room.status!=='open'||room.resultsVisible)return res.status(409).json({error:'poll_closed'});
      const voterId=clean(body.voterId,120); const name=clean(body.name,40); const answer=Number(body.answer); const qIndex=Number(body.questionIndex);
      if(!voterId||!Number.isInteger(answer)||answer<0||answer>=OPTION_COUNT||qIndex!==room.questionIndex)return res.status(400).json({error:'bad_vote'});
      const {key,bucket}=await getBucket(room,voterId); bucket[voterId]={answer,name,at:Date.now()}; await cache().set(key,bucket,{ttl:TTL});
      room.updatedAt=Date.now(); await saveRoom(room); return res.json({ok:true,myVote:answer});
    }
    if(!sameToken(clean(body.teacherToken,120),room.teacherToken))return res.status(403).json({error:'teacher_auth_failed'});
    if(action==='setStatus')room.status=body.status==='open'?'open':'closed';
    else if(action==='setVisibility'){room.resultsVisible=Boolean(body.resultsVisible);if(room.resultsVisible)room.status='closed';}
    else if(action==='setQuestion'){
      const next=Number(body.questionIndex); if(!Number.isInteger(next)||next<0||next>=QUESTION_COUNT)return res.status(400).json({error:'bad_question'});
      room.questionIndex=next; room.status='closed'; room.resultsVisible=false;
    }
    else if(action==='reset'){await resetVotes(room);room.resultsVisible=false;room.status='closed';}
    else return res.status(400).json({error:'action'});
    room.version++; room.updatedAt=Date.now(); await saveRoom(room); return res.json({...publicRoom(room),results:await aggregate(room),teacher:true});
  }catch(error){console.error(error);return res.status(500).json({error:'server_error'});}
}
