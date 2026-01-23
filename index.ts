import puppeteer from "puppeteer";
import { ListProducts } from "./list-items.ts";
import { LIST_CHANGE_TIMEOUT } from "./environment.ts";
import { GenerateCSV } from "./generate-csv.ts";
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
const claysData = await HandleClay({ browserPage }, { pageLinks: clays });
console.log("Archivo clays.csv creado exitosamente");
await GenerateCSV({
  relativePath: "./clays.csv",
  headers: [
    { key: "url", title: "URL" },
    { key: "name", title: "Titulo" },
    { key: "price", title: "Precio (€)" },
    { key: "color", title: "Color" },
    { key: "temperature", title: "Temperatura (°C)" },
    { key: "description", title: "Descripción" },
  ],
  items: claysData.map((clay) => ({
    ...clay,
    temperature: `${clay.temperature.min}-${clay.temperature.max}`,
  })),
});

const { items: covers } = await ListProducts(
  {
    browserPage,
    timeout: LIST_CHANGE_TIMEOUT,
  },
  { page: "colores" },
);
const coversData = await HandleCover({ browserPage }, { pageLinks: covers });
await GenerateCSV({
  headers: [
    { key: "url", title: "URL" },
    { key: "image", title: "Imagen (URL)" },
    { key: "name", title: "Titulo" },
    { key: "price", title: "Precio (€)" },
    { key: "color", title: "Color" },
    { key: "temperature", title: "Temperatura (°C)" },
    { key: "type", title: "Tipo" },
    { key: "ingredients", title: "Ingredientes" },
    { key: "description", title: "Descripción" },
  ],
  items: coversData.map((cover) => ({
    ...cover,
    temperature: `${cover.temperature.min}-${cover.temperature.max}`,
    ingredients: cover.ingredients
      .map(
        (ingredient): string =>
          `${ingredient.mineral} ${ingredient.percentage}`,
      )
      .join(";"),
  })),
  relativePath: "./covers.csv",
});
console.log("Archivo covers.csv creado exitosamente");

await browser.close();
