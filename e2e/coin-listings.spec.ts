import { DEFAULT_PER_PAGE_OPTION, PER_PAGE_OPTIONS } from '@/lib/constants';
import AxeBuilder from '@axe-core/playwright';
import { test, expect, Page, Locator } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test.describe('Initial page load', () => {
  test('displays the expected default number of coins on the first page', async ({
    page,
  }) => {
    await verifyExpectedResults(page, {
      perPage: 25,
      firstResult: '1',
      lastResult: '25',
    });
    await expect(page.locator('a[aria-current="page"]')).toHaveText('1');
  });

  test('should handle if there are no results', async ({ page }) => {
    await page.goto('/?page=1000000');

    const notFoundPage = page.getByTestId('not-found-page');
    await notFoundPage.waitFor();
  });
});

test.describe('Pagination', () => {
  test('should correctly handle navigating to the next and previous page', async ({
    page,
  }) => {
    // next
    await page.getByRole('link', { name: 'Go to next page' }).click();
    await page.waitForURL('/?page=2');
    await verifyExpectedResults(page, {
      perPage: 25,
      firstResult: '26',
      lastResult: '50',
    });
    await expect(page.locator('a[aria-current="page"]')).toHaveText('2');

    // previous
    await page.getByRole('link', { name: 'Go to previous page' }).click();
    await page.waitForURL('/');
    await verifyExpectedResults(page, {
      perPage: 25,
      firstResult: '1',
      lastResult: '25',
    });
    await expect(page.locator('a[aria-current="page"]')).toHaveText('1');
  });

  test('should navigate the user to their selected page of results', async ({
    page,
  }) => {
    await page
      .getByRole('navigation', { name: 'pagination' })
      .getByRole('link', { name: /^3$/ })
      .click();

    await page.waitForURL('/?page=3');
    await verifyExpectedResults(page, {
      perPage: 25,
      firstResult: '51',
      lastResult: '75',
    });

    await expect(page.locator('a[aria-current="page"]')).toHaveText('3');
  });

  test('should disable the previous page link if the user is on the first page', async ({
    page,
  }) => {
    await expect(
      page.getByRole('link', {
        name: 'Go to previous page',
        disabled: true,
      })
    ).toHaveCSS('pointer-events', 'none');
  });

  test('should disable the current page link if the user is on the first page', async ({
    page,
  }) => {
    const currentPageLink = page.locator('a[aria-current="page"]');
    await expect(currentPageLink).toBeDisabled();
    await expect(currentPageLink).toHaveCSS('pointer-events', 'none');
  });

  test('should disable the next page link if the user is on the last page', async ({
    page,
  }) => {
    const paginationLinks = page
      .getByRole('navigation', { name: 'pagination' })
      .getByRole('link');

    const lastPageIndex = (await paginationLinks.count()) - 1 - 1;

    const lastPageLink = paginationLinks.nth(lastPageIndex);

    await lastPageLink.click();

    await expect(
      page.getByRole('link', { name: 'Go to next page', disabled: true })
    ).toHaveCSS('pointer-events', 'none');
  });
});

test.describe('Row count selection', () => {
  test('changes the number of coins displayed on the page', async ({
    page,
  }) => {
    await changeRowsPerPage(page, 50);

    await page.waitForURL('/?per_page=50');
    await verifyExpectedResults(page, {
      perPage: 50,
      firstResult: '1',
      lastResult: '50',
    });
  });

  test('redirects the user back to the first page on change when on subsequent page', async ({
    page,
  }) => {
    await page.getByRole('link', { name: 'Go to next page' }).click();

    await page.waitForURL('/?page=2');

    await changeRowsPerPage(page, 100);

    expect(page).toHaveURL('/?per_page=100');
    await expect(page.locator('a[aria-current="page"]')).toHaveText('1');
    await verifyExpectedResults(page, {
      perPage: 100,
      firstResult: '1',
      lastResult: '100',
    });
  });

  test('clears all pagination params upon redirect to first page when on subsequent page and default rows per page is selected', async ({
    page,
  }) => {
    await changeRowsPerPage(page, 50);
    await page.waitForURL('/?per_page=50');

    await page.getByRole('link', { name: 'Go to next page' }).click();
    await page.waitForURL('/?per_page=50&page=2');

    await changeRowsPerPage(page, DEFAULT_PER_PAGE_OPTION);
    await page.waitForURL('/');
  });
});

test.describe('Sorting', () => {
  test('should toggle sorting list results in order of market cap ranking on click of the rank header', async ({
    page,
  }) => {
    const rankHeader = page.getByText('#');
    await rankHeader.click();

    const rankElements = getRankElements(page);

    await verifyResultsOrder(rankElements, '25', '1');

    await rankHeader.click();

    await verifyResultsOrder(rankElements, '1', '25');
  });

  test('should reset on page navigation', async ({ page }) => {
    const rankElements = getRankElements(page);
    const rankHeader = page.getByText('#');

    // reverse sort
    await rankHeader.click();
    await verifyResultsOrder(rankElements, '25', '1');

    // next page
    await page.getByRole('link', { name: 'Go to next page' }).click();
    await page.waitForURL('/?page=2');
    await verifyResultsOrder(rankElements, '26', '50');

    // reverse sort on next page
    await rankHeader.click();
    await verifyResultsOrder(rankElements, '50', '26');

    // page 3
    await page
      .getByRole('navigation', { name: 'pagination' })
      .getByRole('link', { name: /^3$/ })
      .click();
    await page.waitForURL('/?page=3');
    await verifyResultsOrder(rankElements, '51', '75');

    // reverse sort on page 3
    await rankHeader.click();
    await verifyResultsOrder(rankElements, '75', '51');

    // previous page
    await page.getByRole('link', { name: 'Go to previous page' }).click();
    await page.waitForURL('/?page=2');
    await verifyResultsOrder(rankElements, '26', '50');
  });
});

test('should not have any automatically detectable WCAG A or AA violations', async ({
  page,
}) => {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});

async function changeRowsPerPage(
  page: Page,
  option: (typeof PER_PAGE_OPTIONS)[number]
) {
  const selectedOption = option.toString();
  const rowsPerPageSelect = page.getByRole('combobox', { name: 'Rows' });
  await rowsPerPageSelect.click();
  await page.getByRole('option', { name: selectedOption, exact: true }).click();
}

const getRankElements = (page: Page) => page.getByTestId(/rank$/);

async function verifyResultsOrder(
  rankElements: Locator,
  firstResult: string,
  lastResult: string
) {
  expect(await rankElements.first().textContent()).toBe(firstResult);
  expect(await rankElements.last().textContent()).toBe(lastResult);
}

async function verifyResultsRange(
  page: Page,
  firstResult: string,
  lastResult: string
) {
  await expect(
    page.getByText(`Showing ${firstResult} to ${lastResult}`)
  ).toBeVisible();
}

interface ExpectedResults {
  perPage: number;
  firstResult: string;
  lastResult: string;
}

async function verifyExpectedResults(
  page: Page,
  { firstResult, lastResult, perPage }: ExpectedResults
) {
  const rankElements = getRankElements(page);
  await verifyResultsOrder(rankElements, firstResult, lastResult);
  expect(rankElements).toHaveCount(perPage);
  await verifyResultsRange(page, firstResult, lastResult);
}
