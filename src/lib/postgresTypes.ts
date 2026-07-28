export const POSTGRES_DATA_TYPES = [
  "smallint", "integer", "bigint", "decimal", "numeric", "real", "double precision", "smallserial", "serial", "bigserial",
  "money",
  "character varying", "varchar", "character", "char", "text",
  "bytea",
  "timestamp", "timestamp without time zone", "timestamp with time zone", "timestamptz", "date", "time", "time without time zone", "time with time zone", "timetz", "interval",
  "boolean", "bool",
  "enum",
  "point", "line", "lseg", "box", "path", "polygon", "circle",
  "cidr", "inet", "macaddr", "macaddr8",
  "bit", "bit varying", "varbit",
  "tsvector", "tsquery",
  "uuid",
  "xml",
  "json", "jsonb",
  "array",
  "int4range", "int8range", "numrange", "tsrange", "tstzrange", "daterange",
  "pg_lsn",
  "txid_snapshot"
] as const;

export type PostgresDataType = typeof POSTGRES_DATA_TYPES[number];

/**
 * Normalizes a raw PostgreSQL data type string into a clean base type.
 * For example:
 * "character varying(255)" -> "varchar"
 * "timestamp without time zone" -> "timestamp"
 * "integer[]" -> "array"
 */
export function normalizePostgresType(rawType: string): string {
  if (!rawType) return "";
  let t = rawType.toLowerCase();

  // Handle arrays
  if (t.endsWith("[]") || t === "array") return "array";

  // Remove size modifiers like (255) or (10, 2)
  t = t.replace(/\([^)]*\)/g, "").trim();

  // Normalize aliases
  switch (t) {
    case "character varying":
      return "varchar";
    case "character":
      return "char";
    case "timestamp without time zone":
      return "timestamp";
    case "timestamp with time zone":
      return "timestamptz";
    case "time without time zone":
      return "time";
    case "time with time zone":
      return "timetz";
    case "boolean":
      return "bool";
    case "integer":
      return "int";
    case "int4":
      return "int";
    case "int8":
      return "bigint";
    case "int2":
      return "smallint";
    case "float4":
      return "real";
    case "float8":
      return "double precision";
    case "decimal":
      return "numeric";
    default:
      return t;
  }
}

/**
 * Categorizes a normalized PostgreSQL data type into a broader family.
 * Useful for mapping icons, code generation, or default colors.
 */
export function getPostgresTypeFamily(normalizedType: string): "numeric" | "string" | "boolean" | "date" | "json" | "uuid" | "binary" | "other" {
  const t = normalizedType;
  
  if (["smallint", "integer", "int", "bigint", "decimal", "numeric", "real", "double precision", "smallserial", "serial", "bigserial", "money"].includes(t)) {
    return "numeric";
  }
  if (["varchar", "char", "text"].includes(t)) {
    return "string";
  }
  if (t === "bool") {
    return "boolean";
  }
  if (["date", "time", "timetz", "timestamp", "timestamptz", "interval"].includes(t)) {
    return "date";
  }
  if (["json", "jsonb", "array"].includes(t)) {
    return "json";
  }
  if (t === "uuid") {
    return "uuid";
  }
  if (["bytea", "bit", "varbit"].includes(t)) {
    return "binary";
  }
  
  return "other";
}
