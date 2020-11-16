import { PolarisTaskInputs } from "../model/PolarisTaskInput";
import {PolarisProxyInfo} from "../model/PolarisProxyInfo";
import tl = require("azure-pipelines-task-lib/task");
import proxy from "proxy-agent";
import {PolarisConnection} from "../model/PolarisConnection";

export default class PolarisInputReader {
    readInput(): PolarisTaskInputs {
        var polaris_service_id = "polarisService";
        var polaris_service = tl.getInput(polaris_service_id, /* required: */ true)!
        var polaris_url: string = tl.getEndpointUrl(polaris_service, /* optional: */ false);
        const polaris_token: string = tl.getEndpointAuthorizationParameter(polaris_service, 'apiToken', /* optional: */ false)!

        var polaris_proxy_info: PolarisProxyInfo | undefined = undefined;
        var polaris_proxy_id = "polarisProxyService";
        var polaris_proxy_service = tl.getInput(polaris_proxy_id, /* required: */ false)
        if (polaris_proxy_service) {
            var proxy_url: string = tl.getEndpointUrl(polaris_proxy_service, /* optional: */ true);
            const proxy_username: string | undefined = tl.getEndpointAuthorizationParameter(polaris_proxy_service, 'username', /* optional: */ true)
            const proxy_password: string | undefined = tl.getEndpointAuthorizationParameter(polaris_proxy_service, 'password', /* optional: */ true)
            polaris_proxy_info = new PolarisProxyInfo(proxy_url, proxy_username, proxy_password);
        }

        const build_command = tl.getInput('polarisCommand', /* required: */ true)!;
        const should_wait_for_issues = tl.getBoolInput('waitForIssues', /* required: */ true)!;

        if (polaris_url.endsWith("/") || polaris_url.endsWith("\\")) {
            polaris_url = polaris_url.slice(0, -1);
        }

        var should_changeset_fail = false;
        const should_changeset = tl.getBoolInput('populateChangeSetFile', /* required: */ true);
        if (should_changeset) {
            var should_changeset_fail_text = tl.getInput('whenChangeSetEmpty', /* required: */ true);
            if (should_changeset_fail_text == "fail") {
                should_changeset_fail = true;
            }
        }

        return { //PolarisTaskInputs
            polaris_connection: new PolarisConnection(polaris_url, polaris_token, polaris_proxy_info),
            build_command: build_command,
            should_wait_for_issues: should_wait_for_issues,
            should_empty_changeset_fail: should_changeset_fail,
            should_populate_changeset: should_changeset
        }
    }
}
