export { default as build } from './commands/build';
export { default as deploy } from './commands/deploy';

export {
	list as ns_list,
	create as ns_create,
	destroy as ns_destroy,
} from './commands/names';
