/** Japanese national holidays. Supports the current statutory rules (2020 onward). */
const key = (year:number, month:number, day:number) => `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
const nthMonday = (year:number,month:number,nth:number) => { const first=new Date(Date.UTC(year,month-1,1)).getUTCDay(); return 1+((8-first)%7)+(nth-1)*7; };
const vernal = (year:number) => Math.floor(20.8431+0.242194*(year-1980)-Math.floor((year-1980)/4));
const autumnal = (year:number) => Math.floor(23.2488+0.242194*(year-1980)-Math.floor((year-1980)/4));

export function japaneseHolidays(year:number) {
  const holidays=new Map<string,string>();
  const add=(m:number,d:number,name:string)=>holidays.set(key(year,m,d),name);
  add(1,1,"元日"); add(1,nthMonday(year,1,2),"成人の日"); add(2,11,"建国記念の日"); add(2,23,"天皇誕生日");
  add(3,vernal(year),"春分の日"); add(4,29,"昭和の日"); add(5,3,"憲法記念日"); add(5,4,"みどりの日"); add(5,5,"こどもの日");
  add(7,nthMonday(year,7,3),"海の日"); add(8,11,"山の日"); add(9,nthMonday(year,9,3),"敬老の日"); add(9,autumnal(year),"秋分の日");
  add(10,nthMonday(year,10,2),"スポーツの日"); add(11,3,"文化の日"); add(11,23,"勤労感謝の日");
  // A weekday between two holidays and the weekday following a Sunday holiday are holidays too.
  for(let day=2;day<366;day++){const d=new Date(Date.UTC(year,0,day));const date=key(year,d.getUTCMonth()+1,d.getUTCDate());if(!holidays.has(date)){const before=new Date(d.getTime()-86400000),after=new Date(d.getTime()+86400000);if(holidays.has(key(year,before.getUTCMonth()+1,before.getUTCDate()))&&holidays.has(key(year,after.getUTCMonth()+1,after.getUTCDate())))holidays.set(date,"国民の休日");}}
  [...holidays].sort(([a],[b])=>a.localeCompare(b)).forEach(([date])=>{const d=new Date(`${date}T00:00:00Z`);if(d.getUTCDay()===0){do d.setUTCDate(d.getUTCDate()+1);while(holidays.has(key(year,d.getUTCMonth()+1,d.getUTCDate())));holidays.set(key(year,d.getUTCMonth()+1,d.getUTCDate()),"振替休日");}});
  return holidays;
}

export function holidayName(date:string){return japaneseHolidays(Number(date.slice(0,4))).get(date);}
