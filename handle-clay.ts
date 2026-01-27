import puppeteer from "puppeteer";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "./environment.ts";
import fs from "fs/promises";
import path from "path";

interface Temperature {
  min_temperature: number;
  max_temperature: number;
  label: string;
}

export interface Clay {
  name: string;
  description: string;
  color: string;
  temperature: Temperature | null;
  isPublic: true;
}

type FILTERS = "name" | "description";
type AIData = Omit<Clay, FILTERS>;
type ScrapData = Pick<Clay, FILTERS>;

const temperatureCones = [
  {
    label: "Cono 22",
    value: { min_temperature: 600, max_temperature: 630 },
  },
  {
    label: "Cono 21",
    value: { min_temperature: 625, max_temperature: 650 },
  },
  {
    label: "Cono 20",
    value: { min_temperature: 635, max_temperature: 670 },
  },
  {
    label: "Cono 19",
    value: { min_temperature: 680, max_temperature: 710 },
  },
  {
    label: "Cono 18",
    value: { min_temperature: 750, max_temperature: 780 },
  },
  {
    label: "Cono 17",
    value: { min_temperature: 800, max_temperature: 830 },
  },
  {
    label: "Cono 16",
    value: { min_temperature: 830, max_temperature: 860 },
  },
  {
    label: "Cono 15",
    value: { min_temperature: 850, max_temperature: 870 },
  },
  {
    label: "Cono 14",
    value: { min_temperature: 860, max_temperature: 880 },
  },
  {
    label: "Cono 13",
    value: { min_temperature: 880, max_temperature: 900 },
  },
  {
    label: "Cono 12",
    value: { min_temperature: 900, max_temperature: 920 },
  },
  {
    label: "Cono 11",
    value: { min_temperature: 920, max_temperature: 940 },
  },
  {
    label: "Cono 10",
    value: { min_temperature: 950, max_temperature: 970 },
  },
  {
    label: "Cono 9",
    value: { min_temperature: 980, max_temperature: 1000 },
  },
  {
    label: "Cono 8",
    value: { min_temperature: 1020, max_temperature: 1040 },
  },
  {
    label: "Cono 7",
    value: { min_temperature: 1060, max_temperature: 1080 },
  },
  {
    label: "Cono 6",
    value: { min_temperature: 1100, max_temperature: 1120 },
  },
  {
    label: "Cono 5",
    value: { min_temperature: 1135, max_temperature: 1160 },
  },
  {
    label: "Cono 4",
    value: { min_temperature: 1180, max_temperature: 1200 },
  },
  {
    label: "Cono 3",
    value: { min_temperature: 1220, max_temperature: 1240 },
  },
  {
    label: "Cono 2",
    value: { min_temperature: 1230, max_temperature: 1250 },
  },
  {
    label: "Cono 1",
    value: { min_temperature: 1240, max_temperature: 1260 },
  },
];
// Función para encontrar el cono de temperatura adecuado
function findTemperatureCone(temperatureRange: string): Temperature | null {
  if (!temperatureRange || temperatureRange === "0-0") {
    return null; // Para esmaltes que no necesitan cocción
  }

  const [minTemp, maxTemp]: [number, number] = temperatureRange
    .split("-")
    .map((temp) => parseInt(temp.trim())) as [number, number];

  // Buscar el cono que mejor coincida con el rango de temperatura
  for (const cone of temperatureCones) {
    const coneMin = cone.value.min_temperature;
    const coneMax = cone.value.max_temperature;

    // Si el rango está dentro del cono o se superpone significativamente
    if (
      (minTemp >= coneMin && minTemp <= coneMax) ||
      (maxTemp >= coneMin && maxTemp <= coneMax) ||
      (minTemp <= coneMin && maxTemp >= coneMax)
    ) {
      return {
        min_temperature: coneMin,
        max_temperature: coneMax,
        label: cone.label,  
      };
    }
  }

  // Si no encuentra un cono exacto, crear uno personalizado
  return {
    min_temperature: minTemp,
    max_temperature: maxTemp,
    label: `Rango ${minTemp}-${maxTemp}°C`,
  };
}

const openAIClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const AI_INSTRUCTIONS = `
Eres un experto en cerámica, esmaltes y arcillas. Tu tarea es analizar información de productos de esmaltes cerámicos y extraer datos específicos de manera estructurada.

Analiza el nombre y descripción del producto proporcionado y extrae la siguiente información:

1. **color**: Color principal del esmalte (ej: "azul", "rojo", "blanco", "transparente", etc.)
2. **temperature**: Objeto con min y max de temperatura en Celsius (ej: {min: 1000, max: 1200})

IMPORTANTE: 
- Si no encuentras información específica, usa valores lógicos
- Las temperaturas deben ser números válidos en Celsius (típicamente entre 900-1300°C)
- Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional
- No incluyas explicaciones ni comentarios fuera del JSON
- NO podes poner "default" ni dejar sin especificar en NINGÚN campo, si necesitas información, usa valores lógicos

Formato de respuesta requerido:
{
  "color": "string",
  "temperature": {"min": number, "max": number},
}
`;

async function ExtractDataWithOpenAI(
  { aiClient }: { aiClient: OpenAI },
  {
    name,
    description,
  }: {
    name: string;
    description: string;
  },
): Promise<AIData> {
  try {
    const prompt = `
Nombre del producto: "${name.trim()}"
Descripción: "${description.trim()}"
`;

    const completion = await aiClient.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: AI_INSTRUCTIONS,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent results
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    const extractedData = JSON.parse(responseContent);

    // Validate and return the structured data
    return {
      color: extractedData.color || "Sin especificar",
      temperature: findTemperatureCone(
        `${extractedData.temperature?.min || 1000}-${extractedData.temperature?.max || 1200}`,
      ),
      isPublic: true,
    };
  } catch (error) {
    console.error("Error extracting data with OpenAI:", error);
    throw error;
  }
}

export interface HandleClayDependencies {
  browserPage: puppeteer.Page;
}

export interface HandleClayPayload {
  pageLinks: string[];
}

export async function HandleClay(
  { browserPage }: HandleClayDependencies,
  { pageLinks }: HandleClayPayload,
): Promise<Clay[]> {
  const result: Clay[] = [];
  for (const pageLink of pageLinks) {
    await browserPage.goto(pageLink, { timeout: 0 });
    const scrap = await browserPage.evaluate(async (): Promise<ScrapData> => {
      const name: string =
        document.querySelector<HTMLHeadingElement>("h1.product_title")
          ?.innerText ?? "Falta name";

      const description: string = document
        .querySelectorAll<HTMLParagraphElement>(".elementor-element-2ae240b1 p")
        .values()
        .reduce((prev: string[], p) => {
          return [...prev, p.innerText];
        }, [])
        .join("\n");

      // DATOS DE LA CLAY DESDE ACA
      return {
        name,
        description,
      };
      // FIN DE DATOS DE LA CLAY
    });
    if (await RegistryExists(scrap.name)) continue;

    const ai = await ExtractDataWithOpenAI(
      { aiClient: openAIClient },
      { name: scrap.name, description: scrap.description },
    );

    const clay: Clay = { ...scrap, ...ai };
    result.push(clay);
    await AddToFile(clay);

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return result;
}

const jsonLocation = path.join("./clays.json");

async function ReadFile(): Promise<Clay[]> {
  const file: string = await fs.readFile(jsonLocation, "utf-8");
  const clays: Clay[] = JSON.parse(file);
  return clays;
}

async function AddToFile(cover: Clay) {
  const clays = await ReadFile();
  clays.push(cover);
  await fs.writeFile(jsonLocation, JSON.stringify(clays), "utf-8");
}

async function RegistryExists(name: string): Promise<boolean> {
  const clays = await ReadFile();

  if (clays.some((cover) => cover.name === name)) return true;
  return false;
}
