import { BaseApp, JovoError } from 'jovo-core';

jest.mock('pg');
import { Pool } from 'pg';

import { PostgreSQL } from '../src/PostgreSQL';

// config.connection is always expected
const postgreSQLConfig = {
  connection: {},
};

describe('test install()', () => {
  test('should throw JovoError because config.connection is undefined', () => {
    // config.connection is undefined by default
    const postgreSQL = new PostgreSQL();
    const app = new BaseApp();

    expect(() => {
      postgreSQL.install(app);
    }).toThrowError(JovoError);
  });

  describe('test install() setting app.$db', () => {
    test('test should set app.$db to be PostgreSQL if no default db was set in config', () => {
      const postgreSQL = new PostgreSQL(postgreSQLConfig);
      const app = new BaseApp();

      postgreSQL.install(app);

      expect(app.$db).toBeInstanceOf(PostgreSQL);
    });

    test('test app.$db should not be an instance of PostgreSQL if default db set in config is not PostgreSQL', () => {
      const postgreSQL = new PostgreSQL(postgreSQLConfig);
      const app = new BaseApp();
      app.config.db = {
        default: 'test',
      };

      postgreSQL.install(app);

      expect(app.$db).not.toBeInstanceOf(PostgreSQL);
    });

    test('test app.$db should be an instance PostgreSQL if default db is set to PostgreSQL', () => {
      const postgreSQL = new PostgreSQL(postgreSQLConfig);
      const app = new BaseApp();
      app.config.db = {
        default: 'PostgreSQL',
      };

      postgreSQL.install(app);

      expect(app.$db).toBeInstanceOf(PostgreSQL);
    });
  });

  test('should initialize pool object', () => {
    const postgreSQL = new PostgreSQL(postgreSQLConfig);
    const app = new BaseApp();

    postgreSQL.install(app);

    expect(postgreSQL.pool).toBeDefined();
  });
});

describe('test uninstall()', () => {
  test('should end pool', () => {
    const postgreSQL = new PostgreSQL(postgreSQLConfig);
    postgreSQL.pool = new Pool();
    const app = new BaseApp();

    postgreSQL.uninstall(app);

    expect(postgreSQL.pool.end).toBeCalled();
  });
});

describe('test database operations', () => {
  let postgreSQL: PostgreSQL;

  beforeEach(() => {
    postgreSQL = new PostgreSQL();
  });

  describe('test load()', () => {
    test('should throw error because dataColumnName is undefined', () => {
      postgreSQL.config.dataColumnName = undefined;

      postgreSQL.load('test').catch((e) => expect(e).toBeInstanceOf(JovoError));
    });

    test('should throw error because primaryKeyColumn is undefined', () => {
      postgreSQL.config.primaryKeyColumn = undefined;

      postgreSQL.load('test').catch((e) => expect(e).toBeInstanceOf(JovoError));
    });

    test('should throw error because tableName is undefined', () => {
      postgreSQL.config.tableName = undefined;

      postgreSQL.load('test').catch((e) => expect(e).toBeInstanceOf(JovoError));
    });

    test('should create table if none exists with the set tableName', () => {
      /**
       * mock Error with code 42P01 specifying an undefined table, i.e. table doesn't exist
       * second mocked value is for `createTable()` function which will send a query
       * to create a new table
       */
      postgreSQL.pool = ({
        query: jest.fn().mockRejectedValueOnce({ code: '42P01' }).mockResolvedValueOnce({}),
      } as unknown) as Pool;

      postgreSQL.load('test').then(() => {
        /**
         * first array stores each call to the mock function.
         * Second array stores the args parsed to that specific call.
         * We check whether the second call contained the `CREATE TABLE` query
         */
        const createTableQuery: string = (postgreSQL.pool.query as jest.Mock).mock.calls[1][0];
        expect(createTableQuery.startsWith('CREATE TABLE')).toBeTruthy();
      });
    });

    test('should rethrow the error if it can not handle it', () => {
      postgreSQL.pool = ({
        query: jest.fn().mockRejectedValueOnce({ code: '12345' }),
      } as unknown) as Pool;

      postgreSQL.load('test').catch((e) => expect(e.code).toBe('12345'));
    });

    test('should return user data', () => {
      const mockDbData = {
        rowCount: 1,
        rows: [
          {
            [postgreSQL.config.dataColumnName!]: '{"key": "value"}',
          },
        ],
      };
      postgreSQL.pool = ({
        query: jest.fn().mockResolvedValue(mockDbData),
      } as unknown) as Pool;

      postgreSQL.load('test').then((data) => {
        expect(data).toEqual({ [postgreSQL.config.dataColumnName!]: { key: 'value' } });
      });
    });

    test('should return empty object if there is no user data', () => {
      const mockDbData = {
        rowCount: 0,
        rows: [],
      };
      postgreSQL.pool = ({
        query: jest.fn().mockResolvedValue(mockDbData),
      } as unknown) as Pool;

      postgreSQL.load('test').then((data) => {
        expect(data).toEqual({});
      });
    });
  });

  describe('test save()', () => {
    test('should throw error because dataColumnName is undefined', () => {
      postgreSQL.config.dataColumnName = undefined;

      postgreSQL
        .save('test', 'key', { key: 'value' })
        .catch((e) => expect(e).toBeInstanceOf(JovoError));
    });

    test('should throw error because primaryKeyColumn is undefined', () => {
      postgreSQL.config.primaryKeyColumn = undefined;

      postgreSQL
        .save('test', 'key', { key: 'value' })
        .catch((e) => expect(e).toBeInstanceOf(JovoError));
    });

    test('should throw error because tableName is undefined', () => {
      postgreSQL.config.tableName = undefined;

      postgreSQL
        .save('test', 'key', { key: 'value' })
        .catch((e) => expect(e).toBeInstanceOf(JovoError));
    });

    // test('should save parsed user data', () => {

    // });
  });

  describe('test delete()', () => {
    test('should throw error because dataColumnName is undefined', () => {
      postgreSQL.config.dataColumnName = undefined;

      postgreSQL.delete('test').catch((e) => expect(e).toBeInstanceOf(JovoError));
    });

    test('should throw error because primaryKeyColumn is undefined', () => {
      postgreSQL.config.primaryKeyColumn = undefined;

      postgreSQL.delete('test').catch((e) => expect(e).toBeInstanceOf(JovoError));
    });

    test('should throw error because tableName is undefined', () => {
      postgreSQL.config.tableName = undefined;

      postgreSQL.delete('test').catch((e) => expect(e).toBeInstanceOf(JovoError));
    });
  });
});
