import { Solar } from "lunar-javascript";

export function toLunar(date) {
  const [year, month, day] = date.split("-").map((v) => parseInt(v, 10));
  const solar = Solar.fromYmd(year, month, day);
  const lunar = solar.getLunar();
  return `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
}
