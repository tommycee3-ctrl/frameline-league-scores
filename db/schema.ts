import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const siteContent = sqliteTable("site_content", {
  contentKey: text("content_key").primaryKey(),
  contentJson: text("content_json").notNull(),
  updatedAt: text("updated_at").notNull(),
  updatedBy: text("updated_by").notNull(),
});
