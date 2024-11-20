#!/usr/bin/env node

import dayjs from "dayjs";
import { HolidayUtil, Lunar, Solar, SolarUtil } from "lunar-javascript";
import { toLunar } from "./toLunar.js";

let holidays;
async function main() {
  const currentYear = dayjs().year();
  const _holidays = HolidayUtil.getHolidays(currentYear);
  const nextYearHolidays = HolidayUtil.getHolidays(currentYear + 1);

  const holidaysMap = new Map();
  _holidays.forEach((holiday) => {
    if (holidaysMap.has(holiday.getName())) {
      return;
    }
    holidaysMap.set(holiday.getName(), holiday);
  });

  nextYearHolidays.forEach((holiday) => {
    if (holidaysMap.has(holiday.getName())) {
      return;
    }
    holidaysMap.set(holiday.getName(), holiday);
  });

  holidays = Array.from(holidaysMap.values());
  toDay();
  wageTime(1);
  wageTime(10);
  wageTime(15);
  wageTime(20);
  holidayTime();
  lastWorkDayTime();
  restOfTheYear();
  taboos();
}

function wageTime(day) {
  const origtinDay = day;
  const year = dayjs().year();
  let month = dayjs().month() + 1;
  const _day = dayjs().date();
  if (_day > day) {
    month += 1;
  }
  let date = dayjs(`${year}-${month}-${day}`);

  let diff = dayjs(date).diff(dayjs(), "day");
  let d = HolidayUtil.getHoliday(year, month, day);
  let isWorkDay = d || (date.day() !== 0 && date.day() !== 6);
  if (diff === 0) {
    console.log(`${day}号发工资，今天发`);
    return;
  }
  if (isWorkDay) {
    console.log(`距离${day}号发工资还有${diff}天`);
    return;
  }

  while (!isWorkDay) {
    day++;
    date = dayjs(`${year}-${month}-${day}`);
    d = HolidayUtil.getHoliday(year, month, day);
    isWorkDay = d || (date.day() !== 0 && date.day() !== 6);
    diff = dayjs(date).diff(dayjs(), "day");
  }

  console.log(`距离${origtinDay}(+${day - origtinDay})号发工资还有${diff}天`);
}

function holidayTime() {
  holidays.forEach((holiday) => {
    const date = dayjs(holiday.getDay());
    if (dayjs().isAfter(date)) {
      return;
    }

    const diff = dayjs(holiday.getDay()).diff(dayjs(), "day");
    console.log(`距离[${holiday.getName()}]还有${diff}天`);
  });
}

function lastWorkDayTime() {
  const lastWorkDay = getLastWorkDay();
  const diff = lastWorkDay.diff(dayjs(), "day");
  if (diff === 0) {
    console.log(`明天是这个月最后一个工作日`);
    return
  }
  console.log(`距离这个月最后一个工作日还有${diff}天`);
}

function getLastWorkDay() {
  const currentMonth = dayjs().month() + 1;
  const nextMonth = currentMonth + 1;
  const year = dayjs().year();
  const date = `${year}-${nextMonth}-01`;
  const lastDay = dayjs(date).subtract(1, "day");
  if (lastDay.day() === 6) {
    return lastDay.subtract(1, "day");
  } else if (lastDay.day() === 0) {
    return lastDay.subtract(2, "day");
  }
  return lastDay;
}

function restOfTheYear() {
  const newYearsDay = dayjs().year() + 1 + "-01-01";
  const diff = dayjs(newYearsDay).diff(dayjs(), "day");
  const daysOfYear = SolarUtil.getDaysOfYear(2016);
  const precent = Math.round(((daysOfYear - diff) / daysOfYear) * 100);
  console.log(`今年已经过了${precent}%,还有${diff}天`);
}

// 忌讳
function taboos() {
  var d = Lunar.fromDate(new Date());

  // 宜
  var l = d.getDayYi();
  const str1 = l.reduce((acc, cur, index) => {
    return acc + cur + (index === l.length - 1 ? "。" : "、");
  }, "宜：");
  console.log(str1);

  // 忌
  l = d.getDayJi();
  const str2 = l.reduce((acc, cur, index) => {
    return acc + cur + (index === l.length - 1 ? "。" : "、");
  }, "忌：");
  console.log(str2);
}
function toDay() {
  const day = dayjs().format("YYYY-MM-DD");
  const week = dayjs().day();
  var solar = Solar.fromDate(new Date());
  const weekMap = {
    1: 'Mon',
    2: 'Tue',
    3: 'What',
    4: 'The',
    5: 'Fuck',
    6: 'Sat',
    0: 'Sun',
  }
  console.log("Mon Tue Wed What The Fuck Sat Sun")
  console.log("-----");
  console.log(`今天是${weekMap[week]}`, day);
  console.log("农历", toLunar(solar.toString()));
  console.log("-----");

  var d = Lunar.fromDate(new Date());

  const l = [...d.getFestivals(), ...d.getOtherFestivals()];
  for (var i = 0, j = l.length; i < j; i++) {
    console.log("节日：", l[i]);
  }
}
main();
