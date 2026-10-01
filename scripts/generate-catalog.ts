import { writeFileSync, readdirSync } from "node:fs";
import { catalog } from "../src/domain/catalog";
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const sql =
  "-- Generated from the authored catalog; catalog version 1 is immutable.\ndo $catalog$ begin\nif not exists(select 1 from private.catalog_versions where version=1) then\ninsert into public.quests(id,quest_version,catalog_version,title,instructions,attribute,effort,xp,focus_tags,repeatable) values\n" +
  catalog
    .map(
      (q) =>
        `(${quote(q.id)},${q.version},${q.catalogVersion},${quote(q.title)},${quote(q.instructions)},${quote(q.attribute)},${quote(q.effort)},${q.xp},ARRAY[${q.focusTags.map(quote).join(",")}],${q.repeatable})`,
    )
    .join(",\n") +
  ";\ninsert into private.catalog_versions(version) values(1);\nend if;\nend $catalog$;\n";
writeFileSync("supabase/seed.sql", sql);
const migration = readdirSync("supabase/migrations").find((file) =>
  file.endsWith("_catalog_v1.sql"),
);
if (migration) writeFileSync(`supabase/migrations/${migration}`, sql);
