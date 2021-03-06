import PolarisConnection from "./PolarisConnection";

export interface PolarisTaskInputs {
    polaris_connection: PolarisConnection
    build_command: string,
    should_wait_for_issues: boolean

    should_populate_changeset: boolean
    should_empty_changeset_fail: boolean
}
