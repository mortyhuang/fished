import { createElement } from "react";
import { render, Box, Text } from "ink";
import dayjs from "dayjs";
import { HolidayUtil, SolarUtil } from "lunar-javascript";
import holidayApi from "../data/holidayAPI.json" with { type: "json" };

const h = createElement;
// xterm-256 palette inspired hex values (soft, cool)
const weekdayColor = "#AF87FF";
const weekendColor = "#E4E4E4";
const sectionColor = "#5FAFD7";
const holidayFgColor = "#D78787";
const holidayBgColor = "#FFD7D7";
const compFgColor = "#87AFD7";
const compBgColor = "#AFD7FF";
const todayBgColor = "#D7D7FF";
const BAR_WIDTH = 8;
const YEAR_BAR_WIDTH = 20;

function App() {
  const columns = process.stdout.columns || 80;

  const baseWageDays = [1, 10, 15, 20];
  const lastWorkDayOfMonth = getLastWorkDay().date();
  const wageDays = Array.from(
    new Set([...baseWageDays, lastWorkDayOfMonth])
  ).sort((a, b) => a - b);
  const wageRows = wageDays
    .map((day) => {
      const row = getWageInfo(day);
      if (day === lastWorkDayOfMonth) {
        row[1] = `${row[1]}（最后工作日）`;
      }
      return row;
    })
    .sort((a, b) => {
      const da = parseDaysLeft(a[1]) ?? Number.POSITIVE_INFINITY;
      const db = parseDaysLeft(b[1]) ?? Number.POSITIVE_INFINITY;
      return da - db;
    });

  const currentYear = dayjs().year();
  const holidays = getApiHolidays(currentYear);
  const holidayRows = getHolidayRows(holidays);
  const labelWidth = getCountdownLabelWidth(wageRows, holidayRows);

  const yearProgress = getYearProgressInfo(columns);

  const sections = [
    h(YearProgress, { info: yearProgress }),
    h(Calendar, { holidays }),
    h(Section, { title: "Wage Countdown" }, h(WageCards, {
      rows: wageRows,
      maxWidth: columns,
      labelWidth,
    })),
    h(Section, { title: "Holiday Countdown" }, h(HolidayCards, {
      rows: holidayRows,
      maxWidth: columns,
      labelWidth,
    })),
  ];

  return h(
    Box,
    { flexDirection: "column", gap: 0 },
    ...withGaps(sections, 1)
  );
}

function withGaps(nodes, gapLines = 1) {
  const out = [];
  nodes.forEach((node, idx) => {
    if (idx > 0) {
      for (let i = 0; i < gapLines; i += 1) {
        out.push(h(Text, { key: `gap-${idx}-${i}` }, ""));
      }
    }
    out.push(node);
  });
  return out;
}

function Section({ title, children }) {
  return h(
    Box,
    { flexDirection: "column", gap: 0 },
    h(Text, { color: sectionColor, bold: true }, title),
    children
  );
}

function Calendar({ holidays }) {
  const today = dayjs();
  const firstDay = today.startOf("month");
  const daysInMonth = today.daysInMonth();
  const head = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const startWeek = firstDay.day();
  const { holidayDays, compDays } = getHolidayMarks(
    holidays,
    today.year(),
    today.month() + 1
  );

  const cells = [];
  for (let i = 0; i < startWeek; i++) {
    cells.push({ text: "  ", isWeekend: false, isToday: false });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = day === today.date();
    const label = String(day).padStart(2, " ");
    const idx = (startWeek + day - 1) % 7;
    const isWeekend = idx === 0 || idx === 6;
    const isHoliday = holidayDays.has(day);
    const isComp = compDays.has(day);
    cells.push({ text: label, isWeekend, isToday, isHoliday, isComp });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ text: "  ", isWeekend: false, isToday: false });
  }

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const header = h(
    Text,
    null,
    ...head.map((label, idx) =>
      h(
        Text,
        {
          key: label,
          color: idx === 0 || idx === 6 ? weekendColor : weekdayColor,
          bold: true,
        },
        label + (idx < head.length - 1 ? " " : "")
      )
    )
  );

  const body = rows.map((row, rowIndex) =>
    h(
      Text,
      { key: rowIndex },
      ...row.map((cell, idx) =>
        h(
          Text,
          {
            key: `${rowIndex}-${idx}`,
            color: getCalendarTextColor(cell),
            backgroundColor: cell.isToday ? todayBgColor : undefined,
            bold: cell.isToday || cell.isHoliday || cell.isComp,
            underline: false,
          },
          cell.text + (idx < row.length - 1 ? " " : "")
        )
      )
    )
  );

  return h(
    Box,
    { flexDirection: "column", gap: 0 },
    h(
      Text,
      { color: sectionColor, bold: true },
      `Calendar ${today.format("YYYY-MM")}`
    ),
    header,
    ...body
  );
}

function YearProgress({ info }) {
  const displayRatio = info.percent / 100;
  const displayPercent = info.percent;
  return h(
    Box,
    { flexDirection: "column", gap: 0 },
    h(Text, { color: sectionColor, bold: true }, "Year Progress"),
    h(
      Text,
      null,
      h(ProgressBar, {
        ratio: displayRatio,
        width: info.barWidth,
        color: weekdayColor,
        emptyColor: weekendColor,
        filledChar: "█",
      }),
      h(Text, null, ` ${displayPercent}%`)
    ),
    h(
      Text,
      { color: weekendColor },
      `已过 ${info.passed} 天 · 剩余 ${info.remaining} 天`
    )
  );
}

function getHolidayMarks(holidays, year, month) {
  const holidayDays = new Set();
  const compDays = new Set();
  holidays.forEach((holiday) => {
    const start = dayjs(holiday.StartDate);
    const end = dayjs(holiday.EndDate);
    let cursor = start;
    while (cursor.isBefore(end) || cursor.isSame(end, "day")) {
      if (cursor.year() === year && cursor.month() + 1 === month) {
        holidayDays.add(cursor.date());
      }
      cursor = cursor.add(1, "day");
    }
    (holiday.CompDays || []).forEach((d) => {
      const cd = dayjs(d);
      if (cd.year() === year && cd.month() + 1 === month) {
        compDays.add(cd.date());
      }
    });
  });
  return { holidayDays, compDays };
}

function getCalendarTextColor(cell) {
  if (!cell || !cell.text || !cell.text.trim()) return undefined;
  if (cell.isComp) return compFgColor;
  if (cell.isHoliday) return holidayFgColor;
  return cell.isWeekend ? weekendColor : weekdayColor;
}

function getCalendarBgColor(cell) {
  if (!cell || !cell.text || !cell.text.trim()) return undefined;
  if (cell.isComp) return compBgColor;
  if (cell.isHoliday) return holidayBgColor;
  return undefined;
}

function parseDaysLeft(info) {
  const match = info.match(/还有(\d+)天/);
  if (!match) return null;
  return Number(match[1]);
}

function WageCards({ rows, maxWidth, labelWidth }) {
  const width = Math.max(50, Math.min(80, maxWidth || 80));
  const barWidth = BAR_WIDTH;
  const maxDays = Math.max(
    1,
    ...rows.map((row) => parseDaysLeft(row[1]) ?? 0)
  );

  const cards = rows.map(([label, info], idx) => {
    const days = parseDaysLeft(info);
    const ratio = days === null ? 0 : Math.max(0, Math.min(1, 1 - days / maxDays));
    const barColor = gradientColor(idx, rows.length);
    const barEmptyColor = weekendColor;
    const left = padRightVisual(label, labelWidth);

    return h(
      Text,
      { key: label },
      h(Text, { bold: true }, left),
      "",
      h(ProgressBar, {
        ratio,
        width: barWidth,
        color: barColor,
        emptyColor: barEmptyColor,
        filledChar: "━",
      }),
      h(Text, { color: weekendColor }, ` ${info}`)
    );
  });

  return h(Box, { flexDirection: "column", gap: 0 }, ...cards);
}

function HolidayCards({ rows, maxWidth, labelWidth }) {
  const width = Math.max(50, Math.min(80, maxWidth || 80));
  const barWidth = BAR_WIDTH;
  const maxDays = Math.max(1, ...rows.map((row) => row.daysLeft || 0));

  const cards = rows.map((row, idx) => {
    const days = row.daysLeft || 0;
    let ratio = 0;
    if (row.status === "ongoing") {
      const total = row.totalDays || 1;
      ratio = Math.max(0, Math.min(1, days / total));
    } else if (row.status === "upcoming") {
      ratio = Math.max(0, Math.min(1, 1 - days / maxDays));
    }
    const barColor = gradientColor(idx, rows.length);
    const left = padRightVisual(row.label, labelWidth);

    return h(
      Text,
      { key: row.label },
      h(Text, { bold: true }, left),
      "",
      h(ProgressBar, {
        ratio,
        width: barWidth,
        color: barColor,
        emptyColor: weekendColor,
        filledChar: "━",
      }),
      h(Text, { color: weekendColor }, ` ${row.info}`)
    );
  });

  return h(Box, { flexDirection: "column", gap: 0 }, ...cards);
}

function gradientColor(index, total) {
  if (total <= 1) return weekdayColor;
  const t = index / (total - 1);
  return mixHex(weekdayColor, weekendColor, t);
}

function mixHex(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function toHex(n) {
  return n.toString(16).padStart(2, "0");
}

function KeyValueTable({ columns, rows, maxWidth }) {
  const width = Math.max(40, maxWidth || 80);
  const gap = 2;
  const firstMax = 18;
  const firstWidth = Math.min(
    firstMax,
    Math.max(columns[0].length, ...rows.map((r) => r[0].length))
  );
  const secondWidth = Math.max(10, width - firstWidth - gap);

  const header = formatRow(columns, [firstWidth, secondWidth], gap, true);
  const body = rows.flatMap((row) =>
    formatRow(row, [firstWidth, secondWidth], gap, false)
  );

  return h(
    Box,
    { flexDirection: "column", gap: 0 },
    header,
    ...body
  );
}

function formatRow(row, widths, gap, isHeader) {
  const [w1, w2] = widths;
  const left = wrapText(row[0], w1);
  const right = wrapText(row[1], w2);
  const lines = Math.max(left.length, right.length);
  const nodes = [];

  for (let i = 0; i < lines; i++) {
    const l = padRight(left[i] || "", w1);
    const r = padRight(right[i] || "", w2);
    nodes.push(
      h(
        Text,
        { key: `${row[0]}-${i}` },
        h(Text, { bold: isHeader }, l),
        " ".repeat(gap),
        h(Text, { bold: isHeader }, r)
      )
    );
  }

  return nodes;
}

function wrapText(text, width) {
  if (!text) return [""];
  const out = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + width));
    i += width;
  }
  return out;
}

function padRight(text, width) {
  const pad = Math.max(0, width - text.length);
  return text + " ".repeat(pad);
}

function ProgressBar({ ratio, width, color, emptyColor, filledChar }) {
  const filled = Math.round(width * ratio);
  const empty = Math.max(0, width - filled);
  return h(
    Text,
    null,
    h(Text, { color }, filledChar.repeat(filled)),
    h(Text, { color: emptyColor }, filledChar.repeat(empty))
  );
}

function getVisualWidth(text) {
  if (!text) return 0;
  let width = 0;
  for (const ch of String(text)) {
    width += ch.charCodeAt(0) > 255 ? 2 : 1;
  }
  return width;
}

function padRightVisual(text, width) {
  const pad = Math.max(0, width - getVisualWidth(text));
  return String(text) + " ".repeat(pad);
}

function getCountdownLabelWidth(wageRows, holidayRows) {
  const labels = [
    ...wageRows.map((row) => row[0]),
    ...holidayRows.map((row) => row.label),
  ];
  const maxWidth = Math.max(4, ...labels.map(getVisualWidth));
  return maxWidth;
}

function getYearProgressInfo(columns) {
  const newYearsDay = dayjs().year() + 1 + "-01-01";
  const diff = dayjs(newYearsDay).diff(dayjs(), "day");
  const daysOfYear = SolarUtil.getDaysOfYear(dayjs().year());
  const percent = Math.round(((daysOfYear - diff) / daysOfYear) * 100);
  const barWidth = YEAR_BAR_WIDTH;
  return {
    percent,
    passed: daysOfYear - diff,
    remaining: diff,
    barWidth,
  };
}

function getWageInfo(day) {
  const originDay = day;
  const today = dayjs().startOf("day");
  let date = today.date(day);
  if (today.date() > day) {
    date = date.add(1, "month");
  }

  let diff = date.diff(today, "day");
  let d = HolidayUtil.getHoliday(date.year(), date.month() + 1, date.date());
  let isWorkDay = d || (date.day() !== 0 && date.day() !== 6);
  if (diff === 0) {
    return [`${originDay}号`, "今天发"];
  }
  if (isWorkDay) {
    return [`${originDay}号`, `还有${diff}天`];
  }

  while (!isWorkDay) {
    date = date.add(1, "day");
    d = HolidayUtil.getHoliday(date.year(), date.month() + 1, date.date());
    isWorkDay = d || (date.day() !== 0 && date.day() !== 6);
    diff = date.diff(today, "day");
  }

  return [
    `${originDay}号`,
    `还有${diff}天（顺延至${date.format("MM-DD")}）`,
  ];
}

function getApiHolidays(currentYear) {
  const api = loadHolidayApi();
  if (!api || !api.Years) return [];
  const list = [
    ...(api.Years[String(currentYear)] || []),
    ...(api.Years[String(currentYear + 1)] || []),
  ];
  return list;
}

function loadHolidayApi() {
  return holidayApi || null;
}

function getHolidayRows(holidays) {
  const rows = [];
  const today = dayjs().startOf("day");
  holidays.forEach((holiday) => {
    const start = dayjs(holiday.StartDate).startOf("day");
    const end = dayjs(holiday.EndDate).startOf("day");
    if (today.isAfter(end)) {
      return;
    }
    if (today.isBefore(start)) {
      const diff = start.diff(today, "day");
      const total = end.diff(start, "day") + 1;
      rows.push({
        label: holiday.Name,
        info: `还有${diff}天（共${total}天）`,
        daysLeft: diff,
        status: "upcoming",
      });
      return;
    }
    const remaining = end.diff(today, "day") + 1;
    const total = end.diff(start, "day") + 1;
    rows.push({
      label: holiday.Name,
      info: `假期中 还剩${remaining}天`,
      daysLeft: remaining,
      totalDays: total,
      status: "ongoing",
    });
  });
  return rows.length
    ? rows
    : [{ label: "无", info: "-", daysLeft: 0, status: "none" }];
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

render(h(App));
