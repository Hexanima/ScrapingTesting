import puppeteer from "puppeteer";
import OpenAI from "openai";
import { OPENAI_API_KEY } from "./environment.ts";

type CoverType = "glossy" | "matte" | "satin" | "translucent";
type CoverTexture = "smooth" | "textured" | "cracked" | "semi matte";
type CoverCompatibility = "stoneware" | "red mud" | "porcelain";
type CoverFinish = "fired" | "unfired";
interface CoverIngredient {
  mineral: string;
  percentage: number;
}

interface Temperature {
  min: number;
  max: number;
}

export interface Cover {
  url: string;
  name: string;
  color: string;
  description: string;
  image: string;
  type: CoverType;
  texture: CoverTexture;
  ingredients: CoverIngredient[];
  temperature: Temperature;
  price: number;
  compatibility: CoverCompatibility;
  expected_finish: string;
  finish: CoverFinish;
}

console.log(OPENAI_API_KEY);

const openAIClient = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const AI_INSTRUCTIONS = `
Eres un experto en cerámica y esmaltes. Tu tarea es analizar información de productos de esmaltes cerámicos y extraer datos específicos de manera estructurada.

Analiza el nombre y descripción del producto proporcionado y extrae la siguiente información:

1. **color**: Color principal del esmalte (ej: "azul", "rojo", "blanco", "transparente", etc.)
2. **compatibility**: Compatibilidad con materiales ("stoneware", "red mud", o "porcelain")
3. **expected_finish**: Descripción del acabado esperado (ej: "brillante", "mate", "satinado", "cristalizado")
4. **finish**: Estado del esmalte ("fired" para cocido o "unfired" para sin cocer)
5. **ingredients**: Array de ingredientes con mineral y porcentaje (si se especifica, sino porcentaje 0)
6. **temperature**: Objeto con min y max de temperatura en Celsius (ej: {min: 1000, max: 1200})
7. **texture**: Textura ("smooth", "textured", "cracked", "semi matte")
8. **type**: Tipo de esmalte ("glossy", "matte", "satin", "translucent")

IMPORTANTE: 
- Si no encuentras información específica, usa valores por defecto lógicos
- Las temperaturas deben ser números válidos en Celsius (típicamente entre 900-1300°C)
- Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional
- No incluyas explicaciones ni comentarios fuera del JSON

Formato de respuesta requerido:
{
  "color": "string",
  "compatibility": "stoneware" | "red mud" | "porcelain",
  "expected_finish": "string",
  "finish": "fired" | "unfired",
  "ingredients": [{"mineral": "string", "percentage": number}],
  "temperature": {"min": number, "max": number},
  "texture": "smooth" | "textured" | "cracked" | "semi matte",
  "type": "glossy" | "matte" | "satin" | "translucent"
}
`;

type FILTERS = "name" | "description" | "price" | "image" | "url";
type AIData = Omit<Cover, FILTERS>;
type ScrapData = Pick<Cover, FILTERS>;

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
      compatibility: extractedData.compatibility || "porcelain",
      expected_finish: extractedData.expected_finish || "Sin especificar",
      finish: extractedData.finish || "fired",
      ingredients: extractedData.ingredients || [],
      temperature: {
        min: extractedData.temperature?.min || 1000,
        max: extractedData.temperature?.max || 1200,
      },
      texture: extractedData.texture || "smooth",
      type: extractedData.type || "glossy",
    };
  } catch (error) {
    console.error("Error extracting data with OpenAI:", error);

    // Return fallback values in case of error
    return {
      color: "Sin especificar",
      compatibility: "porcelain",
      expected_finish: "Sin especificar",
      finish: "fired",
      ingredients: [],
      temperature: { min: 1000, max: 1200 },
      texture: "smooth",
      type: "glossy",
    };
  }
}

export interface HandleCoverDependencies {
  browserPage: puppeteer.Page;
}

export interface HandleCoverPayload {
  pageLinks: string[];
}

export async function HandleCover(
  { browserPage }: HandleCoverDependencies,
  { pageLinks }: HandleCoverPayload,
): Promise<Cover[]> {
  const result: Cover[] = [];
  for (const pageLink of pageLinks) {
    await browserPage.goto(pageLink, { timeout: 0 });
    const scrap: ScrapData = await browserPage.evaluate(
      async ({ url }): Promise<ScrapData> => {
        const image: string =
          document.querySelector<HTMLImageElement>(
            ".elementor-widget-image.elementor-element-5152d3e img.attachment-full.size-full",
          )?.src ?? "";

        const name: string =
          document.querySelector<HTMLHeadingElement>("h1.product_title")
            ?.innerText ?? "Falta name";

        const description: string = document
          .querySelectorAll<HTMLParagraphElement>(
            ".elementor-element-2ae240b1 p",
          )
          .values()
          .reduce((prev: string[], p) => {
            return [...prev, p.innerText];
          }, [])
          .join("\n");

        const price: number = Number.parseFloat(
          document
            .querySelector<HTMLSpanElement>(
              ".elementor-element.elementor-element-dd05e86.elementor-widget.elementor-widget-jet-woo-builder-archive-product-price .woocommerce-Price-amount.amount",
            )
            ?.innerText.replace(",", ".")
            .replace("€", "") ?? "0",
        );

        // DATOS DE LA COVER DESDE ACA
        return {
          url,
          name,
          image,
          description,
          price,
        } satisfies ScrapData;
        // FIN DE DATOS DE LA COVER
      },
      { url: pageLink },
    );

    const ai = await ExtractDataWithOpenAI(
      { aiClient: openAIClient },
      { name: scrap.name, description: scrap.description },
    );

    const cover: Cover = { ...scrap, ...ai };
    result.push(cover);
  }
  return result;
}
