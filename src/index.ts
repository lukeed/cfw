// NOTE: Do this to avoid `__export` runtime helper in output
import { list as l1, create as c1, destroy as d1 } from './commands/secrets';
import { list as l2, create as c2, destroy as d2 } from './commands/names';

export { default as build } from './commands/build';
export { default as deploy } from './commands/deploy';

export const secret = { list:l1, create:c1, destroy:d1 };
export const ns = { list:l2, create:c2, destroy:d2 };
