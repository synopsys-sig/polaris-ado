import tl = require("azure-pipelines-task-lib/task");

export default class AzureVariables {
    get_or_throw(name: string): string {
        const value = tl.getVariable(name);
        if (!value) {
            throw new Error(`The variable "${name}" is required to generate change sets.`);
        }

        return value;
    }

    get_project(): string {
        return this.get_or_throw("System.TeamProjectId");
    }
    get_org_uri(): string {
        return this.get_or_throw("System.TeamFoundationCollectionUri");
    }
    get_access_token(): string {
        return this.get_or_throw("System.AccessToken");
    }
    get_definition_id(): number {
        return parseInt(this.get_or_throw("System.DefinitionId"));
    }
}