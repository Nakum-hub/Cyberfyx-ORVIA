import {inflateRawSync,crc32} from 'node:zlib';

export function isText(bytes: Buffer) {
  try {
    const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
    for(const character of text){const code=character.codePointAt(0)!;if((code<32&&![9,10,13].includes(code))||code===127)return false;}
    return true;
  } catch {return false;}
}

/** Bounded OPC identification, not a document rendering/antivirus claim. ZIP64 and encrypted archives are refused. */
export function isOffice(bytes: Buffer, kind: 'docx'|'xlsx') {
  try {
    let end=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--) {
      if(bytes.readUInt32LE(i)===0x06054b50&&i+22+bytes.readUInt16LE(i+20)===bytes.length){end=i;break;}
    }
    if(end<0||bytes.readUInt16LE(end+4)||bytes.readUInt16LE(end+6))return false;
    const count=bytes.readUInt16LE(end+10),size=bytes.readUInt32LE(end+12),start=bytes.readUInt32LE(end+16);
    if(!count||count>4096||bytes.readUInt16LE(end+8)!==count||start+size!==end)return false;
    const wanted=kind==='docx'?'word/document.xml':'xl/workbook.xml';
    const found=new Map<string,Buffer>();const names=new Set<string>();let offset=start,total=0;
    for(let n=0;n<count;n++) {
      if(offset+46>end||bytes.readUInt32LE(offset)!==0x02014b50)return false;
      const flags=bytes.readUInt16LE(offset+8),method=bytes.readUInt16LE(offset+10),compressed=bytes.readUInt32LE(offset+20),expanded=bytes.readUInt32LE(offset+24);
      const nl=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32),local=bytes.readUInt32LE(offset+42);
      const next=offset+46+nl+extra+comment;
      if(next>end||flags&1||![0,8].includes(method)||expanded>16*1024*1024||(total+=expanded)>64*1024*1024||local+30>start)return false;
      const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(offset+46,offset+46+nl));
      if(names.has(name)||name.startsWith('/')||name.includes('\\')||name.split('/').includes('..'))return false;names.add(name);
      if(bytes.readUInt32LE(local)!==0x04034b50||bytes.readUInt16LE(local+8)!==method||bytes.readUInt16LE(local+6)!==flags)return false;
      const lnl=bytes.readUInt16LE(local+26),le=bytes.readUInt16LE(local+28),data=local+30+lnl+le;
      if(data+compressed>start||!bytes.subarray(local+30,local+30+lnl).equals(bytes.subarray(offset+46,offset+46+nl)))return false;
      if(name==='[Content_Types].xml'||name===wanted) {
        const payload=bytes.subarray(data,data+compressed);
        const xml=method===0?payload:inflateRawSync(payload,{maxOutputLength:16*1024*1024});
        if(xml.length!==expanded||crc32(xml)!==bytes.readUInt32LE(offset+16)||!isText(xml))return false;found.set(name,xml);
      }
      offset=next;
    }
    if(offset!==end||found.size!==2)return false;
    const types=found.get('[Content_Types].xml')!.toString('utf8'),document=found.get(wanted)!.toString('utf8');
    return types.includes(`/${wanted}`)&&types.includes(kind==='docx'?'wordprocessingml.document.main+xml':'spreadsheetml.sheet.main+xml')&&
      (kind==='docx'?/<(?:\w+:)?document\b/.test(document):/<(?:\w+:)?workbook\b/.test(document));
  }catch{return false;}
}
