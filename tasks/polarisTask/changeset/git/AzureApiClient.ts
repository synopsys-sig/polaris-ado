import AzureVariables from "./AzureVariables";
import * as azdev from "azure-devops-node-api";
import {IBuildApi} from "azure-devops-node-api/BuildApi";
import {Build, BuildResult, BuildQueryOrder} from "azure-devops-node-api/interfaces/BuildInterfaces";

export default class AzureApiClient {
    variables: AzureVariables;
    apiClient: IBuildApi | undefined;

    constructor(variables: AzureVariables) {
        this.variables = variables;
    }

    async connect() {
        const auth = azdev.getBearerHandler(this.variables.get_access_token());
        const connection = new azdev.WebApi(this.variables.get_org_uri(), auth);

        this.apiClient = await connection.getBuildApi();
    }

    async get_latest_build_commit(): Promise<string | undefined> {
        const build: Build | undefined = await this.get_latest_build();
        if (build == undefined) return undefined;
        return build.sourceVersion;
    }

    async get_latest_build(): Promise<Build | undefined> {
        const project = this.variables.get_project();
        const definitionId = this.variables.get_definition_id();
        if (this.apiClient == undefined) return undefined;
        const builds = await this.apiClient.getBuilds(
            project,
            [definitionId],
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            BuildResult.Succeeded,
            undefined,
            undefined,
            1,
            undefined,
            undefined,
            undefined,
            BuildQueryOrder.FinishTimeDescending
        );
        if (builds && builds.length > 0) {
            return builds[0];
        } else {
            return undefined;
        }
    }
}