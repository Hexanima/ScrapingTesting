import puppeteer from "puppeteer";
import { ListProducts } from "./list-items.ts";
import { LIST_CHANGE_TIMEOUT } from "./environment.ts";
import { HandleClay } from "./handle-clay.ts";
import { HandleCover } from "./handle-cover.ts";

const browser = await puppeteer.launch({
  headless: false,
  slowMo: 200,
  timeout: 0,
  protocolTimeout: 0,
});
const browserPage = await browser.newPage();

const { items: clays } = await ListProducts(
  {
    browserPage,
    timeout: LIST_CHANGE_TIMEOUT,
  },
  { page: "arcillas" },
);
await HandleClay({ browserPage }, { pageLinks: clays });

const { items: covers } = await ListProducts(
  {
    browserPage,
    timeout: LIST_CHANGE_TIMEOUT,
  },
  { page: "colores" },
);
await HandleCover({ browserPage }, { pageLinks: covers });

await browser.close();
