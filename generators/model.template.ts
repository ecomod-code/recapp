import { PinionContext, toFile, renderTemplate, prompt, fromFile, inject, append } from "@featherscloud/pinion";

interface Context extends PinionContext {
	entityName: string;
	hasUid: boolean;
}

// The file content as a template string
const schemaTemplate = ({ entityName, hasUid }: Context) => {
	const schemaName = entityName[0].toLowerCase() + entityName.slice(1);
	return `
import zod from "zod";
${hasUid ? 'import { idSchema } from "./base";' : ""}

export const ${schemaName}Schema = zod
	.object({
		/* Enter your schema elements here */
	})${hasUid ? "" : ";"}
	${hasUid ? ".merge(idSchema);" : ""}

export type ${entityName} = zod.infer<typeof ${schemaName}Schema>;
	`;
};

// Export the generator and render the template
export const generate = (init: Context) =>
	Promise.resolve(init)
		.then(
			prompt({
				entityName: {
					type: "input",
					message: "Name of the new entity?",
				},
				hasUid: {
					type: "confirm",
					message: "Has this entity an uid?",
				},
			})
		)
		.then(context => {
			const schemaName = context.entityName[0].toLowerCase() + context.entityName.slice(1);
			return renderTemplate(schemaTemplate, toFile(`./packages/models/${schemaName}.ts`))(context);
		})
		.then(context => {
			const schemaName = context.entityName[0].toLowerCase() + context.entityName.slice(1);
			return inject(`export * from "./${schemaName}"`, append(), fromFile("./packages/models/index.ts"))(context);
		})
		.catch(error => {
			console.error(error);
		});
