export const DEFAULT_WORK_START = "09:00";
export const DEFAULT_WORK_END = "17:30";
export const WORK_BREAK_MINUTES = 60;
export function timeToMinutes(value:string){const match=/^(\d{2}):(\d{2})(?::\d{2})?$/.exec(value);if(!match)return null;const hours=Number(match[1]),minutes=Number(match[2]);return hours<=23&&minutes<=59?hours*60+minutes:null;}
export function workingMinutes(start:string,end:string,breakMinutes=WORK_BREAK_MINUTES){const from=timeToMinutes(start),to=timeToMinutes(end);if(from===null||to===null||to<=from)return null;const result=to-from-breakMinutes;return result>0?result:null;}
export function formatWorkingDuration(minutes:number){const hours=Math.floor(minutes/60),remainder=minutes%60;return `${hours}時間${remainder?`${remainder}分`:""}`;}
