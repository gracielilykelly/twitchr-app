"use strict";
const commonNames = { "Cyanistes caeruleus":"Blue tit", "Pica pica":"Magpie", "Turdus merula":"Common blackbird", "Parus major":"Great tit", "Erithacus rubecula":"European robin", "Passer domesticus":"House sparrow" };
const palette = ["var(--accent)","var(--success)","var(--info)","var(--warning)","#9483b8","#b99a65","#6a9890","#8c91a0","#ba8d9b"];
const buildDistribution = (species) => {
  let items = species.filter(item=>Number(item.count)>0).map(item=>({...item,count:Number(item.count)})).sort((a,b)=>b.count-a.count);
  if(items.length>8) items=[...items.slice(0,8),{name:"Other species",count:items.slice(8).reduce((sum,item)=>sum+item.count,0)}];
  const total=items.reduce((sum,item)=>sum+item.count,0);
  let angle=-Math.PI/2;
  const slices=items.map((item,index)=>{
    const size=item.count/total*Math.PI*2;
    const middle=angle+size/2;
    const entry={...item,name:commonNames[item.name]||item.name,percent:Math.round(item.count/total*1000)/10,color:palette[index],angle:middle,start:angle,size};
    angle+=size;return entry;
  });
  const left=slices.filter(item=>Math.cos(item.angle)<0),right=slices.filter(item=>Math.cos(item.angle)>=0);
  const height=Math.max(440,Math.max(left.length,right.length)*84+70),cy=height/2,cx=320,radius=134;
  for(const side of [left,right]) {
    side.sort((a,b)=>Math.sin(a.angle)-Math.sin(b.angle));
    side.forEach((item,index)=>{
      const naturalY = cy + Math.sin(item.angle) * (radius + 44);
      item.labelY = Math.max(48, naturalY, index ? side[index-1].labelY + 76 : 48);
    });
    if (side.length && side[side.length-1].labelY > height-48) {
      side[side.length-1].labelY = height-48;
      for (let index=side.length-2; index>=0; index--) side[index].labelY = Math.min(side[index].labelY,side[index+1].labelY-76);
    }
  }
  return { total, height, cy, hasData:total>0, slices:slices.map(item=>{
    const outer = radius + 24;
    const startX = cx + Math.cos(item.angle) * (outer + 4);
    const startY = cy + Math.sin(item.angle) * (outer + 4);
    const elbowX = cx + Math.cos(item.angle) * (outer + 20);
    const elbowY = cy + Math.sin(item.angle) * (outer + 20);
    const isLeft=Math.cos(item.angle)<0;
    const name=item.name;
    const words=name.split(/\s+/),lines=[];
    let line="";
    for(const word of words) { if(line && (line+" "+word).length>14){lines.push(line);line=word;}else line+=(line?" ":"")+word; }
    if(line)lines.push(line);
    return {...item, dash:`${item.count/total*2*Math.PI*radius} ${2*Math.PI*radius}`,offset:-((item.start+Math.PI/2)*radius),
      connector:`M ${startX} ${startY} L ${elbowX} ${elbowY} L ${isLeft?151:489} ${elbowY} L ${isLeft?151:489} ${item.labelY} L ${isLeft?137:503} ${item.labelY}`,
      labelX:isLeft?126:514,anchor:isLeft?"end":"start",labelTop:item.labelY-((lines.length-1)*10)-9,
      lines:lines.map((text,index)=>({text,dy:index?20:0})), percentY:item.labelY+((lines.length-1)*10)+17,
    };
  })};
};
module.exports={buildDistribution};
