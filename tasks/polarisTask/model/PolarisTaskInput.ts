import {PolarisConnection} from "./PolarisConnection";

export interface PolarisTaskInputs {
    polaris_connection: PolarisConnection
    build_command: string,
    should_wait_for_issues: boolean
}
