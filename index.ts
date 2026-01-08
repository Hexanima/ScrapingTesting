import puppeteer from "puppeteer";

const TIMEOUT = 60_000

const browser = await puppeteer.launch({
  headless: false,
  slowMo: 200,
  timeout: 0,
  protocolTimeout: 0,
});
const browserPage = await browser.newPage();

// Lista de arcillas
await browserPage.goto("https://www.marphil.com/tienda/arcillas/", {
  timeout: 0,
});

// Links hacia los detalles, con esto podemos ir a cada detalle y obtener los datos requeridos
const productsLinks = await browserPage.evaluate(async () => {
  const pageItems = await document.querySelectorAll(
    ".jet-filters-pagination__item" // Paginacion
  );
  const pages = [];

  for (const pageItem of pageItems) {
    // Extraer el "data-value" del elemento
    const val = (pageItem as any).dataset.value;

    // Identificar cantidad de paginas, omitir botones "siguiente" y "anterior"
    if (Number.isInteger(Number.parseInt(val))) pages.push(val);
  }
  console.log(pages);

  const itemsRes: string[] = [];
  for (const pageCount of pages) {
    // Los elementos de paginado anteriores YA NO EXISTEN, asi que buscar nuevo boton de siguiente pag en cada iteracion
    await (
      document.querySelector(
        `.jet-filters-pagination__item[data-value="${pageCount}"]`
      ) as any
    ).click();

    // TIMEOUT REQUERIDO PORQUE NO ES CAMBIO DE PAGINA, TODO SE ACTUALIZA EN SCRIPT, mi internet lento :/
    await new Promise((resolve) =>
      setTimeout(() => {
        console.log("TIMEOUT: ", pageCount);
        resolve(void 0);
      }, TIMEOUT)
    );

    // Buscar todos los items del listado, y obtener sus enlaces al detalle
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
console.log(productsLinks);

for (const productLink of productsLinks.items) {
  await browserPage.goto(productLink);
}
