const test=require('node:test'),assert=require('node:assert/strict'),zlib=require('node:zlib'),zip=require('../bitbank-zip.js');
test('bitbank-style ZIP with a data descriptor extracts one CSV and rejects corruption',async()=>{
 const content=Buffer.from('取引id,通貨ペア\n1,BTC_JPY\n'),filename=Buffer.from('spot.csv'),compressed=zlib.deflateRawSync(content),crc=zlib.crc32(content);
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(8,6);local.writeUInt16LE(8,8);local.writeUInt16LE(filename.length,26);
 const descriptor=Buffer.alloc(16);descriptor.writeUInt32LE(0x08074b50);descriptor.writeUInt32LE(crc,4);descriptor.writeUInt32LE(compressed.length,8);descriptor.writeUInt32LE(content.length,12);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(8,8);central.writeUInt16LE(8,10);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(content.length,24);central.writeUInt16LE(filename.length,28);
 const offset=local.length+filename.length+compressed.length+descriptor.length;
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+filename.length,12);end.writeUInt32LE(offset,16);
 const archive=Buffer.concat([local,filename,compressed,descriptor,central,filename,end]);const bytes=archive.buffer.slice(archive.byteOffset,archive.byteOffset+archive.byteLength);
 assert.equal(new TextDecoder().decode((await zip.extract(bytes))[0].bytes),content.toString());
 const damaged=Buffer.from(archive);damaged[local.length+filename.length+2]^=1;
 await assert.rejects(zip.extract(damaged.buffer.slice(damaged.byteOffset,damaged.byteOffset+damaged.byteLength)),/解凍できません|破損/);
});
