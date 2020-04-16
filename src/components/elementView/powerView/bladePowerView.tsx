import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
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
import axios from "axios";
import { API_ROOT } from "../../../utils/api-config";
import { connect } from "react-redux";
import {
  AssetObject,
  ChangePlan,
  getChangePlanRowStyle,
  getHeaders,
} from "../../../utils/utils";
import { PermissionState } from "../../../utils/permissionUtils";
import { IconNames } from "@blueprintjs/icons";
import "./bladePowerView.scss";

export enum PowerAction {
  ON = "on",
  OFF = "off",
  CYCLE = "cycle",
}

interface BladePowerViewProps {
  token: string;
  callback?: Function;
  asset?: AssetObject;
  shouldUpdate: boolean;
  updated: Function;
  isAdmin: boolean;
  changePlan: ChangePlan;
  assetIsDecommissioned: boolean;
  permissionState: PermissionState;
}

interface BladePowerViewState {
  powerStatus?: string;
  statusLoaded: boolean;
  alertOpen: boolean;
  confirmationMessage: string;
  username?: string;
}

export class BladePowerView extends React.PureComponent<
  RouteComponentProps & BladePowerViewProps,
  BladePowerViewState
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

  public state: BladePowerViewState = {
    powerStatus: undefined,
    statusLoaded: true,
    alertOpen: false,
    confirmationMessage: "",
    username: undefined,
  };

  componentDidMount() {
    if (this.shouldShowPower()) {
      this.getPowerStatus();
    } else {
      this.setState({
        statusLoaded: true,
      });
    }
    this.getUsername(this.props.token);
  }

  componentDidUpdate() {
    if (this.props.shouldUpdate && this.shouldShowPower()) {
      this.getPowerStatus();
    } else {
      this.setState({ statusLoaded: true });
    }
    this.props.updated();
  }

  private getUsername(token: string) {
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

  private isBladePowerNetworkControlled() {
    const vendorBMI = "BMI";
    if (this.props.asset && this.props.asset.chassis) {
      return this.props.asset.chassis.model.vendor === vendorBMI;
    } else {
      return false;
    }
  }

  private shouldShowPower() {
    return (
      !this.props.assetIsDecommissioned &&
      !this.props.changePlan &&
      this.isBladePowerNetworkControlled()
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
      .post(
        API_ROOT + "api/chassis-power/status",
        {
          chassis_id: this.props.asset!.chassis!.id,
          blade_slot: this.props.asset!.chassis_slot,
        },
        getHeaders(this.props.token)
      )
      .then((res) => {
        this.setState({
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

  private requestPowerAction(action: PowerAction) {
    axios
      .post(
        API_ROOT + "api/chassis-power/" + action,
        {
          chassis_id: this.props.asset!.chassis!.id,
          blade_slot: this.props.asset!.chassis_slot,
        },
        getHeaders(this.props.token)
      )
      .then((res) => {
        this.setState({
          alertOpen: true,
          confirmationMessage: res.data.success_message,
        });
        this.getPowerStatus();
      })
      .catch((err) => {
        alert(err);
      });
  }

  private renderPowerTable() {
    return (
      <div className="blade-power-table">
        <div className="network-connections">
          <table className="bp3-html-table bp3-html-table-bordered bp3-html-table-striped">
            <tr>
              <th>Chassis Hostname</th>
              <th>Chassis Slot</th>
              <th>Power Status</th>
            </tr>
            <tbody>
              <tr>
                <td style={getChangePlanRowStyle(this.props.asset)}>
                  {this.props.asset?.chassis?.hostname}
                </td>
                <td style={getChangePlanRowStyle(this.props.asset)}>
                  {this.props.asset?.chassis_slot}
                </td>
                <td style={getChangePlanRowStyle(this.props.asset)}>
                  {this.state.powerStatus}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <AnchorButton
          className={"blade-power-close"}
          intent={this.state.powerStatus === "OFF" ? "primary" : "danger"}
          minimal
          text={this.state.powerStatus === "OFF" ? "Turn on" : "Turn off"}
          icon="power"
          disabled={this.shouldDisablePowerButtons()}
          onClick={() => {
            this.state.powerStatus === "OFF"
              ? this.requestPowerAction(PowerAction.ON)
              : this.requestPowerAction(PowerAction.OFF);
          }}
        />
        <AnchorButton
          className={"blade-power-close"}
          intent={"warning"}
          minimal
          text={"Cycle Power"}
          icon="power"
          disabled={this.shouldDisablePowerButtons()}
          onClick={() => {
            this.requestPowerAction(PowerAction.CYCLE);
          }}
        />
      </div>
    );
  }

  private renderNoPowerCallout() {
    return (
      <Callout
        title="Power is not network controllable in this blade chassis"
        icon={IconNames.INFO_SIGN}
      />
    );
  }

  render() {
    return (
      <div className="propsview">
        <h3>Power Connections</h3>
        {this.state.statusLoaded ? (
          this.props.asset &&
          this.props.asset.chassis &&
          this.props.asset.chassis.model &&
          this.props.asset.chassis.model.vendor &&
          this.isBladePowerNetworkControlled() ? (
            this.renderPowerTable()
          ) : (
            this.renderNoPowerCallout()
          )
        ) : (
          <Spinner />
        )}
        <Alert
          className={Classes.DARK}
          confirmButtonText="Okay"
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

export default withRouter(connect(mapStatetoProps)(BladePowerView));
