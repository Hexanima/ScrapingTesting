import type { Temperature } from "./utils/temperature.ts";
import puppeteer from "puppeteer";

export interface Cover {
  url: string;
  name: string;
  color: string;
  description: string;
  image: string;
  type: "smooth" | "textured" | "cracked" | "semi matte";
  ingredients: { mineral: string; percentage: number }[];
  temperature: Temperature;
  price: number;
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
    const cover = await browserPage.evaluate(
      async ({ url }): Promise<Cover> => {
        function extractTemperature(text: string): {
          min: number;
          max: number;
        } {
          // Patrones para temperaturas con diferentes formatos
          const tempPatterns = [
            // Rangos con "a": 1000ºC a 1300ºC
            /(\d{3,4}\.?\d{0,3})\s*[ºº°]\s*C?\s*a\s*(\d{3,4}\.?\d{0,3})\s*[ºº°]\s*C?/i,
            // Rangos con "y": 1240 y 1280ºC
            /(\d{3,4})\s*y\s*(\d{3,4})\s*[ºº°]\s*C?/i,
            // Rangos con guión con espacio: 1186 °C-1285 °C
            /(\d{3,4})\s*°\s*C\s*[-–]\s*(\d{3,4})\s*°\s*C/i,
            // Rangos con espacio antes del guión: 980ºC -1080ºC
            /(\d{3,4})\s*[ºº°]\s*C\s+[-–]\s*(\d{3,4})\s*[ºº°]\s*C/i,
            // Rangos con guión: 1240°C-1260°C, 1230-1270ºC, 1080º-1100ºC (solo temperaturas altas)
            /(\d{3,4})\s*[ºº°]?\s*C?\s*[-–]\s*(\d{3,4})\s*[ºº°]\s*C?/i,
            // Temperatura mínima: 1.000º al menos (1050 sin problema)
            /(\d{1,3}\.?\d{0,3})\s*[ºº°]\s*al menos\s*\((\d{1,3}\.?\d{0,3})\s*sin problema\)/i,
            // Una sola temperatura: 1080°C (solo temperaturas de 3-4 dígitos)
            /(\d{3,4})\s*[ºº°]\s*C?/i,
          ];

          for (const pattern of tempPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
              // Limpiar puntos de miles
              const temp1 = parseInt(match[1].replace(".", ""));
              const temp2 = match[2]
                ? parseInt(match[2].replace(".", ""))
                : null;

              // Validar que son temperaturas válidas (al menos 900°C)
              if (temp1 < 900) continue;
              if (temp2 && temp2 < 900) continue;

              if (temp2) {
                // Rango de temperaturas
                return {
                  min: Math.min(temp1, temp2),
                  max: Math.max(temp1, temp2),
                };
              } else {
                // Una sola temperatura
                return {
                  min: temp1,
                  max: temp1,
                };
              }
            }
          }

          return { min: 0, max: 0 };
        }

        function extractColor(text: string): string {
          if (!text) return "";

          text = text.toLowerCase();

          // Color patterns in Spanish and English
          const colorPatterns = [
            // Spanish colors
            { pattern: /azul/i, color: "azul" },
            { pattern: /blue/i, color: "azul" },
            { pattern: /rojo|roja/i, color: "rojo" },
            { pattern: /red/i, color: "rojo" },
            { pattern: /verde/i, color: "verde" },
            { pattern: /green/i, color: "verde" },
            { pattern: /amarillo|amarilla/i, color: "amarillo" },
            { pattern: /yellow/i, color: "amarillo" },
            { pattern: /blanco|blanca/i, color: "blanco" },
            { pattern: /white/i, color: "blanco" },
            { pattern: /negro|negra/i, color: "negro" },
            { pattern: /black/i, color: "negro" },
            { pattern: /gris/i, color: "gris" },
            { pattern: /gray|grey/i, color: "gris" },
            { pattern: /naranja/i, color: "naranja" },
            { pattern: /orange/i, color: "naranja" },
            { pattern: /rosa/i, color: "rosa" },
            { pattern: /pink/i, color: "rosa" },
            { pattern: /violeta|morado/i, color: "morado" },
            { pattern: /purple|violet/i, color: "morado" },
            { pattern: /marrón|café/i, color: "marrón" },
            { pattern: /brown/i, color: "marrón" },

            // Specific color names from the products
            { pattern: /tide/i, color: "azul" },
            { pattern: /navy/i, color: "azul marino" },
            { pattern: /ocean/i, color: "azul océano" },
            { pattern: /amber/i, color: "ámbar" },
            { pattern: /emerald/i, color: "esmeralda" },
            { pattern: /frost/i, color: "blanco escarcha" },
            { pattern: /cobalt/i, color: "azul cobalto" },
            { pattern: /teal/i, color: "turquesa" },
            { pattern: /forest/i, color: "verde bosque" },
            { pattern: /burst/i, color: "azul explosión" },
          ];

          for (const { pattern, color } of colorPatterns) {
            if (pattern.test(text)) {
              return color;
            }
          }

          return "";
        }

        function extractCoverType(text: string, name: string): string {
          if (!text && !name) return "";

          const fullText = `${text} ${name}`.toLowerCase();

          // Type patterns based on product categories and descriptions
          const typePatterns = [
            { pattern: /cristaliz|crystalline/i, type: "cristalizado" },
            {
              pattern: /esmalte.*alta.*temperatura|alta.*esmalte/i,
              type: "alta temperatura",
            },
            {
              pattern: /esmalte.*baja.*temperatura|baja.*esmalte/i,
              type: "baja temperatura",
            },
            { pattern: /suspensión/i, type: "suspensión" },
            { pattern: /polvo/i, type: "polvo" },
            { pattern: /engobe/i, type: "engobe" },
            { pattern: /óxido/i, type: "óxido" },
            { pattern: /lustre/i, type: "lustre" },
            { pattern: /efecto/i, type: "efectos" },
          ];

          for (const { pattern, type } of typePatterns) {
            if (pattern.test(fullText)) {
              return type;
            }
          }

          return "";
        }

        function extractIngredients(
          text: string,
        ): { mineral: string; percentage: number }[] {
          if (!text) return [];

          text = text.toLowerCase();

          // Look for ingredient information
          const ingredients: { mineral: string; percentage: number }[] = [];

          if (text.includes("zinc")) {
            ingredients.push({ mineral: "zinc", percentage: 0 });
          }
          if (text.includes("titanio")) {
            ingredients.push({ mineral: "titanio", percentage: 0 });
          }
          if (text.includes("hierro")) {
            ingredients.push({ mineral: "hierro", percentage: 0 });
          }
          if (text.includes("cobre")) {
            ingredients.push({ mineral: "cobre", percentage: 0 });
          }
          if (text.includes("cobalto")) {
            ingredients.push({ mineral: "cobalto", percentage: 0 });
          }
          if (text.includes("cromo")) {
            ingredients.push({ mineral: "cromo", percentage: 0 });
          }
          if (text.includes("níquel")) {
            ingredients.push({ mineral: "níquel", percentage: 0 });
          }

          return ingredients;
        }

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

        // Extract breadcrumb/category information
        const breadcrumb =
          document
            .querySelector(".woocommerce-breadcrumb")
            ?.textContent?.trim() || "";

        // Get product description content
        const productContent =
          document
            .querySelector(".elementor-widget-woocommerce-product-content")
            ?.textContent?.trim() || "";

        // Get meta description which often contains key product info
        const metaDescription =
          document.querySelector<HTMLMetaElement>('meta[name="description"]')
            ?.content || "";

        let temperature = { min: 0, max: 0 };

        // 1. Buscar temperatura en la descripción primero
        if (description) {
          temperature = extractTemperature(description);
        }

        // 2. Si no se encontró en la descripción, buscar en el nombre
        if (temperature.min === 0) {
          temperature = extractTemperature(name);
        }

        // 3. Como último recurso, buscar en todo el texto de la página
        if (temperature.min === 0) {
          const allText = document.body.innerText;
          temperature = extractTemperature(allText);
        }

        // Extract additional information
        const fullText = `${name} ${description} ${productContent} ${metaDescription}`;
        const color = extractColor(fullText);
        const coverType = extractCoverType(productContent, name);
        const ingredients = extractIngredients(productContent);

        // Determine texture type based on description and category
        let textureType: "smooth" | "textured" | "cracked" | "semi matte" =
          "smooth";

        if (
          coverType.includes("cristalizado") ||
          fullText.includes("cristal")
        ) {
          textureType = "cracked";
        } else if (fullText.includes("mate") || fullText.includes("matte")) {
          textureType = "semi matte";
        } else if (
          fullText.includes("textura") ||
          fullText.includes("rugoso")
        ) {
          textureType = "textured";
        }

        // DATOS DE LA COVER DESDE ACA
        return {
          url,
          name,
          image,
          description,
          color: color || "Sin especificar",
          temperature,
          ingredients,
          type: textureType,
          price,
        };
        // FIN DE DATOS DE LA COVER
      },
      { url: pageLink },
    );
    result.push(cover);
  }
  return result;
}
