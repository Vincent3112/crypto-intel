import axios from 'axios'

const BASE_URL = 'https://api.coingecko.com/api/v3'

export interface CoinGeckoToken {
  id: string
  symbol: string
  name: string
  market_cap_rank: number
  current_price: number
  market_cap: number
  total_volume: number
  price_change_percentage_24h: number | null
  price_change_percentage_7d_in_currency: number | null
  ath: number | null
  ath_change_percentage: number | null
  circulating_supply: number | null
  total_supply: number | null
}

async function fetchPage(page: number): Promise<CoinGeckoToken[]> {
  const { data } = await axios.get<CoinGeckoToken[]>(`${BASE_URL}/coins/markets`, {
    params: {
      vs_currency: 'usd',
      order: 'market_cap_desc',
      per_page: 100,
      page,
      price_change_percentage: '7d',
      sparkline: false,
    },
  })
  return data
}

export async function fetchTop200Tokens(): Promise<CoinGeckoToken[]> {
  const [page1, page2] = await Promise.all([fetchPage(1), fetchPage(2)])
  return [...page1, ...page2]
}
