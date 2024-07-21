const dataSource = require('./src/data-source').default;

beforeAll(async () => {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
    await dataSource.runMigrations();
  }
});

afterAll(async () => {
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
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
