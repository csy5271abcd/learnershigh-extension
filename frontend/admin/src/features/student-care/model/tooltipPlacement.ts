interface Point{x:number;y:number}
interface Input{width:number;boxWidth:number;boxHeight:number;left:number;bottom:number;anchor:Point;series:(Point|null)[][]}
/** Prefer a nearby empty part of the plot, without covering date labels or the y axis. */
export function tooltipPlacement({width,boxWidth,boxHeight,left,bottom,anchor,series}:Input){
 const maxX=Math.max(left+6,width-boxWidth-6),maxY=Math.max(0,bottom-boxHeight-8)
 const xs=[anchor.x+12,anchor.x-boxWidth-12,left+6,maxX].map(x=>Math.max(left+6,Math.min(maxX,x)))
 const ys=[anchor.y-boxHeight-12,anchor.y+12,0,maxY].map(y=>Math.max(0,Math.min(maxY,y)))
 let best={left:xs[0],top:ys[0],score:Infinity}
 for(const x of xs)for(const y of ys){
  const inside=(p:Point,pad:number)=>p.x>=x-pad&&p.x<=x+boxWidth+pad&&p.y>=y-pad&&p.y<=y+boxHeight+pad
  let collisions=0
  for(const points of series)points.forEach((p,i)=>{if(!p)return;if(inside(p,7))collisions+=100;const prev=points[i-1];if(prev)for(let n=1;n<20;n++)if(inside({x:prev.x+(p.x-prev.x)*n/20,y:prev.y+(p.y-prev.y)*n/20},2))collisions++})
  const score=collisions*10000+Math.hypot(x+boxWidth/2-anchor.x,y+boxHeight/2-anchor.y)
  if(score<best.score)best={left:x,top:y,score}
 }
 return {left:best.left,top:best.top}
}
