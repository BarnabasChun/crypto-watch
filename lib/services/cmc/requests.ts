import { env } from '@/lib/env';
import {
  cmcResponse,
  CoinListingsResponse,
  coinListingsResponse,
  GetCoinsListingParams,
} from './schemas';

const BASE_URL = 'https://pro-api.coinmarketcap.com';

async function request(endpoint: string, options?: RequestInit) {
  const headers = {
    Accept: 'application/json',
    'X-CMC_PRO_API_KEY': env.CMC_API_KEY,
    'Accept-Encoding': 'deflate, gzip',
    ...options?.headers,
  };

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return res.json();
}

export async function getCoinsListing({
  currency,
  page,
  perPage,
}: GetCoinsListingParams): Promise<CoinListingsResponse> {
  const start = (page - 1) * perPage + 1;

  const response = await request(
    `/v1/cryptocurrency/listings/latest?start=${start}&limit=${perPage}&convert=${currency}`
  );

  const parsedResponse = cmcResponse.parse(response);

  return coinListingsResponse.parse({
    ...parsedResponse,
    response_status: Array.isArray(parsedResponse.data) ? 'success' : 'error',
  });
}
