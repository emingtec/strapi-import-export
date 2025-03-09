import { importData } from './import';
import { importDataV3 } from './import-v3';
import { parseInputData } from './parsers';

const importService = {
  importData,
  importDataV3,
  parseInputData,
};

export default importService;
