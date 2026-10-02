export function monthsInYear(calendar,year) {
  const leap=calendar.timeToComponents(calendar.componentsToTime({year,day:0})).leapYear;
  let start=0;
  return calendar.months.values.map((m,index)=>{
    const days=leap?(m.leapDays??m.days):m.days;
    const value={...m,index,days,start};start+=days;return value;
  });
}
export function eventTimestamp(calendar,{year,month,day,hour=0,minute=0}) {
  if(![year,month,day,hour,minute].every(Number.isInteger)) throw new Error('Enter whole numbers for the date and time.');
  const m=monthsInYear(calendar,year)[month];
  if(!m || day<1 || day>m.days) throw new Error('That day does not exist in the selected month and year.');
  if(hour<0||hour>=calendar.days.hoursPerDay||minute<0||minute>=calendar.days.minutesPerHour) throw new Error('Enter a valid hour and minute.');
  return calendar.componentsToTime({year,day:m.start+day-1,hour,minute});
}
/** Expand only occurrences intersecting the displayed month, without moving world time. */
export function occurrencesInMonth(calendar,event,year,month) {
  const m=monthsInYear(calendar,year)[month];
  if(!m?.days || !Number.isFinite(event.start)) return [];
  const seconds=calendar.days.secondsPerMinute*calendar.days.minutesPerHour*calendar.days.hoursPerDay;
  const start=calendar.componentsToTime({year,day:m.start}), end=start+m.days*seconds;
  const duration=Math.max(0,(event.end??event.start)-event.start), result=[];
  const add=t=>{if(t>=event.start && t<end && (duration?t+duration>start:t>=start)) result.push({...event,start:t,end:t+duration});};
  if(!event.repeat) {add(event.start);return result;}
  if(event.repeat==='day'||event.repeat==='week') {
    const step=seconds*(event.repeat==='week'?calendar.days.values.length:1);
    // For long durations, the most recent occurrence already covers the earlier days.
    let t=event.start+Math.max(0,Math.floor((start-event.start)/step))*step;
    if(t>start && t>event.start) t-=step;
    for(;t<end;t+=step) add(t);
    return result;
  }
  const c=calendar.timeToComponents(event.start);
  if(event.repeat==='month'||event.repeat==='year') {
    const targets=event.repeat==='year'?[{year:year-1,month:c.month},{year,month:c.month}]:[];
    if(event.repeat==='month') {
      let previousMonth=month-1,previousYear=year;
      for(let i=0;i<calendar.months.values.length*2;i++) {
        if(previousMonth<0){previousYear--;previousMonth=calendar.months.values.length-1;}
        const candidate=monthsInYear(calendar,previousYear)[previousMonth];
        if(candidate.days&&!candidate.intercalary){targets.push({year:previousYear,month:previousMonth});break;}
        previousMonth--;
      }
      if(!m.intercalary)targets.push({year,month});
    }
    for(const target of targets) {
      try{add(eventTimestamp(calendar,{...target,day:c.dayOfMonth+1,hour:c.hour,minute:c.minute}));}catch{/* Omit nonexistent festival days and dates, never spill into another month. */}
    }
  }
  return result;
}
