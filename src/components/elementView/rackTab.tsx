import {
  Alert,
  AnchorButton,
  Button,
  Callout,
  FormGroup,
  Intent,
  IToastProps,
  MenuItem,
  Position,
  Toaster,
  Card,
  Classes,
} from "@blueprintjs/core";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import FormPopup from "../../forms/formPopup";
import {
  DatacenterSelect,
  filterDatacenter,
  FormTypes,
  renderDatacenterItem,
} from "../../forms/formUtils";
import { updateObject } from "../../store/utility";
import { API_ROOT } from "../../utils/api-config";
import {
  DatacenterObject,
  ElementType,
  RackRangeFields,
  RackResponseObject,
  getHeaders,
  ROUTES,
  ChangePlan,
} from "../../utils/utils";
import RackView from "./detailedView/rackView/rackView";
import { ALL_DATACENTERS } from "./elementTabContainer";
import RackSelectView from "./rackSelectView";
import { RouteComponentProps, withRouter } from "react-router";
import { Link } from "react-router-dom";
import { PermissionState } from "../../utils/permissionUtils";

interface RackTabState {
  isOpen: boolean;
  isDeleteOpen: boolean;
  deleteRackInfo: RackRangeFields;
  headers: any;
  isConfirmationOpen: boolean;
  racks: Array<RackResponseObject>;
  loading: boolean;
  selectedRackRange: RackRangeFields;
  viewAll: boolean;
  submitInProgress: boolean;
}
interface RackTabProps {
  token: string;
  isAdmin: boolean;
  datacenters: Array<DatacenterObject>;
  currDatacenter: DatacenterObject;
  onDatacenterSelect(datacenter: DatacenterObject): void;
  changePlan: ChangePlan;
  permissionState: PermissionState;
}
var console: any = {};
console.log = function () {};
class RackTab extends React.Component<
  RackTabProps & RouteComponentProps,
  RackTabState
> {
  state = {
    isOpen: false,
    isDeleteOpen: false,
    selectedRackRange: {} as RackRangeFields,
    deleteRackInfo: {} as RackRangeFields,
    headers: {},
    isConfirmationOpen: false,
    racks: [],
    loading: false,
    viewAll: false,
    submitInProgress: false,
  };
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
  private handleClose = () => this.setState({ isOpen: false });

  private handleConfirmationCancel = () =>
    this.setState({ isConfirmationOpen: false });
  private handleConfirmationOpen = () =>
    this.setState({ isConfirmationOpen: true });
  viewRackForm = (rack: RackRangeFields, headers: any, showError: boolean) => {
    this.setState({
      loading: true,
      selectedRackRange: rack,
    });
    let rack_datacenter = updateObject(rack, {
      datacenter: this.props.currDatacenter.id,
    });

      let config;
  if (!this.props.changePlan) {
    config = headers;
  } else {
    config = {
      headers: headers["headers"],
      params: {
        change_plan: this.props.changePlan.id,
      },
    };
  }

    return axios
      .post(API_ROOT + "api/racks/get", rack_datacenter, config)
      .then((res) => {
        this.setState({
          racks: res.data.racks,
          loading: false,
        });
      })
      .catch((err) => {
        this.setState({
          loading: false,
          racks: [],
        });
        if (showError) {
          this.addToast({
            message: err.response.data.failure_message,
            intent: Intent.DANGER,
          });
        }
      });
  };
  private handleOpen = () => {
    this.setState({
      isOpen: true,
    });
    console.log(this.state);
  };

  deleteRack = (rack: RackRangeFields, headers: any) => {
    const rack_new = updateObject(rack, {
      datacenter: this.props.currDatacenter.id,
    });
    this.setState({
      deleteRackInfo: rack_new,
      headers,
    });
    this.handleConfirmationOpen();
  };
  actuallyDelete = () => {
    this.setState({
      submitInProgress: true,
    });
    return axios
      .post(
        API_ROOT + "api/racks/delete",
        this.state.deleteRackInfo,
        this.state.headers
      )
      .then((res) => {
        this.addToast({
          message: res.data.success_message,
          intent: Intent.PRIMARY,
        });
        this.updateRackData(false);
        this.setState({
          isDeleteOpen: false,
          isConfirmationOpen: false,
          submitInProgress: false,
        });
      })
      .catch((err) => {
        console.log(err.response);
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER,
        });
        this.setState({
          isDeleteOpen: true,
          isConfirmationOpen: false,
          submitInProgress: false,
        });
      });
  };



  updateRackData = (showError: boolean) => {
    if (this.state.selectedRackRange.num_start) {
      this.viewRackForm(
        this.state.selectedRackRange,
        getHeaders(this.props.token),
        showError
      );
    } else if (this.state.viewAll) {
      this.getAllRacks(this.props.currDatacenter);
    }
  };

  componentWillReceiveProps(nextProps: RackTabProps) {
    if ((nextProps.currDatacenter !== this.props.currDatacenter) || (nextProps.changePlan !== this.props.changePlan)){
      this.setState({
        racks: [],
        selectedRackRange: {} as RackRangeFields,
      });
    }
  }
  createRack = (rack: RackRangeFields, headers: any) => {
    this.setState({
      submitInProgress: true,
    });
    const rack_new = updateObject(rack, {
      datacenter: this.props.currDatacenter.id,
    });
    return axios
      .post(API_ROOT + "api/racks/create", rack_new, headers)
      .then((res) => {
        this.setState({ isOpen: false, submitInProgress: false });
        this.updateRackData(true);
        this.addToast({
          message: res.data.success_message,
          intent: Intent.PRIMARY,
        });
      })
      .catch((err) => {
        this.setState({
          submitInProgress: false,
        });

        this.addErrorToast(err.response.data.failure_message);
      });
  };
  private addErrorToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.DANGER });
  };

  getAllRacks = (datacenter: DatacenterObject) => {
    this.setState({
      loading: true,
      viewAll: true,
    });
    let config;
    if (!this.props.changePlan){
      config = {
      headers: {
        Authorization: "Token " + this.props.token,
      },
      params: {
        datacenter: datacenter.id,
      },
    };
    }
    else{
      config = {
      headers: {
        Authorization: "Token " + this.props.token,
      },
      params: {
        datacenter: datacenter.id,
        change_plan: this.props.changePlan.id
      },
    };
    }


    axios
      .get(API_ROOT + "api/racks/get-all", config)
      .then((res) => {
        console.log("GOT RACKS", res.data, this.state.racks);
        this.setState({
          racks: res.data.racks,
          loading: false,
        });
      })
      .catch((err) => {
        console.log("failed to get racks");
        this.setState({
          loading: false,
          racks: [],
        });

        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER,
        });
      });
  };

  render() {
    return (
      <div className="rack-tab">
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        <div>
          <Callout>
            <FormGroup label="Datacenter" inline={true}>
              <DatacenterSelect
                popoverProps={{
                  minimal: true,
                  popoverClassName: "dropdown",
                  usePortal: true,
                }}
                items={this.props.datacenters!}
                onItemSelect={(datacenter: DatacenterObject) => {
                  this.props.onDatacenterSelect!(datacenter);
                }}
                itemRenderer={renderDatacenterItem}
                itemPredicate={filterDatacenter}
                noResults={<MenuItem disabled={true} text="No results." />}
              >
                <Button
                  rightIcon="caret-down"
                  text={
                    this.props.currDatacenter && this.props.currDatacenter.name
                      ? this.props.currDatacenter.name
                      : "All datacenters"
                  }
                />
              </DatacenterSelect>
            </FormGroup>
          </Callout>
        </div>

        <FormPopup
          {...this.props}
          loading={this.state.submitInProgress}
          type={FormTypes.CREATE}
          elementName={ElementType.RACK}
          submitForm={this.createRack}
          isOpen={this.state.isOpen}
          handleClose={this.handleClose}
        />
        <FormPopup
          {...this.props}
          loading={this.state.submitInProgress}
          type={FormTypes.DELETE}
          elementName={ElementType.RACK}
          submitForm={this.deleteRack}
          isOpen={this.state.isDeleteOpen}
          handleClose={this.handleDeleteCancel}
        />
        <Alert
          className={Classes.DARK}
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          intent="danger"
          isOpen={this.state.isConfirmationOpen}
          onCancel={this.handleConfirmationCancel}
          onConfirm={this.actuallyDelete}
        >
          <p>Are you sure you want to delete?</p>
        </Alert>
        {this.props.currDatacenter &&
        this.props.currDatacenter.name !== ALL_DATACENTERS.name ? (
          <div className="rack-tab-panel">
            {this.props.changePlan ? (
              <Callout
                intent={Intent.WARNING}
                title="Rack Management on a change plan"
              >
                <em>All changes made to racks will be live in the database </em>
              </Callout>
            ) : null}
            <div className=" element-tab-buttons">
              <AnchorButton
                className="add"
                text={"Add Rack(s)"}
                icon="add"
                minimal
                intent={Intent.PRIMARY}
                onClick={this.handleOpen}
                disabled={
                  !(
                    this.props.permissionState.admin ||
                    this.props.permissionState.asset_management ||
                    this.props.permissionState.site_permissions.includes(
                      +this.props.currDatacenter.id
                    )
                  )
                }
              />
              <AnchorButton
                className="add "
                text={"Delete Rack(s)"}
                icon="trash"
                minimal
                intent={Intent.DANGER}
                onClick={this.handleDeleteOpen}
                disabled={
                  !(
                    this.props.permissionState.admin ||
                    this.props.permissionState.asset_management ||
                    this.props.permissionState.site_permissions.includes(
                      +this.props.currDatacenter.id
                    )
                  )
                }
              />
            </div>

            <Card>
              <div className="rack-view-options">
                <Button
                  className="all-racks"
                  text="View All Racks"
                  onClick={(e: any) =>
                    this.getAllRacks(this.props.currDatacenter)
                  }
                />
                <p className="or">or </p>
                <RackSelectView
                  currDatacenter={this.props.currDatacenter}
                  submitForm={this.viewRackForm}
                />
              </div>
            </Card>
          </div>
        ) : (
          <Callout title="No Datacenter Selected">
            <em>Please select a datacenter to view rack information</em>
          </Callout>
        )}

        {this.state.racks.length !== 0 ? (
          <Link
            target="_blank"
            to={{ pathname: ROUTES.RACK_PRINT, state: this.state.racks }}
          >
            <Button
              className="print-racks"
              icon="print"
              text="Print Racks Page"
              onClick={(e: any) => {
                console.log("storing racks");
                localStorage.setItem("racks", JSON.stringify(this.state.racks));
              }}
            />
          </Link>
        ) : null}

        <div id="rack-view-print">
          <RackView racks={this.state.racks} loading={this.state.loading} />
        </div>
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
export default connect(mapStatetoProps)(withRouter(RackTab));
