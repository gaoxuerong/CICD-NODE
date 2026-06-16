import fs from 'fs';
import path from 'path';
import { swaggerSpec } from './swagger';

const outputPath = path.join(__dirname, '../../swagger.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));
console.log(`Swagger spec written to ${outputPath}`);
