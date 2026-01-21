import type { Temperature } from "./utils/temperature.ts";
import puppeteer from "puppeteer";

export interface Clay {
  url: string;
  name: string;
  description: string;
  color: string;
  temperature: Temperature;
  price: number;
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
    const clay = await browserPage.evaluate(
      async ({ url }): Promise<Clay> => {
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
          const colorPatterns = [
            /\b(verde|esmeralda|maquillaje|rojo|azul|blanco|negro|gris|amarillo|naranja|rosa|violeta|marrón|beige|crema)\b/i,
            /\b(refractaria|chamota)\b/i,
          ];

          for (const pattern of colorPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
              return match[1];
            }
          }

          return "Natural";
        }

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

        let color = extractColor(name);
        if (color === "Natural" && description) {
          color = extractColor(description);
        }

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

        // DATOS DE LA CLAY DESDE ACA
        return {
          name,
          color,
          description,
          temperature,
          url,
          price,
        };
        // FIN DE DATOS DE LA CLAY
      },
      { url: pageLink },
    );
    result.push(clay);
  }
  return result;
}
