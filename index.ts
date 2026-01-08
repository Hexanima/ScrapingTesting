import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: false,
  slowMo: 200,
  timeout: 0,
  protocolTimeout: 0,
});
const browserPage = await browser.newPage();

await browserPage.goto("https://www.marphil.com/tienda/arcillas/", {
  timeout: 0,
});

const links = await browserPage.evaluate(async () => {
  const pageItems = await document.querySelectorAll(
    ".jet-filters-pagination__item"
  );
  const pages = [];

  for (const pageItem of pageItems) {
    const val = (pageItem as any).dataset.value;
    if (Number.isInteger(Number.parseInt(val))) pages.push(val);
  }
  console.log(pages);

  const itemsRes: string[] = [];
  for (const pageCount of pages) {
    await (
      document.querySelector(
        `.jet-filters-pagination__item[data-value="${pageCount}"]`
      ) as any
    ).click();

    // TIMEOUT REQUERIDO PORQUE NO ES CAMBIO DE PAGINA, TODO SE ACTUALIZA EN SCRIPT
    await new Promise((resolve) =>
      setTimeout(() => {
        console.log("TIMEOUT: ", pageCount);
        resolve(void 0);
      }, 60_000)
    );

    let items = await document.querySelectorAll(
      "div.jet-listing-grid__item h6 a"
    );
    for (const item of items) {
      itemsRes.push((item as HTMLAnchorElement).href ?? "NO LINK");
    }
  }

  return {
    length: itemsRes.length,
    items: itemsRes,
  };
});

console.log(browserPage);
console.log(links);
