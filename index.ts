import puppeteer from "puppeteer";
import { ListProducts } from "./list-items.ts";
import { LIST_CHANGE_TIMEOUT } from "./environment.ts";
import { GenerateCSV } from "./generate-csv.ts";

const browser = await puppeteer.launch({
  headless: false,
  slowMo: 200,
  timeout: 0,
  protocolTimeout: 0,
});
const browserPage = await browser.newPage();

const { items: covers } = await ListProducts(
  {
    browserPage,
    timeout: LIST_CHANGE_TIMEOUT,
  },
  { page: "colores" }
);

const { items: clays } = await ListProducts(
  {
    browserPage,
    timeout: LIST_CHANGE_TIMEOUT,
  },
  { page: "arcillas" }
);
const coversData = covers.map((url) => ({ url }));
await GenerateCSV({
  headers: [{ key: "url", title: "URL" }],
  items: coversData,
  relativePath: "./covers.csv",
});
console.log("Archivo covers.csv creado exitosamente");

const claysData = clays.map((url) => ({ url }));
console.log("Archivo clays.csv creado exitosamente");
await GenerateCSV({
  relativePath: "./clays.csv",
  headers: [{ key: "url", title: "URL" }],
  items: claysData,
});

await browser.close();
