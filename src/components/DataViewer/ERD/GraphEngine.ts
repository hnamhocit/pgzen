import { Edge, Node, MarkerType } from '@xyflow/react';
import { SchemaErdData, SchemaTableInfo, SchemaForeignKeyInfo } from '@/lib/tauri';

export class GraphEngine {
  private tables: Map<string, SchemaTableInfo> = new Map();
  private foreignKeys: SchemaForeignKeyInfo[] = [];
  private schemaName: string;

  // Adjacency list for fast BFS
  // table_name -> array of connected table_names
  private adjList: Map<string, Set<string>> = new Map();

  constructor(data: SchemaErdData, schemaName: string) {
    this.schemaName = schemaName;
    this.foreignKeys = data.foreign_keys;
    
    for (const t of data.tables) {
      this.tables.set(t.table_name, t);
      this.adjList.set(t.table_name, new Set());
    }

    // Build adjacency list
    for (const fk of data.foreign_keys) {
      if (this.adjList.has(fk.source_table)) {
        this.adjList.get(fk.source_table)!.add(fk.target_table);
      }
      if (this.adjList.has(fk.target_table)) {
        this.adjList.get(fk.target_table)!.add(fk.source_table);
      }
    }
  }

  public getTableIds(): string[] {
    return Array.from(this.tables.keys());
  }

  public expand(startTables: Set<string>, depth: number | 'all'): Set<string> {
    const visible = new Set(startTables);
    if (depth === 'all') {
      for (const t of this.tables.keys()) {
        visible.add(t);
      }
      return visible;
    }

    let currentLevel = new Set(startTables);
    for (let i = 0; i < depth; i++) {
      const nextLevel = new Set<string>();
      for (const t of currentLevel) {
        const neighbors = this.adjList.get(t);
        if (neighbors) {
          for (const neighbor of neighbors) {
            if (!visible.has(neighbor)) {
              visible.add(neighbor);
              nextLevel.add(neighbor);
            }
          }
        }
      }
      currentLevel = nextLevel;
      if (currentLevel.size === 0) break;
    }
    return visible;
  }

  public buildNodesAndEdges(
    visibleTables: Set<string>,
    existingNodes: Node[],
    onToggleExpand: (id: string) => void
  ): { nodes: Node[], edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Map existing nodes to preserve positions and expand states
    const existingMap = new Map(existingNodes.map(n => [n.id, n]));

    for (const tableName of visibleTables) {
      const tableInfo = this.tables.get(tableName);
      if (!tableInfo) continue;

      const nodeId = `${this.schemaName}.${tableName}`;
      const existing = existingMap.get(nodeId);

      // Determine foreign keys for this table (both source and target) to mark columns
      // Actually, in the new engine, a column is a foreign key if it's the source of any FK.
      const sourceFks = new Set(
        this.foreignKeys
          .filter(fk => fk.source_table === tableName)
          .map(fk => fk.source_column)
      );

      const node: Node = {
        id: nodeId,
        type: 'table',
        position: existing ? existing.position : { x: 0, y: 0 },
        data: {
          title: tableName,
          schema: this.schemaName,
          expanded: existing ? existing.data.expanded : true,
          columns: tableInfo.columns.map(c => ({
            ...c,
            is_foreign_key: sourceFks.has(c.name)
          })),
          onToggleExpand: () => onToggleExpand(tableName)
        }
      };

      nodes.push(node);
    }

    // Build edges only between visible nodes
    for (const fk of this.foreignKeys) {
      if (visibleTables.has(fk.source_table) && visibleTables.has(fk.target_table)) {
        const sourceId = `${this.schemaName}.${fk.source_table}`;
        const targetId = `${this.schemaName}.${fk.target_table}`;
        
        edges.push({
          id: `e-${sourceId}-${fk.source_column}-${targetId}-${fk.target_column}`,
          source: sourceId,
          sourceHandle: `${fk.source_column}-source`,
          target: targetId,
          targetHandle: `${fk.target_column}-target`,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#3b82f6', strokeWidth: 1.5 },
          markerStart: 'crows-foot-many',
          markerEnd: 'crows-foot-one',
        });
      }
    }

    return { nodes, edges };
  }
}
