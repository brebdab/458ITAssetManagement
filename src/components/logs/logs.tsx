import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Classes, Pre } from "@blueprintjs/core";
import ElementTab from "../elementView/elementTab";
import { RouteComponentProps } from "react-router";
import "../elementView//elementView.scss";
import { connect } from "react-redux";
import { ElementType } from "../../utils/utils";
import { API_ROOT } from "../../utils/api-config";
import axios from "axios";
import "./logs.scss";

interface LogEntry {
    id: number,
    date: string,
    log_content: string;
    user: number;
    related_asset?: number;
    related_model?: number;
}
interface LogsProps {
    token: string;
}
interface LogsState {
    logs: Array<LogEntry>;
    state_loaded: boolean;
}
class Logs extends React.Component<LogsProps & RouteComponentProps, LogsState> {
    public state: LogsState = {
        logs: [],
        state_loaded: false
    };

    private getLinkedLog(log: LogEntry) {
        if (log.related_asset) {
            const id = log.related_asset.toString()
            return <div><a href={"/assets/" + id}>{log.log_content}</a></div>
        } else if (log.related_model) {
            const id = log.related_model.toString()
            return <div><a href={"/models/" + id}>{log.log_content}</a></div>
        } else {
            return <div>{log.log_content}</div>
        }
    }

    public render() {
        if (!this.state.state_loaded) {
            getLogs(this.props.token).then(result => {
                const logs_array = result.logs
                console.log(logs_array)
                this.setState({
                    logs: logs_array,
                    state_loaded: true
                });
            });
        }
        console.log(this.state);
        return (
            <div className={Classes.DARK + " log-view"}>
                <h1>System Logs</h1>
                <Pre>
                    {this.state.logs.map(log => this.getLinkedLog(log))}
                </Pre>
            </div>
        );
    }
}

async function getLogs(token: string) {
    const headers = {
        headers: {
            Authorization: "Token " + token
        }
    };
    return await axios
        .post(
            API_ROOT + "api/logs/get-many",
            {},
            headers
        )
        .then(res => {
            return res.data;
        });
}

const mapStateToProps = (state: any) => {
    return {
        token: state.token
    };
};

export default connect(mapStateToProps)(Logs);
