const { dataSource, initializeDataSource, closeDataSource } = require('./src/data-source');

beforeAll(async () => {
  await initializeDataSource();
});

afterAll(async () => {
  await closeDataSource();
});

beforeEach(async () => {
  if (dataSource.isInitialized) {
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.query(`DELETE FROM "${entity.tableName}"`);
    }
  }
});
