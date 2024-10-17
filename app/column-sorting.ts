import { Row } from '@tanstack/react-table';

import { isNull, isUndefined } from '@/lib/type-predicates';
import { CoinListing } from '@/lib/services/cmc/schemas';

export const sortRawMarketData = (
  rowA: Row<CoinListing>,
  rowB: Row<CoinListing>,
  columnId: keyof CoinListing['raw']
) => {
  const a = rowA.original.raw[columnId];
  const b = rowB.original.raw[columnId];

  if (a === b) return 0;

  if (isNull(a) || isUndefined(a)) {
    return 1;
  }

  if (isNull(b) || isUndefined(b)) {
    return -1;
  }

  return a - b;
};
