export type OreKind = 'gold' | 'rock' | 'diamond';
export type Mineral = [number, number, number, OreKind, number, number];
export type Level = { name: string; subtitle: string; target: number; seconds: number; ores: Mineral[] };
const gold = (x:number,y:number,large=false):Mineral => [x,y,large?39:29,'gold',large?500:250,large?9:8];
const gem = (x:number,y:number):Mineral => [x,y,13,'diamond',600,2];
const rock = (x:number,y:number):Mineral => [x,y,25,'rock',20,7];
export const LEVELS: Level[] = [
  { name:'金色山谷',subtitle:'GOLDEN VALLEY',target:1000,seconds:60,ores:[
    [190,208,19,'gold',50,3],[365,192,18,'gold',50,3],[669,184,19,'gold',50,3],gold(814,242),gold(282,320,true),gold(594,329,true),gold(898,402),gold(446,425),gem(120,414),gem(766,398),rock(464,252),rock(712,291),rock(94,298),rock(370,375)]},
  { name:'碎石坡地',subtitle:'THE STONY RIDGE',target:1400,seconds:60,ores:[
    gold(245,220),gold(730,225),rock(430,220),rock(595,230),gold(335,335,true),gold(650,355,true),gem(135,410),gem(855,420),rock(165,300),rock(802,310),gold(485,420),gold(940,345)]},
  { name:'水晶矿脉',subtitle:'CRYSTAL VEINS',target:1800,seconds:65,ores:[
    rock(370,210),gold(650,195),gem(490,300),rock(470,200),rock(620,290),gold(225,305,true),gold(775,340,true),gem(110,425),gem(895,435),gem(375,425),rock(520,390),gold(620,440)]},
  { name:'深层金库',subtitle:'THE DEEP RESERVE',target:2200,seconds:65,ores:[
    gold(330,210),rock(510,220),rock(690,245),gold(175,325,true),gold(410,345,true),gold(760,355,true),gem(90,435),gem(580,435),gem(920,420),rock(580,330),gold(300,445),gold(845,225)]},
  { name:'最后的宝藏',subtitle:'THE LAST BONANZA',target:2600,seconds:70,ores:[
    rock(380,205),rock(600,205),gold(210,275,true),gold(790,280,true),gem(500,290),gold(340,355,true),gold(665,350,true),gem(110,435),gem(890,435),gem(490,445),rock(200,385),rock(790,390),gold(595,265)]},
];
export const SHOP = { bombPrice:150, potionPrice:300, maxBombs:3, strengthMultiplier:1.65 };
