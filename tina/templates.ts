import type { TinaField } from "tinacms";
export function news_postFields() {
  return [
    {
      type: "string",
      name: "title",
      label: "title",
      isTitle: true,
      required: true,
    },
    {
      type: "rich-text",
      name: "body",
      label: "Body of Document",
      description: "This is the markdown body",
      isBody: true,
    },
    {
      type: "datetime",
      name: "date",
      label: "date",
      description: "When thu"
    },
    {
      type: "boolean",
      name: "draft",
      label: "draft",
      required: true,
      description: "If this page should be published or not"
    }
  ] as TinaField[];
}
