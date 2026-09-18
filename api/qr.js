import QRCode from 'qrcode';
export default async function handler(req,res){
  try{const url=String(req.query?.url||'').slice(0,1000);if(!/^https?:\/\//.test(url))return res.status(400).send('bad url');const svg=await QRCode.toString(url,{type:'svg',margin:1,width:320,errorCorrectionLevel:'M'});res.setHeader('content-type','image/svg+xml; charset=utf-8');res.setHeader('cache-control','public, max-age=300');return res.status(200).send(svg);}catch(e){return res.status(500).send('qr error')}
}
