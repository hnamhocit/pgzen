export type Language = "rust" | "typescript" | "ruby" | "csharp" | "dart" | "python" | "java";

interface ColumnInfo {
  name: string;
  data_type: string;
}

function getTsType(sqlType: string): string {
  if (!sqlType) return "any";
  const t = sqlType.toLowerCase();
  if (t.includes("int") || t.includes("numeric") || t.includes("real") || t.includes("float") || t.includes("decimal")) return "number";
  if (t.includes("bool")) return "boolean";
  if (t.includes("json")) return "any";
  if (t.includes("date") || t.includes("time") || t.includes("interval")) return "Date | string";
  return "string";
}

function getRustType(sqlType: string): string {
  if (!sqlType) return "String";
  const t = sqlType.toLowerCase();
  if (t.includes("smallint")) return "i16";
  if (t.includes("integer") || t.includes("int4")) return "i32";
  if (t.includes("bigint") || t.includes("int8")) return "i64";
  if (t.includes("real") || t.includes("float4")) return "f32";
  if (t.includes("double precision") || t.includes("float8") || t.includes("numeric") || t.includes("decimal")) return "f64";
  if (t.includes("bool")) return "bool";
  if (t.includes("json")) return "serde_json::Value";
  if (t.includes("uuid")) return "uuid::Uuid";
  if (t.includes("date") || t.includes("timestamp")) return "chrono::NaiveDateTime";
  return "String";
}

function getRubyType(sqlType: string): string {
  if (!sqlType) return "String";
  const t = sqlType.toLowerCase();
  if (t.includes("int")) return "Integer";
  if (t.includes("numeric") || t.includes("real") || t.includes("float") || t.includes("decimal")) return "Float";
  if (t.includes("bool")) return "Boolean";
  if (t.includes("json")) return "Hash";
  if (t.includes("date") || t.includes("time") || t.includes("timestamp")) return "Time";
  return "String";
}

function getCSharpType(sqlType: string): string {
  if (!sqlType) return "string";
  const t = sqlType.toLowerCase();
  if (t.includes("smallint")) return "short";
  if (t.includes("integer") || t.includes("int4")) return "int";
  if (t.includes("bigint") || t.includes("int8")) return "long";
  if (t.includes("real") || t.includes("float4")) return "float";
  if (t.includes("double precision") || t.includes("float8") || t.includes("numeric") || t.includes("decimal")) return "double";
  if (t.includes("bool")) return "bool";
  if (t.includes("date") || t.includes("time") || t.includes("timestamp")) return "DateTime";
  if (t.includes("uuid")) return "Guid";
  return "string";
}

function getDartType(sqlType: string): string {
  if (!sqlType) return "String";
  const t = sqlType.toLowerCase();
  if (t.includes("int")) return "int";
  if (t.includes("numeric") || t.includes("real") || t.includes("float") || t.includes("decimal")) return "double";
  if (t.includes("bool")) return "bool";
  if (t.includes("date") || t.includes("time") || t.includes("timestamp")) return "DateTime";
  if (t.includes("json")) return "Map<String, dynamic>";
  return "String";
}

function getPythonType(sqlType: string): string {
  if (!sqlType) return "str";
  const t = sqlType.toLowerCase();
  if (t.includes("int")) return "int";
  if (t.includes("numeric") || t.includes("real") || t.includes("float") || t.includes("decimal")) return "float";
  if (t.includes("bool")) return "bool";
  if (t.includes("date") || t.includes("time") || t.includes("timestamp")) return "datetime.datetime";
  if (t.includes("json")) return "dict";
  return "str";
}

function getJavaType(sqlType: string): string {
  if (!sqlType) return "String";
  const t = sqlType.toLowerCase();
  if (t.includes("smallint")) return "Short";
  if (t.includes("integer") || t.includes("int4")) return "Integer";
  if (t.includes("bigint") || t.includes("int8")) return "Long";
  if (t.includes("real") || t.includes("float4")) return "Float";
  if (t.includes("double precision") || t.includes("float8") || t.includes("numeric") || t.includes("decimal")) return "Double";
  if (t.includes("bool")) return "Boolean";
  if (t.includes("date") || t.includes("time") || t.includes("timestamp")) return "java.time.LocalDateTime";
  if (t.includes("uuid")) return "java.util.UUID";
  return "String";
}

function snakeToPascal(str: string): string {
  return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

export function generateCode(lang: Language, tableName: string, columns: ColumnInfo[], data: any[]): string {
  const className = snakeToPascal(tableName || "UnknownTable");

  switch (lang) {
    case "typescript": {
      let code = `export interface ${className} {\n`;
      for (const col of columns) {
        code += `  ${col.name}: ${getTsType(col.data_type)};\n`;
      }
      code += `}\n\n`;
      if (data.length > 0) {
        code += `export const mock${className}Data: ${className}[] = ${JSON.stringify(data, null, 2)};\n`;
      }
      return code;
    }
    case "rust": {
      let code = `#[derive(Debug, Serialize, Deserialize)]\npub struct ${className} {\n`;
      for (const col of columns) {
        code += `    pub ${col.name}: Option<${getRustType(col.data_type)}>,\n`;
      }
      code += `}\n`;
      return code;
    }
    case "ruby": {
      let code = `class ${className}\n`;
      code += `  attr_accessor ${columns.map(c => `:${c.name}`).join(", ")}\n\n`;
      code += `  def initialize(attrs = {})\n`;
      for (const col of columns) {
        code += `    @${col.name} = attrs[:${col.name}]\n`;
      }
      code += `  end\n`;
      code += `end\n`;
      return code;
    }
    case "csharp": {
      let code = `public class ${className}\n{\n`;
      for (const col of columns) {
        code += `    public ${getCSharpType(col.data_type)}? ${snakeToPascal(col.name)} { get; set; }\n`;
      }
      code += `}\n`;
      return code;
    }
    case "dart": {
      let code = `class ${className} {\n`;
      for (const col of columns) {
        let type = getDartType(col.data_type);
        // Map string to nullable String?
        code += `  final ${type}? ${col.name};\n`;
      }
      code += `\n  ${className}({\n`;
      for (const col of columns) {
        code += `    this.${col.name},\n`;
      }
      code += `  });\n\n`;
      code += `  factory ${className}.fromJson(Map<String, dynamic> json) {\n`;
      code += `    return ${className}(\n`;
      for (const col of columns) {
        let type = getDartType(col.data_type);
        if (type === "DateTime") {
          code += `      ${col.name}: json['${col.name}'] != null ? DateTime.parse(json['${col.name}']) : null,\n`;
        } else {
          code += `      ${col.name}: json['${col.name}'],\n`;
        }
      }
      code += `    );\n  }\n`;
      code += `}\n`;
      return code;
    }
    case "python": {
      let code = `from typing import Optional\nfrom dataclasses import dataclass\nimport datetime\n\n@dataclass\nclass ${className}:\n`;
      for (const col of columns) {
        code += `    ${col.name}: Optional[${getPythonType(col.data_type)}] = None\n`;
      }
      return code;
    }
    case "java": {
      let code = `public class ${className} {\n`;
      for (const col of columns) {
        code += `    private ${getJavaType(col.data_type)} ${col.name};\n`;
      }
      code += `\n    // Getters and Setters...\n`;
      code += `}\n`;
      return code;
    }
    default:
      return "";
  }
}
