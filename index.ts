import puppeteer from "puppeteer";
import { ListProducts } from "./list-items.ts";
import { LIST_CHANGE_TIMEOUT } from "./environment.ts";

const browser = await puppeteer.launch({
  headless: false,
  slowMo: 200,
  timeout: 0,
  protocolTimeout: 0,
});
const browserPage = await browser.newPage();

const productsLinks = await ListProducts(
  {
    browserPage,
    timeout: LIST_CHANGE_TIMEOUT,
  },
  { page: "colores" }
);

console.log(browserPage);
console.log(productsLinks);

for (const productLink of productsLinks.items) {
  await browserPage.goto(productLink);
}
