export function toLunar(date) {
  const yearStr = ['零','一','二','三','四','五','六','七','八','九'];
  const monthStr = ['正','二','三','四','五','六','七','八','九','十','十一','腊'];
  const dayStr = ['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十','三十一'];
  const dateArr = date.split('-');
  const year = dateArr[0].split('').map((item) => yearStr[parseInt(item)]).join('');
  const month = monthStr[parseInt(dateArr[1])-1];
  const day = dayStr[parseInt(dateArr[2])-1];
  const dayStrRes = year + '年' + month + '月'+ day;
  return dayStrRes;
}
