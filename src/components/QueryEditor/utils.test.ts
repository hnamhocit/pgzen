import { describe, it, expect } from 'vitest';
import {
  processFakerTemplates,
  stripSqlComments,
  processQueryLimits,
  extractQueryPlanFromResult,
  isPureSelect,
  extractQueryVariables,
  replaceQueryVariables
} from './utils';

describe('QueryEditor Utils', () => {
  describe('processFakerTemplates', () => {
    it('should replace faker variables with values', () => {
      const query = "INSERT INTO users (name) VALUES ('{{faker.person.firstName()}}');";
      const processed = processFakerTemplates(query);
      expect(processed).not.toContain('{{faker.person.firstName()}}');
      expect(processed).toMatch(/INSERT INTO users \(name\) VALUES \('.+'\);/);
    });

    it('should ignore invalid faker paths gracefully', () => {
      const query = "SELECT '{{faker.invalid.path}}';";
      expect(processFakerTemplates(query)).toBe(query);
    });
  });

  describe('stripSqlComments', () => {
    it('should remove single line comments', () => {
      const sql = "SELECT * FROM users; -- get all users";
      expect(stripSqlComments(sql)).toBe("SELECT * FROM users;");
    });

    it('should remove multi-line comments', () => {
      const sql = "SELECT /* column */ * FROM users;";
      expect(stripSqlComments(sql)).toBe("SELECT  * FROM users;");
    });
  });

  describe('processQueryLimits', () => {
    it('should append LIMIT 100 to SELECT queries without limits', () => {
      const sql = "SELECT * FROM users";
      expect(processQueryLimits(sql)).toBe("SELECT * FROM users\nLIMIT 100");
    });

    it('should not append LIMIT if already exists', () => {
      const sql = "SELECT * FROM users LIMIT 10";
      expect(processQueryLimits(sql)).toBe("SELECT * FROM users LIMIT 10");
    });

    it('should ignore non-SELECT queries', () => {
      const sql = "UPDATE users SET age = 20";
      expect(processQueryLimits(sql)).toBe("UPDATE users SET age = 20");
    });
  });

  describe('extractQueryPlanFromResult', () => {
    it('should return JSON plan from explain result', () => {
      const res = [{
        type: "command_complete",
        rows: [{ "QUERY PLAN": "{\"Plan\": {}}" }]
      }];
      expect(extractQueryPlanFromResult(res)).toEqual({ Plan: {} });
    });

    it('should return null for non-JSON plan', () => {
      const res = [{
        type: "command_complete",
        rows: [{ "QUERY PLAN": "Seq Scan on users" }]
      }];
      expect(extractQueryPlanFromResult(res)).toBeNull();
    });
  });

  describe('isPureSelect', () => {
    it('should return true for pure selects', () => {
      expect(isPureSelect("SELECT * FROM users;")).toBe(true);
      expect(isPureSelect("EXPLAIN SELECT * FROM users;")).toBe(true);
      expect(isPureSelect("SHOW search_path;")).toBe(true);
    });

    it('should return false for data modification', () => {
      expect(isPureSelect("UPDATE users SET name = 'test';")).toBe(false);
      expect(isPureSelect("DELETE FROM users;")).toBe(false);
      expect(isPureSelect("INSERT INTO users (id) VALUES (1);")).toBe(false);
    });
  });

  describe('extractQueryVariables', () => {
    it('should extract simple variables and exclude faker ones', () => {
      const sql = "SELECT * FROM users WHERE status = {{status}} AND age > {{minAge}} OR name = '{{faker.person.firstName()}}'";
      expect(extractQueryVariables(sql)).toEqual(['status', 'minAge']);
    });
  });

  describe('replaceQueryVariables', () => {
    it('should replace variables using the provided record', () => {
      const sql = "SELECT * FROM users WHERE status = {{status}}";
      expect(replaceQueryVariables(sql, { status: "'ACTIVE'" })).toBe("SELECT * FROM users WHERE status = 'ACTIVE'");
    });

    it('should leave missing variables as is', () => {
      const sql = "SELECT * FROM users WHERE status = {{status}}";
      expect(replaceQueryVariables(sql, {})).toBe("SELECT * FROM users WHERE status = {{status}}");
    });
    
    it('should ignore faker variables', () => {
      const sql = "INSERT INTO users (name) VALUES ('{{faker.name}}')";
      expect(replaceQueryVariables(sql, { 'faker.name': 'bob' })).toBe("INSERT INTO users (name) VALUES ('{{faker.name}}')");
    });
  });
});
