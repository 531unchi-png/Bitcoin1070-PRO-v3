// Read bitbank's ZIP downloads locally; never extract paths to the filesystem.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.B1070BitbankZip=api;})(typeof window!=='undefined'?window:null,()=>{
  'use strict';
  const MAX=6_000_000;
  function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return(crc^0xffffffff)>>>0;}
  async function extract(buffer){
    const bytes=new Uint8Array(buffer),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
    if(bytes.length>MAX)throw Error('ZIPが大きすぎます（6MBまで）');
    let end=-1;for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){end=i;break;}
    if(end<0||v.getUint16(end+4,true)||v.getUint16(end+6,true)||v.getUint16(end+8,true)!==v.getUint16(end+10,true))throw Error('ZIP形式を確認できません');
    const count=v.getUint16(end+10,true),start=v.getUint32(end+16,true),centralEnd=start+v.getUint32(end+12,true);if(count>20||centralEnd>end)throw Error('ZIPの内容が多すぎるか不正です');
    const files=[];let at=start,total=0;
    for(let i=0;i<count;i++){
      if(at+46>centralEnd||v.getUint32(at,true)!==0x02014b50)throw Error('ZIPの一覧が不正です');
      const method=v.getUint16(at+10,true),checksum=v.getUint32(at+16,true),compressed=v.getUint32(at+20,true),size=v.getUint32(at+24,true),nameLength=v.getUint16(at+28,true),extra=v.getUint16(at+30,true),comment=v.getUint16(at+32,true),local=v.getUint32(at+42,true),nameEnd=at+46+nameLength;const name=new TextDecoder('utf-8').decode(bytes.subarray(at+46,nameEnd));at=nameEnd+extra+comment;
      if(at>centralEnd||size>MAX||compressed>MAX)throw Error('ZIP内のCSVが大きすぎます');
      if(!/\.csv$/i.test(name))continue;
      if(method!==0&&method!==8)throw Error('ZIPの圧縮方式に対応していません');
      if(local+30>start||v.getUint32(local,true)!==0x04034b50)throw Error('ZIP内のCSVが不正です');
      const dataStart=local+30+v.getUint16(local+26,true)+v.getUint16(local+28,true);if(dataStart+compressed>start)throw Error('ZIP内のCSVが不正です');
      total+=size;if(total>MAX||files.length>=10)throw Error('ZIP内のCSVは合計6MB・10件までです');
      const payload=bytes.subarray(dataStart,dataStart+compressed);let out;
      if(method===0)out=payload;else{if(typeof DecompressionStream==='undefined')throw Error('このブラウザはZIP解凍に対応していません。iPhoneの「ファイル」でZIPをタップしてCSVを選んでください');try{const stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));out=new Uint8Array(await new Response(stream).arrayBuffer());}catch(_){throw Error('ZIPを解凍できません。「ファイル」でZIPをタップしてCSVを選んでください');}}
      if(out.length!==size||crc32(out)!==checksum)throw Error('ZIP内のCSVが破損しています');files.push({name,bytes:out});
    }
    if(at!==centralEnd||!files.length)throw Error('ZIP内にCSVがありません');return files;
  }
  return{extract};
});
