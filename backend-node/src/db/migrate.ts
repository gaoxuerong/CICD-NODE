import { sequelize } from './sequelize';

export async function migrate() {
  await sequelize.sync({ alter: false });
  console.log('Migration complete.');
}