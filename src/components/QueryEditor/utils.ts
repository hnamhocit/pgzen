import { faker } from "@faker-js/faker";

export function processFakerTemplates(query: string): string {
  return query.replace(
    /\{\{faker\.([a-zA-Z0-9_.]+)(?:\(\))?\}\}/g,
    (match, path) => {
      try {
        const parts = path.split(".");
        let current: any = faker;
        for (const part of parts) {
          if (current[part] === undefined) return match;
          current = current[part];
        }
        if (typeof current === "function") return String(current());
        return String(current);
      } catch (e) {
        return match;
      }
    },
  );
}

export function stripSqlComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
}

export function processQueryLimits(query: string): string {
  const stripped = stripSqlComments(query).toUpperCase();
  if (stripped.startsWith("SELECT") && !stripped.includes("LIMIT")) {
    const cleanQuery = query.trim().replace(/;$/, "");
    return cleanQuery + "\nLIMIT 100";
  }
  return query;
}

export function extractQueryPlanFromResult(res: any[]): any {
  for (const block of res) {
    if (block.type === "command_complete" && block.rows && block.rows.length > 0) {
      const firstRow = block.rows[0];
      if (firstRow["QUERY PLAN"]) {
        const planText = block.rows.map((r: any) => r["QUERY PLAN"]).join("\n");
        try {
          return JSON.parse(planText);
        } catch(e) {
          return null; // Not JSON format
        }
      }
    }
  }
  return null;
}

export function isPureSelect(query: string): boolean {
  const stripped = stripSqlComments(query).toUpperCase();
  return (
    stripped.startsWith("SELECT") ||
    stripped.startsWith("EXPLAIN") ||
    stripped.startsWith("SHOW")
  );
}

export function extractQueryVariables(query: string): string[] {
  const vars = new Set<string>();
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  let match;
  while ((match = regex.exec(query)) !== null) {
    if (match[1] && !match[1].startsWith('faker')) {
      vars.add(match[1]);
    }
  }
  return Array.from(vars);
}

export function replaceQueryVariables(query: string, variables: Record<string, string>): string {
  return query.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    if (varName.startsWith('faker.')) return match;
    return variables[varName] !== undefined ? variables[varName] : match;
  });
}
