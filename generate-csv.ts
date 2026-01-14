import createCsvWriter from "csv-writer";

export interface GenerateCSVProps<T extends Object> {
  relativePath: string;
  items: T[];
  headers: { key: keyof T; title: string }[];
}
export async function GenerateCSV<T extends Object>({
  headers,
  relativePath: path,
  items,
}: GenerateCSVProps<T>) {
  const csvWriter = createCsvWriter.createObjectCsvWriter({
    path: path,
    header: headers.map((headerItem) => ({
      id: headerItem.key as string,
      title: headerItem.title,
    })),
  });
  await csvWriter.writeRecords(items);
}
