import type { TinaField } from "tinacms";
export function news_postFields() {
  return [
    {
      type: "string",
      name: "title",
      label: "title",
    },
    {
      type: "datetime",
      name: "date",
      label: "date",
    },
    {
      type: "datetime",
      name: "publishdate",
      label: "publishdate",
    },
  ] as TinaField[];
}
