import {
  Alert,
  AnchorButton,
  Callout,
  Classes,
  Intent,
  IToastProps,
  Position,
  Spinner,
  Toaster,
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../utils/api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import {
  AssetObject,
  ChangePlan,
  getChangePlanRowStyle,
  getHeaders,
  MountTypes,
} from "../../../utils/utils";
import "./powerView.scss";
import { IconNames } from "@blueprintjs/icons";
import { PermissionState } from "../../../utils/permissionUtils";

interface PowerViewProps {
  token: string;
  callback?: Function;
  asset?: AssetObject;
  shouldUpdate: boolean;
  updated: Function;
  isAdmin: boolean;
  changePlan: ChangePlan;
  assetIsDecommissioned: boolean;
  permissionState: PermissionState;
  isMobile?: boolean;
}

interface PowerViewState {
  powerConnections: any;
  powerStatus: any;
  statusLoaded: boolean;
  alertOpen: boolean;
  confirmationMessage: string;
  username?: string;
}

export class PowerView extends React.PureComponent<
  RouteComponentProps & PowerViewProps,
  PowerViewState
> {
  //TOASTS
  private toaster: Toaster = {} as Toaster;
  private addToast = (toast: IToastProps) => {
    toast.timeout = 5000;
    if (this.toaster) {
      this.toaster.show(toast);
    }
  };
  private addSuccessToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  };
  private addErrorToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.DANGER });
  };

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  public state: PowerViewState = {
    powerConnections: undefined,
    powerStatus: undefined,
    statusLoaded: true,
    alertOpen: false,
    confirmationMessage: "",
  };

  componentDidMount() {
    if (this.shouldShowPower()) {
      this.setState({
        statusLoaded: true,
      });
      this.getPowerStatus();
    } else {
      this.setState({
        statusLoaded: true,
      });
    }
    this.getUsername(this.props.token);
  }

  componentDidUpdate() {
    if (this.props.shouldUpdate) {
      if (this.shouldShowPower()) {
        this.getPowerStatus();
        this.setState({
          statusLoaded: true,
        });
      }
    } else {
      this.setState({
        statusLoaded: true,
      });
    }
    this.props.updated();
  }

  private isAssetPowerNetworkControlled() {
    return (
      this.props.asset &&
      this.props.asset.model &&
      (this.props.asset.model.model_type === MountTypes.RACKMOUNT ||
        this.props.asset.model.model_type === MountTypes.BLADE_CHASSIS) &&
      this.props.asset.rack &&
      this.props.asset.rack.is_network_controlled
    );
  }

  private shouldShowPower() {
    return (
      !this.props.assetIsDecommissioned &&
      !this.props.changePlan &&
      this.isAssetPowerNetworkControlled()
    );
  }

  private shouldShowPowerButtons() {
    return (
      this.shouldShowPower() &&
      Object.keys(this.props.asset!.power_connections).length > 0
    );
  }

  private shouldDisablePowerButtons() {
    return !(
      this.props.permissionState.admin ||
      this.props.permissionState.power_control ||
      (this.props.asset && this.state.username === this.props.asset.owner)
    );
  }

  private getPowerStatus() {
    axios
      .get(
        API_ROOT + "api/rack-power/status/" + this.props.asset!.id,
        getHeaders(this.props.token)
      )
      .then((res) => {
        this.setState({
          powerConnections: res.data.power_connections,
          powerStatus: res.data.power_status,
          statusLoaded: true,
        });
      })
      .catch((err) => {
        this.addErrorToast(err.response.data.failure_message);
        this.setState({
          statusLoaded: true,
        });
      });
  }

  private requestPowerOn() {
    this.setState({
      statusLoaded: !this.state.statusLoaded,
    });
    axios
      .post(
        API_ROOT + "api/rack-power/on",
        { id: this.props.asset!.id },
        getHeaders(this.props.token)
      )
      .then((res) => {
        this.setState({
          alertOpen: true,
          confirmationMessage: res.data.success_message,
        });
        this.componentDidMount();
      })
      .catch((err) => {
        alert(err);
      });
  }

  private requestPowerOff() {
    this.setState({
      statusLoaded: !this.state.statusLoaded,
    });
    axios
      .post(
        API_ROOT + "api/rack-power/off",
        { id: this.props.asset!.id },
        getHeaders(this.props.token)
      )
      .then((res) => {
        this.setState({
          alertOpen: true,
          confirmationMessage: res.data.success_message,
        });
        this.componentDidMount();
      })
      .catch((err) => {
        alert(err);
      });
  }

  private requestPowerCycle() {
    this.setState({
      statusLoaded: !this.state.statusLoaded,
    });
    axios
      .post(
        API_ROOT + "api/rack-power/cycle",
        { id: this.props.asset!.id },
        getHeaders(this.props.token)
      )
      .then((res) => {
        this.setState({
          alertOpen: true,
          confirmationMessage: res.data.success_message,
        });
        this.componentDidMount();
      })
      .catch((err) => {
        alert(err);
      });
  }

  getUsername(token: string) {
    const headers = {
      headers: {
        Authorization: "Token " + token,
      },
    };
    axios
      .get(API_ROOT + "api/users/who-am-i", headers)
      .then((res) => {
        this.setState({ username: res.data.username });
      })
      .catch((err) => {});
  }

  getPowerPortRows() {
    const rows = [];
    if (this.props.asset) {
      for (
        let i = 1;
        i < ((this.props.asset.model.num_power_ports as unknown) as number) + 1;
        i++
      ) {
        rows.push(
          <tr>
            <td style={getChangePlanRowStyle(this.props.asset)}>{i}</td>
            {this.props.asset!.power_connections[i] ? (
              <td style={getChangePlanRowStyle(this.props.asset)}>
                {this.props.asset!.power_connections[i].port_number}
                {this.props.asset!.power_connections[i].left_right}
              </td>
            ) : (
              <td></td>
            )}
            {this.props.asset!.rack &&
            this.props.asset!.rack.is_network_controlled ? (
              this.state.powerStatus ? (
                <td>{this.state.powerStatus[i]}</td>
              ) : this.props.assetIsDecommissioned || this.props.changePlan ? (
                <td> </td>
              ) : (
                <td>Unable to contact PDU controller</td>
              )
            ) : (
              <td>PDU not network controlled</td>
            )}
          </tr>
        );
      }
    }
    return rows;
  }

  private renderPowerTable() {
    return (
      <div className="power-table">
        <div className="network-connections">
          <table className="bp3-html-table bp3-html-table-bordered bp3-html-table-striped">
            <tr>
              <th>Power Port Number</th>
              <th>PDU Port Number</th>
              <th>Power Status</th>
            </tr>
            <tbody>{this.getPowerPortRows()}</tbody>
          </table>
        </div>
        {this.props.asset &&
        this.state.powerStatus &&
        this.state.statusLoaded &&
        this.shouldShowPowerButtons() ? (
          <AnchorButton
            className={"power-close"}
            intent={
              this.state.powerStatus[Object.keys(this.state.powerStatus)[0]] ===
              "OFF"
                ? "primary"
                : "danger"
            }
            minimal
            text={
              this.state.powerStatus[Object.keys(this.state.powerStatus)[0]] ===
              "OFF"
                ? "Turn on"
                : "Turn off"
            }
            icon="power"
            disabled={this.shouldDisablePowerButtons()}
            onClick={
              this.state.powerStatus[Object.keys(this.state.powerStatus)[0]] ===
              "OFF"
                ? () => {
                    this.requestPowerOn();
                  }
                : () => {
                    this.requestPowerOff();
                  }
            }
          />
        ) : null}
        {this.props.asset &&
        this.state.powerStatus &&
        this.state.statusLoaded &&
        this.shouldShowPowerButtons() ? (
          <AnchorButton
            className={"power-close"}
            minimal
            intent="warning"
            text={"Cycle Power"}
            disabled={this.shouldDisablePowerButtons()}
            onClick={() => {
              this.requestPowerCycle();
            }}
          />
        ) : null}
        {this.props.callback === undefined ? null : (
          <AnchorButton
            className={"power-close"}
            intent="danger"
            minimal
            text="Close"
            onClick={() => {
              this.setState({
                powerConnections: undefined,
                powerStatus: undefined,
                statusLoaded: false,
              });
              this.props.callback!();
            }}
          />
        )}
      </div>
    );
  }

  private renderNoPowerPortsCallout() {
    return <Callout title="No power ports" icon={IconNames.INFO_SIGN} />;
  }

  private assetHasPowerPorts() {
    return (
      this.props.asset &&
      ((this.props.asset.model.num_power_ports as unknown) as number) > 0
    );
  }

  render() {
    return (
      <div className={Classes.DARK + " propsview"}>
        <h3>Power Connections</h3>
        {this.state.statusLoaded ? (
          this.assetHasPowerPorts() ? (
            this.renderPowerTable()
          ) : (
            <div className={this.props.isMobile ? "" : "propsview"}>
              {this.props.isMobile ? null : <h3>Power Connections</h3>}
              <div className="network-connections">
                <table className="bp3-html-table bp3-html-table-bordered bp3-html-table-striped">
                  <tr>
                    <th>Power Port Number</th>
                    <th>PDU Port Number</th>
                    <th>Power Status</th>
                  </tr>
                  <tbody>{this.getPowerPortRows()}</tbody>
                </table>
              </div>
              {this.props.asset!.rack &&
              this.props.asset!.rack.is_network_controlled &&
              Object.keys(this.props.asset!.power_connections).length > 0 &&
              this.state.powerStatus &&
              !this.props.assetIsDecommissioned &&
              !this.props.changePlan && !this.props.isMobile ? (
                <AnchorButton
                  className={"power-close"}
                  intent={
                    this.state.powerStatus[
                      Object.keys(this.state.powerStatus)[0]
                    ] === "OFF"
                      ? "primary"
                      : "danger"
                  }
                  minimal
                  text={
                    this.state.powerStatus[
                      Object.keys(this.state.powerStatus)[0]
                    ] === "OFF"
                      ? "Turn on"
                      : "Turn off"
                  }
                  icon="power"
                  disabled={
                    !(
                      this.props.permissionState.admin ||
                      this.props.permissionState.power_control ||
                      this.state.username === this.props.asset!.owner
                    )
                  }
                  onClick={
                    this.state.powerStatus[
                      Object.keys(this.state.powerStatus)[0]
                    ] === "OFF"
                      ? () => {
                          this.setState({
                            statusLoaded: !this.state.statusLoaded,
                          });
                          axios
                            .post(
                              API_ROOT + "api/rack-power/on",
                              { id: this.props.asset!.id },
                              getHeaders(this.props.token)
                            )
                            .then((res) => {
                              this.setState({
                                alertOpen: true,
                                confirmationMessage: res.data.success_message,
                              });
                              this.componentDidMount();
                            })
                            .catch((err) => {
                              alert(err);
                            });
                        }
                      : () => {
                          this.setState({
                            statusLoaded: !this.state.statusLoaded,
                          });
                          axios
                            .post(
                              API_ROOT + "api/rack-power/off",
                              { id: this.props.asset!.id },
                              getHeaders(this.props.token)
                            )
                            .then((res) => {
                              this.setState({
                                alertOpen: true,
                                confirmationMessage: res.data.success_message,
                              });
                              this.componentDidMount();
                            })
                            .catch((err) => {
                              alert(err);
                            });
                        }
                  }
                />
              ) : null}
              {this.props.asset!.rack &&
              this.props.asset!.rack.is_network_controlled &&
              Object.keys(this.props.asset!.power_connections).length > 0 &&
              this.state.powerStatus &&
              !this.props.assetIsDecommissioned &&
              !this.props.changePlan && !this.props.isMobile ? (
                <AnchorButton
                  className={"power-close"}
                  minimal
                  intent="warning"
                  text={"Cycle Power"}
                  disabled={
                    !(
                      this.props.permissionState.admin ||
                      this.props.permissionState.power_control ||
                      this.state.username === this.props.asset!.owner
                    )
                  }
                  onClick={() => {
                    this.setState({
                      statusLoaded: !this.state.statusLoaded,
                    });
                    axios
                      .post(
                        API_ROOT + "api/rack-power/cycle",
                        { id: this.props.asset!.id },
                        getHeaders(this.props.token)
                      )
                      .then((res) => {
                        this.setState({
                          alertOpen: true,
                          confirmationMessage: res.data.success_message,
                        });
                        this.componentDidMount();
                      })
                      .catch((err) => {
                        alert(err);
                      });
                  }}
                />
              ) : null}
              {this.props.callback === undefined ? null : (
                <AnchorButton
                  className={"power-close"}
                  intent="danger"
                  minimal
                  text="Close"
                  onClick={() => {
                    this.setState({
                      powerConnections: undefined,
                      powerStatus: undefined,
                      statusLoaded: false,
                    });
                    this.props.callback!();
                  }}
                />
              )}
            </div>
            // {this.renderNoPowerPortsCallout()}
          )
        ) : (
          <Spinner />
        )}
        <Alert
          className={Classes.DARK}
          confirmButtonText="OK"
          isOpen={this.state.alertOpen}
          onConfirm={() => {
            this.setState({
              alertOpen: false,
            });
          }}
          onClose={() => {
            this.setState({
              alertOpen: false,
            });
          }}
        >
          <p>{this.state.confirmationMessage}</p>
        </Alert>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin,
    changePlan: state.changePlan,
    permissionState: state.permissionState,
  };
};

export default withRouter(connect(mapStatetoProps)(PowerView));
