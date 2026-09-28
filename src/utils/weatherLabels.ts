export interface WeatherInfo {
  label: string;
  icon: string;
  description: string;
}

const WEATHER_MAP: Record<number, WeatherInfo> = {
  0: { label: 'Trời nắng', icon: 'wb_sunny', description: 'Trời quang đãng, không mưa' },
  1: { label: 'Nắng nhẹ', icon: 'wb_sunny', description: 'Ít mây, trời nắng dịu' },
  2: { label: 'Nắng gián đoạn', icon: 'partly_cloudy_day', description: 'Mây thay đổi, có nắng gián đoạn' },
  3: { label: 'Nhiều mây', icon: 'cloud', description: 'Trời âm u, nhiều mây' },
  45: { label: 'Sương mù', icon: 'foggy', description: 'Sương mù xuất hiện sáng sớm' },
  48: { label: 'Sương muối', icon: 'foggy', description: 'Sương đọng lạnh' },
  51: { label: 'Mưa phùn nhẹ', icon: 'rainy_light', description: 'Mưa nhỏ rải rác' },
  53: { label: 'Mưa phùn', icon: 'rainy_light', description: 'Mưa phùn đều hạt' },
  55: { label: 'Mưa phùn dày', icon: 'rainy', description: 'Mưa phùn liên tục' },
  61: { label: 'Mưa rào nhẹ', icon: 'rainy', description: 'Mưa rào thoáng qua' },
  63: { label: 'Mưa vừa', icon: 'rainy', description: 'Mưa vừa diện rộng' },
  65: { label: 'Mưa to', icon: 'rainy_heavy', description: 'Mưa to cục bộ' },
  80: { label: 'Mưa rào nhẹ', icon: 'rainy', description: 'Mưa rào từng đợt' },
  81: { label: 'Mưa rào vừa', icon: 'rainy', description: 'Mưa rào ngắn' },
  82: { label: 'Mưa rất to', icon: 'rainy_heavy', description: 'Mưa rào rất to kèm gió' },
  95: { label: 'Dông sét', icon: 'thunderstorm', description: 'Cảnh báo mưa dông kèm sấm sét' },
  96: { label: 'Dông kèm mưa đá', icon: 'thunderstorm', description: 'Dông mạnh kèm mưa đá' },
  99: { label: 'Dông bão mạnh', icon: 'thunderstorm', description: 'Dông tố nguy hiểm' },
};

const DEFAULT_WEATHER: WeatherInfo = {
  label: 'Nhiều mây',
  icon: 'cloud',
  description: 'Thời tiết mát mẻ',
};

export function getWeatherInfo(code: number): WeatherInfo {
  return WEATHER_MAP[code] || DEFAULT_WEATHER;
}

export function getWeatherLabel(code: number): string {
  return getWeatherInfo(code).label;
}

export function getWeatherIcon(code: number): string {
  return getWeatherInfo(code).icon;
}
