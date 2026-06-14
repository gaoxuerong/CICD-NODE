import { Sequelize } from 'sequelize';
import { config } from '../config';

export const sequelize = new Sequelize(config.dbName, config.dbUser, config.dbPassword, {
  host: config.dbHost,
  port: config.dbPort,
  dialect: 'mysql',
  logging: false,
  timezone: '+08:00',
  define: {
    freezeTableName: true,
    timestamps: false,
  },
  pool: {
    max: 10,
    min: 0,
    idle: 10000,
  },
});

export async function connectDb() {
  await sequelize.authenticate();
}

export async function closeDb() {
  await sequelize.close();
}
