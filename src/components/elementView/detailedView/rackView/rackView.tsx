import {
  Alert,
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
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../../../utils/api-config";
import {
  AssetCPObject,
  AssetObject,
  getHeaders, isAssetCPObject,
  MountTypes,
  RackResponseObject,
  ROUTES,
} from "../../../../utils/utils";
import "./rackView.scss";

//export interface ElementViewProps {}

export interface RackViewProps {
  token: string;
  isAdmin: string;
  racks: Array<RackResponseObject>;
  loading: boolean;
}
export interface RouteParams {
  rid: string;
}
var console: any = {};
console.log = function () {};
console.warn = function () {};

export interface RackViewState {
  isDeleteOpen: boolean;
}
class RackView extends React.PureComponent<
  RouteComponentProps & RackViewProps,
  RackViewState
> {
  state = { isDeleteOpen: false };
  private getRows(rackResp: RackResponseObject) {
    let rows = [];

    let unit = 1;
    let currHeight = 0;
    const { height } = rackResp.rack;
    let assets: Array<AssetObject|AssetCPObject> = Object.assign([], rackResp.assets);

    let maxHeight: number = +height;

    while (currHeight < maxHeight) {

      if (
        assets.length > 0 &&
        assets[0] &&
        currHeight === +assets[0].rack_position - 1
      ) {
        const width = +assets[0].model.height;
        const asset = assets[0]
        const id = isAssetCPObject(asset)? asset.related_asset.id : +assets[0].id;

        if (width + currHeight > maxHeight) {

          currHeight++;

          rows.unshift(
            <tr className="rack-row">
              <td className="cell empty"></td>
            </tr>
          );
        } else {
          currHeight = width + currHeight;
          const hostname = assets[0].hostname
            ?  assets[0].hostname
            : " ";
          let display = hostname;
          if (assets[0].model.model_type === MountTypes.BLADE_CHASSIS) {
            if (assets[0].blades.length === 1) {
              display += " | " +  assets[0].blades.length + " blade";
            } else {
              display += " | " +  assets[0].blades.length + " blades";
            }

            display +=
              " | " +
              assets[0].model.vendor +
              " " +
              assets[0].model.model_number
          }

          rows.unshift(
            <tr
              className="rack-row"
              style={{
                lineHeight: unit * width,
                backgroundColor: assets[0].display_color? assets[0].display_color : assets[0].model.display_color,
              }}
            >
              <td
                className="cell"
                onClick={() =>
                  this.props.history.push(ROUTES.ASSETS + "/" + id)
                }
              >
                {display}
              </td>
            </tr>
          );

          assets.shift();
        }
      } else {
        currHeight++;

        rows.unshift(
          <tr className="rack-row">
            <td className="cell empty"></td>
          </tr>
        );
      }
    }

    return rows;
  }
  getUnitRows(rackResp: RackResponseObject) {
    const { height } = rackResp.rack;

    let maxHeight: number = +height;
    let unitBarRows = [];
    for (let i = 1; i <= maxHeight; i++) {
      unitBarRows.unshift(
        <tr className="rack-row" style={{ lineHeight: 1 }}>
          <td className="cell unit"> {i} </td>
        </tr>
      );
    }
    return unitBarRows;
  }
  private toaster: Toaster = {} as Toaster;
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };
  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleDelete = (letter: string, num: string) => {
    const body = {
      letter_start: letter,

      num_start: num,
    };

    axios
      .post(API_ROOT + "api/racks/delete", body, getHeaders(this.props.token))
      .then((res) => {
        this.setState({ isDeleteOpen: false });
      })
      .catch((err) => {
        this.handleDeleteCancel();
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER,
        });
      });
  };
  componentDidMount = () => {
    if (this.props.location.pathname === ROUTES.RACK_PRINT) {
      console.log(this.props.location);
      window.print();
    }
  };

  public render() {
    const racks =
      this.props.location.pathname === ROUTES.RACK_PRINT
        ? JSON.parse(localStorage.getItem("racks")!)
        : this.props.racks;
    if (this.props.location && this.props.location.state) {
      console.log(this.props.location);
    }

    return (
      <div className={Classes.DARK}>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        {this.props.loading ? (
          <Spinner
            className="center"
            intent="primary"
            size={Spinner.SIZE_STANDARD}
          />
        ) : (
          <div className="rack-container">
            {racks.map((rackResp: RackResponseObject) => {
              return (
                <span>
                  <div className="rack-parent">
                    {/* <div className="delete-rack">
                    <AnchorButton
                      minimal
                      intent="danger"
                      icon="trash"
                      text="Delete"
                      onClick={this.handleDeleteOpen}
                    />
                  </div> */}
                    <Alert
                      className={Classes.DARK}
                      cancelButtonText="Cancel"
                      confirmButtonText="Delete"
                      intent="danger"
                      isOpen={this.state.isDeleteOpen}
                      onCancel={this.handleDeleteCancel}
                      onConfirm={() =>
                        this.handleDelete(
                          rackResp.rack.row_letter,
                          rackResp.rack.rack_num
                        )
                      }
                    >
                      {" "}
                      <p>Are you sure you want to delete?</p>
                    </Alert>

                    <div className={Classes.DARK + " rack"}>
                      <table className="bp3-html-table loc-table">
                        <thead>
                          <tr>
                            <th className=" cell header"> (U)</th>
                          </tr>
                        </thead>
                        <tbody>{this.getUnitRows(rackResp)}</tbody>
                      </table>
                      <table className=" bp3-html-table bp3-interactive rack-table">
                        <thead>
                          <tr>
                            <th className=" cell header">
                              Rack {rackResp.rack.row_letter}
                              {rackResp.rack.rack_num}
                            </th>
                          </tr>
                        </thead>
                        <tbody>{this.getRows(rackResp)}</tbody>
                      </table>
                      <table className="bp3-html-table loc-table">
                        <thead>
                          <tr>
                            <th className=" cell header"> (U)</th>
                          </tr>
                        </thead>
                        <tbody>{this.getUnitRows(rackResp)}</tbody>
                      </table>
                    </div>
                  </div>
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }
}
const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin,
  };
};

export default connect(mapStatetoProps)(withRouter(RackView));
