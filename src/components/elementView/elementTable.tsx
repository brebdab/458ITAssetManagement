import {
  Alert,
  AnchorButton,
  Callout,
  Checkbox,
  Classes,
  Dialog,
  HTMLSelect,
  Icon,
  Intent,
  IToastProps,
  Position,
  Spinner,
  Toaster,
  Tooltip,
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import { IconNames } from "@blueprintjs/icons";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import FormPopup from "../../forms/formPopup";
import { FormTypes } from "../../forms/formUtils";
import { updateObject } from "../../store/utility";
import {
  AssetFieldsTable,
  AssetObject,
  AssetType,
  ChangePlan,
  DatacenterObject,
  ElementObjectType,
  ElementType,
  getChangePlanRowStyle,
  getHeaders,
  isAssetCPObject,
  isAssetObject,
  isChangePlanObject,
  isDatacenterObject,
  isModelObject,
  isObject,
  isRackObject,
  isRackRangeFields,
  isUserObject,
  ModelFieldsTable,
  MountTypes,
  RackRangeFields,
  ROUTES,
  SiteFieldsTable,
  SortFilterBody,
  TableType,
  UserFieldsTable,
  UserInfoObject,
} from "../../utils/utils";
import * as actions from "../../store/actions/state";
import DragDropList, { DragDropListTypes } from "./dragDropList";
import {
  DatetimeFilter,
  decommissionAsset,
  deleteAsset,
  deleteChangePlan,
  deleteDatacenter,
  deleteModel,
  deleteUser,
  ElementTableOpenAlert,
  FilterTypes,
  IFilter,
  ITableSort,
  modifyAsset,
  modifyChangePlan,
  modifyDatacenter,
  modifyModel,
  NumericFilter,
  PagingTypes,
  renderDatetimeFilterItem,
  renderNumericFilterItem,
  renderRackRangeFilterItem,
  renderTextFilterItem,
  TextFilter,
} from "./elementUtils";
import "./elementView.scss";
import FilterSelect from "./filterSelect";
import { PowerView } from "./powerView/powerView";
import "./powerView/powerView.scss";
import { isNullOrUndefined } from "util";
import { PermissionState } from "../../utils/permissionUtils";
import axios from "axios";
import { API_ROOT } from "../../utils/api-config";
import { BladePowerView } from "./powerView/bladePowerView";

interface ElementTableState {
  items: Array<ElementObjectType>;
  sort_by: Array<ITableSort>;
  filters: Array<IFilter>;
  sorted_cols: Array<string>;
  curr_page: number;
  total_pages: number;
  page_type: PagingTypes;
  fields: Array<string>;
  isEditFormOpen: boolean;
  editFormValues: ElementObjectType;
  openAlert: ElementTableOpenAlert;
  selected_userid?: string;
  isPowerOptionsOpen: boolean;
  assetPower?: AssetObject;
  getDataInProgress: boolean;
  selected: Array<string>;
  selectedAll: boolean;
  editUserFormOpen: boolean;
  username?: string;
}

interface ElementTableProps {
  isDecommissioned: boolean; // TODO: remove this and use assetType instead
  callback?: Function;
  updateBarcodes?: Function;
  type: ElementType;
  assetType?: AssetType;
  token: string;
  disableSorting?: boolean;
  disableFiltering?: boolean;
  currDatacenter?: DatacenterObject;
  datacenters?: Array<DatacenterObject>;
  permissionState: PermissionState;
  getData?(
    type: string,
    page_num: number,
    page_type: PagingTypes,
    body: SortFilterBody,
    token: string
  ): Promise<Array<ElementObjectType>>;

  getFieldNames?(type: string, headers: any): Promise<Array<string>>;
  getPages?(
    type: string,
    page_size: PagingTypes,
    filters: Array<IFilter>,
    token: string
  ): Promise<number>;
  data?: Array<ElementObjectType>;
  shouldUpdateData?: boolean;
  isAdmin: boolean;
  updateDatacenters?(): void;
  updateChangePlans(status: boolean): void;
  changePlan: ChangePlan;
  markTableFresh(freshTable: TableType): void;
  markTablesStale(staleTables: TableType[]): void;
  rackedAssetDataIsStale: boolean;
  storedAssetDataIsStale: boolean;
  decommissionedAssetDataIsStale: boolean;
  modelDataIsStale: boolean;
}

class ElementTable extends React.Component<
  ElementTableProps & RouteComponentProps,
  ElementTableState
> {
  public state: ElementTableState = {
    page_type: 10,
    filters: [],
    sort_by: [],
    items: [],
    sorted_cols: [],
    curr_page: 1,
    total_pages: 0,
    fields: [],
    isEditFormOpen: false,
    editFormValues: {} as ElementObjectType,
    openAlert: ElementTableOpenAlert.NONE,
    selected_userid: undefined,
    isPowerOptionsOpen: false,
    getDataInProgress: false,
    selected: [],
    selectedAll: false,
    editUserFormOpen: false,
    username: undefined,
  };
  validRequestMadeWithToken = false;

  //PAGING LOGIC
  resetPage = () => {
    this.setState({
      curr_page: 1,
    });
  };
  previousPage = () => {
    if (this.state.curr_page > 1 && this.props.getData) {
      const next_page = this.state.curr_page - 1;
      this.setState({
        curr_page: next_page,
      });
      this.updatePageData(this.state.page_type, next_page);
    }
  };
  nextPage = () => {
    if (this.state.curr_page < this.state.total_pages && this.props.getData) {
      const next_page = this.state.curr_page + 1;
      this.setState({
        curr_page: next_page,
      });
      this.updatePageData(this.state.page_type, next_page);
    }
  };
  componentWillReceiveProps(
    nextProps: ElementTableProps & RouteComponentProps
  ) {
    if (nextProps.currDatacenter !== this.props.currDatacenter) {
      this.setState({
        curr_page: 1,
      });
      this.updatePageData(this.state.page_type, 1);
    }
    if (nextProps.token !== this.props.token) {
      this.updateTableData();
    }

    if (nextProps.data !== this.props.data) {
      this.setFieldNamesFromData(nextProps.data!);

      if (nextProps.data) {
        this.setState({
          items: nextProps.data,
        });
      }
    }
  }

  handlePagingChange = (page: PagingTypes) => {
    this.setState({
      page_type: page,
      curr_page: 1,
    });
    this.updatePageData(page, 1);
  };
  // FILTERING AND SORTING DISPLAY

  getScrollIcon = (field: string) => {
    return this.props.disableSorting ? null : (
      <Icon
        className="icon"
        icon={IconNames.DOUBLE_CARET_VERTICAL}
        iconSize={Icon.SIZE_STANDARD}
        onClick={() => this.handleSort(field)}
      />
    );
  };
  renderFilterItem = (item: IFilter) => {
    let display;
    if (item.filter_type === FilterTypes.TEXT) {
      display = renderTextFilterItem(item.filter! as TextFilter);
    } else if (item.filter_type === FilterTypes.NUMERIC) {
      display = renderNumericFilterItem(item.filter! as NumericFilter);
    } else if (item.filter_type === FilterTypes.RACKRANGE) {
      display = renderRackRangeFilterItem(item.filter as RackRangeFields);
    } else if (item.filter_type === FilterTypes.DATETIME) {
      display = renderDatetimeFilterItem(item.filter as DatetimeFilter);
    }
    let field = item.field;
    if (this.props.type === ElementType.ASSET) {
      field = AssetFieldsTable[item.field];
    } else if (this.props.type === ElementType.MODEL) {
      field = ModelFieldsTable[item.field];
    } else if (this.props.type === ElementType.USER) {
      field = UserFieldsTable[item.field];
    } else if (
      this.props.type === ElementType.DATACENTER ||
      this.props.type === ElementType.OFFLINE_STORAGE_SITE
    ) {
      field = SiteFieldsTable[item.field];
    }
    return (
      <div className="drag-drop-text">
        <span>{`${field} ${display}
      `}</span>

        <span>
          <Icon
            className="icon"
            icon={IconNames.DELETE}
            iconSize={Icon.SIZE_STANDARD}
            onClick={() => this.removeFilterItem(item)}
          />
        </span>
      </div>
    );
  };

  renderSortItem = (item: ITableSort) => {
    return (
      <div className="drag-drop-text ">
        <span>
          <Icon
            className="icon"
            icon={IconNames.DRAG_HANDLE_VERTICAL}
            iconSize={Icon.SIZE_STANDARD}
          />
        </span>
        <span>{`${item.field} by ${
          item.ascending ? "ascending" : "descending"
        }`}</span>

        <span>
          <Icon
            className="icon"
            icon={IconNames.DELETE}
            iconSize={Icon.SIZE_STANDARD}
            onClick={() => this.removeSortItem(item.field)}
          />
        </span>
      </div>
    );
  };

  // SORTING AND FILTERING LOGIC
  updateSortOrder = (items: Array<ITableSort>) => {
    this.setState({
      sort_by: items,
    });
    this.updateSortData(items);
  };

  removeSortItem = (field: string) => {
    let sorts = this.state.sort_by;
    let sorted_cols = this.state.sorted_cols;
    const index = sorted_cols.indexOf(field, 0);
    if (index > -1) {
      sorted_cols.splice(index, 1);
    }
    sorts = sorts.filter((item) => {
      return item.field !== field;
    });
    this.setState({
      sort_by: sorts,
      sorted_cols,
    });
    this.updateSortData(sorts);
  };
  removeFilterItem = (filter: IFilter) => {
    const filters = this.state.filters.filter((item) => {
      return JSON.stringify(item) !== JSON.stringify(filter);
    });
    this.setState({
      filters,
    });
    this.updateFilterData(filters);
  };

  handleSort(field: string) {
    let ascending;
    let sorts = this.state.sort_by;

    const sorted_cols = this.state.sorted_cols;
    if (this.state.sorted_cols.includes(field)) {
      ascending = !this.state.sort_by.find((item) => item.field === field)!
        .ascending;
      sorts = sorts.filter((item) => {
        return item.field !== field;
      });
      this.setState({
        sort_by: sorts,
      });
    } else {
      ascending = true;
      sorted_cols.push(field);
    }

    sorts.push({
      field,
      ascending,
      id: field,
    });
    this.setState({
      sort_by: sorts,
      sorted_cols,
    });
    this.updateSortData(sorts);
  }

  addFilter = (filter: IFilter) => {
    const filters_copy = this.state.filters.slice();

    if (isRackRangeFields(filter.filter)) {
      if (this.props.currDatacenter && this.props.currDatacenter.id !== "") {
        let filter_datacenter = updateObject(filter.filter, {
          datacenter: this.props.currDatacenter!.id,
        });
        filter = updateObject(filter, { filter: filter_datacenter });
      }
    }
    filters_copy.push(filter);
    let resp = this.updateFilterData(filters_copy);
    if (resp) {
      resp
        .then((res) => {
          this.setState({
            filters: filters_copy,
          });
        })
        .catch((err) => {});
    }
  };

  updateFilterData = (items: Array<IFilter>) => {
    let resp;
    if (this.props.callback! !== undefined) this.props.callback(items);
    this.resetPage();

    if (this.props.getPages) {
      this.props
        .getPages(
          this.props.type,
          this.state.page_type,
          items,
          this.props.token
        )
        .then((res) => {
          this.setState({
            total_pages: res,
          });
        });
    }
    if (this.props.getData) {
      this.setState({ getDataInProgress: true });
      resp = this.props.getData!(
        this.props.type,
        1,
        this.state.page_type,
        { sort_by: this.state.sort_by, filters: items },
        this.props.token
      );
      resp
        .then((res) => {
          this.setState({ getDataInProgress: false });
          this.setState({
            items: res,
          });
          if (res.length === 0) {
            this.setState({
              curr_page: 0,
            });
          }
        })
        .catch((err) => {
          this.setState({ getDataInProgress: false });
          this.addToast({
            message: err.response.data.failure_message,
            intent: Intent.DANGER,
          });
        });
    }
    return resp;
  };

  updatePageData = (page: PagingTypes, page_num: number) => {
    if (this.props.getData) {
      this.setState({
        getDataInProgress: true,
      });
      this.props.getData!(
        this.props.type,
        page_num,
        page,
        { sort_by: this.state.sort_by, filters: this.state.filters },
        this.props.token
      )
        .then((res) => {
          this.setState({
            items: res,
            getDataInProgress: false,
          });
        })
        .catch((err) => {
          this.addToast({
            message: err.response.data.failure_message,
            intent: Intent.DANGER,
          });
          this.setState({
            getDataInProgress: false,
          });
        });
    }
    if (this.props.getPages) {
      this.props
        .getPages(this.props.type, page, this.state.filters, this.props.token)
        .then((res) => {
          this.setState({
            total_pages: res,
          });
        });
    }
  };
  updateSortData = (items: Array<ITableSort>) => {
    if (this.props.getData) {
      this.setState({
        getDataInProgress: true,
      });
      this.props.getData!(
        this.props.type,
        this.state.curr_page,
        this.state.page_type,
        { sort_by: items, filters: this.state.filters },
        this.props.token
      )
        .then((res) => {
          this.setState({
            items: res,
            getDataInProgress: false,
          });
        })
        .catch(() => {
          this.setState({
            getDataInProgress: false,
          });
        });
    }
  };

  //TOASTS
  private toaster: Toaster = {} as Toaster;
  private addToast = (toast: IToastProps) => {
    toast.timeout = 5000;
    this.toaster.show(toast);
  };
  private addSuccessToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  };
  private addWarnToast = (message: string) => {
    this.addToast({
      message: message,
      intent: Intent.WARNING,
      action: {
        onClick: () => this.setState({ isEditFormOpen: true }),
        text: "Edit values",
      },
    });
  };
  private addErrorToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.DANGER });
  };

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  componentDidUpdate() {
    let dataIsStale =
      (this.props.rackedAssetDataIsStale &&
        this.props.type === ElementType.ASSET &&
        this.props.assetType === AssetType.RACKED) ||
      (this.props.storedAssetDataIsStale &&
        this.props.type === ElementType.ASSET &&
        this.props.assetType === AssetType.STORED) ||
      (this.props.decommissionedAssetDataIsStale &&
        this.props.type === ElementType.ASSET &&
        this.props.assetType === AssetType.DECOMMISSIONED) ||
      (this.props.modelDataIsStale && this.props.type === ElementType.MODEL);
    if (dataIsStale || (this.props.shouldUpdateData && !this.props.data)) {
      this.updateTableData();
    }
    if (this.props.token && !this.validRequestMadeWithToken) {
      this.updateTableData();
      this.validRequestMadeWithToken = true;
    }
  }
  componentDidMount() {
    if (this.props.data) {
      this.setState({
        items: this.props.data,
      });
      this.setFieldNames();
    } else {
      this.updateTableData();
    }
    this.getUsername(this.props.token);
  }

  updateTableData = () => {
    if (this.props.getData && this.props.token) {
      this.setState({
        getDataInProgress: true,
      });
      this.props
        .getData(
          this.props.type,
          this.state.curr_page,
          this.state.page_type,
          { sort_by: this.state.sort_by, filters: this.state.filters },
          this.props.token
        )
        .then((res) => {
          this.validRequestMadeWithToken = true;

          this.setState({
            items: res,
            getDataInProgress: false,
          });
          this.setFieldNames();
        })
        .catch((err) => {
          this.setState({
            getDataInProgress: false,
          });
        });
    }
    if (this.props.getPages) {
      this.props
        .getPages(
          this.props.type,
          this.state.page_type,
          this.state.filters,
          this.props.token
        )
        .then((res) => {
          this.setState({
            total_pages: res,
          });
        });
    }
    let tableType =
      this.props.type === ElementType.MODEL
        ? TableType.MODELS
        : this.props.type === ElementType.ASSET &&
          this.props.assetType === AssetType.RACKED
        ? TableType.RACKED_ASSETS
        : this.props.type === ElementType.ASSET &&
          this.props.assetType === AssetType.STORED
        ? TableType.STORED_ASSETS
        : this.props.type === ElementType.ASSET &&
          this.props.assetType === AssetType.DECOMMISSIONED
        ? TableType.DECOMMISSIONED_ASSETS
        : null;
    if (tableType) {
      this.props.markTableFresh(tableType);
    }
  };

  setFieldNamesFromData = (items: Array<ElementObjectType>) => {
    let fields: Array<string> = [];
    if (items.length > 0) {
      Object.keys(items[0]).forEach((col: string) => {
        if (col === "model") {
          fields.push("model__vendor");
          fields.push("model__model_number");
        }
        else if (col ==="chassis"){
          fields.push("chassis__hostname")}
        else if (
          col !== "id" &&
          col !== "decommissioned_id" &&
          col !== "network_ports" &&
          col !== "comment" &&
          col !== "power_connections" &&
          col !== "mac_addresses" &&
          col !== "network_connections" &&
          col !== "network_graph" &&
          col !== "is_admin" &&
          col !== "is_storage" &&
          !(
            col === "offline_storage_site" &&
            this.props.assetType === AssetType.RACKED
          ) &&
          !(
            (col === "datacenter" ||
              col === "rack" ||
              col === "rack_position") &&
            this.props.assetType === AssetType.STORED
          )
        ) {
          fields.push(col);
        }
      });
    }

    this.setState({
      fields: fields,
    });
  };
  setFieldNames = () => {
    if (this.state.items && this.state.items.length > 0) {
      this.setFieldNamesFromData(this.state.items);
    }
  };

  //EDIT AND DELETE LOGIC
  handleInlineButtonClick = (data: ElementObjectType) => {
    if (
      isAssetObject(data) ||
      isModelObject(data) ||
      isDatacenterObject(data) ||
      isChangePlanObject(data) ||
      isUserObject(data)
    ) {
      this.setState({
        editFormValues: data,
      });
    }
  };

  // BUTTONZ
  shouldShowPowerInline = (item: ElementObjectType) => {
    return (
      isAssetObject(item) &&
      this.props.assetType === AssetType.RACKED &&
      ((item.rack && item.rack.is_network_controlled) ||
        (item.chassis &&
          item.chassis.hostname &&
          item.chassis.model.vendor === "BMI"))
    );
  };

  shouldDisablePowerInline = () => {
    return !!this.props.changePlan;
  };

  shouldDisableDecommissionOrDeleteInline = (item: ElementObjectType) => {
    return (this.props.changePlan && this.props.type !== ElementType.ASSET) ||
      (this.props.type === ElementType.USER &&
        isUserObject(item) &&
        item.username === this.state.username) ||
      (this.props.type === ElementType.CHANGEPLANS &&
        isChangePlanObject(item) &&
        item.execution_time)
      ? true
      : !(
          this.props.permissionState.admin ||
          (this.props.type === ElementType.DATACENTER &&
            this.props.permissionState.asset_management) ||
          (this.props.type === ElementType.OFFLINE_STORAGE_SITE &&
            this.props.permissionState.asset_management) ||
          (this.props.type === ElementType.MODEL &&
            this.props.permissionState.model_management) ||
          (this.props.type === ElementType.ASSET &&
            this.props.permissionState.asset_management) ||
          (this.props.type === ElementType.ASSET &&
            isAssetObject(item) &&
            ((item.datacenter &&
              this.props.permissionState.site_permissions.includes(
                +item.datacenter.id
              )) ||
              (item.offline_storage_site &&
                this.props.permissionState.site_permissions.includes(
                  +item.offline_storage_site.id
                )))) ||
          (this.props.type === ElementType.CHANGEPLANS &&
            (this.props.permissionState.asset_management ||
              this.props.permissionState.site_permissions.length > 0))
        );
  };

  //EDIT LOGIC
  handleEditFormClose = () => this.setState({ isEditFormOpen: false });
  getEditForm = () => {
    return (
      <FormPopup
        {...this.props}
        isOpen={this.state.isEditFormOpen}
        initialValues={this.state.editFormValues}
        type={FormTypes.MODIFY}
        elementName={this.props.type}
        handleClose={this.handleEditFormClose}
        submitForm={this.getSubmitFormFunction(FormTypes.MODIFY)}
      />
    );
  };

  getUserEditForm = () => {
    return (
      <FormPopup
        {...this.props}
        isOpen={this.state.editUserFormOpen}
        userId={this.state.selected_userid}
        initialValues={this.state.editFormValues}
        type={FormTypes.MODIFY}
        elementName={this.props.type}
        handleClose={() => {
          this.setState({ editUserFormOpen: false });
        }}
        submitForm={() => {
          this.setState({ editUserFormOpen: false });
          this.successfulModification("User permissions successfully updated");
        }}
        // submitForm={this.getSubmitFormFunction(FormTypes.MODIFY)}
      />
    );
  };

  // POWER LOGIC
  getPowerOptions = () => {
    return (
      <Dialog
        className={Classes.DARK + " power-dialog"}
        {...this.props}
        isOpen={this.state.isPowerOptionsOpen}
        onClose={() => {
          this.setState({ isPowerOptionsOpen: false });
        }}
      >
        {this.state.assetPower &&
        this.state.assetPower.model &&
        this.state.assetPower.model.model_type === MountTypes.BLADE ? (
          <BladePowerView
            {...this.props}
            callback={() => {
              this.setState({ isPowerOptionsOpen: false });
            }}
            asset={this.state.assetPower}
            shouldUpdate={false}
            updated={() => {}}
            assetIsDecommissioned={this.props.isDecommissioned}
          />
        ) : (
          <PowerView
            {...this.props}
            callback={() => {
              this.setState({ isPowerOptionsOpen: false });
            }}
            asset={this.state.assetPower}
            shouldUpdate={false}
            updated={() => {}}
            assetIsDecommissioned={this.props.isDecommissioned}
          />
        )}
      </Dialog>
    );
  };

  successfulModification(message: string) {
    this.updateTableData();
    this.handleEditFormClose();
    this.addSuccessToast(message);
  }
  successfulModifcationWithWarning = (warning: string) => {
    this.updateTableData();
    this.handleEditFormClose();
    this.addWarnToast(warning);
  };
  handleEditFormSubmit = (values: ElementObjectType, headers: any) => {
    if (isModelObject(values)) {
      return modifyModel(values, headers).then((res) => {
        this.successfulModification(res.data.success_message);
        this.props.markTablesStale([
          TableType.RACKED_ASSETS,
          TableType.STORED_ASSETS,
          TableType.MODELS,
        ]);
      });
    } else if (isAssetObject(values)) {
      return modifyAsset(values, headers, this.props.changePlan).then((res) => {
        if (res.data.warning_message) {
          this.successfulModifcationWithWarning(res.data.warning_message);
        } else {
          this.successfulModification(res.data.success_message);
        }
        this.props.markTablesStale([
          TableType.RACKED_ASSETS,
          TableType.STORED_ASSETS,
        ]);
      });
    } else if (isChangePlanObject(values)) {
      return modifyChangePlan(values, headers).then((res) => {
        this.props.updateChangePlans(true);
        this.successfulModification(res.data.success_message);
      });
    } else if (isDatacenterObject(values)) {
      return modifyDatacenter(values, headers).then((res) => {
        this.successfulModification(res.data.success_message);
        if (this.props.updateDatacenters) {
          this.props.updateDatacenters();
        }
        this.props.markTablesStale([TableType.RACKED_ASSETS]);
      });
    }
  };

  handleEditFormOpen = () => {
    this.setState({
      isEditFormOpen: true,
    });
  };

  getSubmitFormFunction = (type: FormTypes) => {
    let submitForm;
    submitForm = this.handleEditFormSubmit;
    return submitForm;
  };
  handleEditButtonClick = (data: ElementObjectType) => {
    this.handleInlineButtonClick(data);
    this.handleEditFormOpen();
  };

  //DELETE LOGIC
  private shouldShowColumn = (item: any, col: string) => {
    if (isAssetObject(item)) {
      return (
        AssetFieldsTable[col] &&
        col !== "comment" &&
        !(
          col === "offline_storage_site" &&
          this.props.assetType === AssetType.RACKED
        ) &&
        !(
          (col === "datacenter" || col === "rack" || col === "rack_position") &&
          this.props.assetType === AssetType.STORED
        )
      );
    }
    return (
      col !== "id" &&
      col !== "network_ports" &&
      col !== "comment" &&
      col !== "is_admin" &&
      col !== "decommissioned_id" &&
      col !== "is_storage" &&
      !isObject(item[col])
    );
  };
  private handleDeleteOpen = () =>
    this.setState({ openAlert: ElementTableOpenAlert.DELETE });
  private handleDeleteCancel = () =>
    this.setState({ openAlert: ElementTableOpenAlert.NONE });

  private handleDecommissionOpen = () =>
    this.setState({ openAlert: ElementTableOpenAlert.DECOMMISSION });
  private handleDecommissionCancel = () =>
    this.setState({ openAlert: ElementTableOpenAlert.NONE });

  private handleDelete = () => {
    let resp;
    if (isModelObject(this.state.editFormValues)) {
      resp = deleteModel(
        this.state.editFormValues,
        getHeaders(this.props.token)
      );
    } else if (isAssetObject(this.state.editFormValues)) {
      resp = deleteAsset(
        this.state.editFormValues,
        getHeaders(this.props.token)
      );
    } else if (isDatacenterObject(this.state.editFormValues)) {
      resp = deleteDatacenter(
        this.state.editFormValues,
        getHeaders(this.props.token)
      );
    } else if (isUserObject(this.state.editFormValues)) {
      resp = deleteUser(
        this.state.editFormValues,
        getHeaders(this.props.token)
      );
    } else if (isChangePlanObject(this.state.editFormValues)) {
      resp = deleteChangePlan(
        this.state.editFormValues,
        getHeaders(this.props.token)
      );
    }
    if (resp) {
      resp
        .then((res) => {
          this.addSuccessToast(res.data.success_message);
          this.updateTableData();
          this.handleDeleteCancel();
          if (this.props.updateDatacenters) {
            this.props.updateDatacenters();
          }
          if (this.props.type === ElementType.CHANGEPLANS) {
            this.props.updateChangePlans(true);
          }
          if (isModelObject(this.state.editFormValues)) {
            this.props.markTablesStale([TableType.MODELS]);
          }
          if (isUserObject(this.state.editFormValues)) {
            this.props.markTablesStale([
              TableType.RACKED_ASSETS,
              TableType.STORED_ASSETS,
            ]);
          }
        })
        .catch((err) => {
          this.addErrorToast(err.response.data.failure_message);
          this.handleDeleteCancel();
        });
    }
  };

  private handleDecommission = () => {
    let resp;
    if (isAssetObject(this.state.editFormValues)) {
      resp = decommissionAsset(
        this.state.editFormValues,
        getHeaders(this.props.token),
        this.props.changePlan
      );
    }
    if (resp) {
      resp
        .then((res) => {
          this.addSuccessToast(res.data.success_message);
          this.updateTableData();
          this.handleDecommissionCancel();
          if (this.props.updateDatacenters) {
            this.props.updateDatacenters();
          }
          this.props.markTablesStale([
            TableType.RACKED_ASSETS,
            TableType.STORED_ASSETS,
            TableType.DECOMMISSIONED_ASSETS,
          ]);
        })
        .catch((err) => {
          this.addErrorToast(err.response.data.failure_message);
          this.handleDecommissionCancel();
        });
    }
  };

  handleDeleteButtonClick = (data: ElementObjectType) => {
    this.handleInlineButtonClick(data);
    this.handleDeleteOpen();
  };

  handleDecommissionButtonClick = (data: ElementObjectType) => {
    this.handleInlineButtonClick(data);
    this.handleDecommissionOpen();
  };

  handlePowerButtonClick = (data: ElementObjectType) => {
    if (isAssetObject(data)) {
      this.setState({
        isPowerOptionsOpen: true,
        assetPower: data,
      });
    }
  };

  // PERMISSIONS
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

  renderPermissionsButton = (item: UserInfoObject) => {
    return (
      <Tooltip
        content={
          !(!!this.props.changePlan || item.username === this.state.username)
            ? "Edit permissions"
            : item.username === this.state.username
            ? "Cannot edit your own user permissions"
            : "Cannot edit within change plan"
        }
        position={Position.LEFT}
      >
        <AnchorButton
          className="button-table"
          intent="primary"
          icon="shield"
          minimal
          onClick={() => {
            this.setState({
              editUserFormOpen: true,
              selected_userid: item.id,
              isEditFormOpen: false,
            });
          }}
          disabled={
            !!this.props.changePlan || item.username === this.state.username
          }
        />
      </Tooltip>
    );
  };

  routeToDetailView(item: ElementObjectType) {
    if (isAssetCPObject(item) && item.related_asset) {
      this.props.history.push(
        ROUTES.DASHBOARD + "/" + this.props.type + "/" + item.related_asset.id
      );
    } else {
      this.props.history.push(
        ROUTES.DASHBOARD + "/" + this.props.type + "/" + item.id
      );
    }
  }

  render() {
    if (
      this.props.data &&
      this.props.data.length !== 0 &&
      this.state.items.length === 0
    ) {
      this.setState({
        items: this.props.data,
      });

      this.setFieldNamesFromData(this.props.data);
    }

    return (
      <div className="tab-panel">
        {this.getEditForm()}
        {this.getUserEditForm()}
        {this.getPowerOptions()}
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Delete"
          intent="danger"
          isOpen={this.state.openAlert === ElementTableOpenAlert.DELETE}
          onCancel={this.handleDeleteCancel}
          onConfirm={this.handleDelete}
        >
          <p>Are you sure you want to delete?</p>
        </Alert>
        <Alert
          cancelButtonText="Cancel"
          confirmButtonText="Decommission"
          intent="danger"
          isOpen={this.state.openAlert === ElementTableOpenAlert.DECOMMISSION}
          onCancel={this.handleDecommissionCancel}
          onConfirm={this.handleDecommission}
        >
          <p>
            Are you sure you want to decommission this asset? If it's a chassis,
            its blades will also be decommissioned.
          </p>
        </Alert>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />

        <div className="filter-sort-panel">
          {this.props.disableFiltering
            ? null
            : [
                <div className="filter-select">
                  <FilterSelect
                    handleAddFilter={this.addFilter}
                    fields={this.state.fields}
                  />
                </div>,
                <div className="table-options">
                  <DragDropList
                    type={DragDropListTypes.FILTER}
                    items={this.state.filters}
                    renderItem={this.renderFilterItem}
                  />
                </div>,
              ]}
          {this.props.disableSorting ? null : (
            <div className="table-options">
              <DragDropList
                type={DragDropListTypes.SORT}
                items={this.state.sort_by}
                renderItem={this.renderSortItem}
                onChange={this.updateSortOrder}
              />
            </div>
          )}

          {this.props.getPages ? (
            <div className="table-control">
              <HTMLSelect
                onChange={(e: any) => this.handlePagingChange(e.target.value)}
              >
                {" "}
                <option> {PagingTypes.TEN}</option>
                <option>{PagingTypes.FIFTY}</option>
                <option>{PagingTypes.ALL}</option>
              </HTMLSelect>
              {this.state.page_type !== PagingTypes.ALL
                ? [
                    <span>
                      <Icon
                        className="icon"
                        icon={IconNames.CARET_LEFT}
                        iconSize={Icon.SIZE_LARGE}
                        onClick={() => this.previousPage()}
                      />
                    </span>,
                    <span>
                      page {this.state.curr_page} of {this.state.total_pages}
                    </span>,
                    <span>
                      <Icon
                        className="icon"
                        icon={IconNames.CARET_RIGHT}
                        iconSize={Icon.SIZE_LARGE}
                        onClick={() => this.nextPage()}
                      />
                    </span>,
                  ]
                : null}
            </div>
          ) : null}
        </div>
        <div className="table-wrapper">
          <table
            className={
              this.props.type !== ElementType.DATACENTER &&
              this.props.type !== ElementType.OFFLINE_STORAGE_SITE &&
              this.props.type !== ElementType.USER
                ? "bp3-html-table bp3-interactive bp3-html-table-striped bp3-html-table-bordered element-table"
                : "bp3-html-table bp3-html-table-striped bp3-html-table-bordered element-table"
            }
          >
            <thead>
              <tr>
                {this.props.type === ElementType.ASSET &&
                this.state.fields &&
                (isNullOrUndefined(this.props.data) ||
                  this.props.data.length === 0) &&
                this.state.fields.length > 0 ? (
                  <th className="header-cell">
                    <div className="header-text">
                      {this.props.isDecommissioned ? null : (
                        <Checkbox
                          checked={this.state.selectedAll}
                          onClick={(event: any) => {
                            const selected = this.state.selected;
                            const selectedAll = !this.state.selectedAll;
                            this.state.items.forEach((item) => {
                              if (isAssetObject(item) && item.asset_number) {
                                if (
                                  selected.includes(item.asset_number) &&
                                  !selectedAll
                                ) {
                                  selected.splice(
                                    selected.indexOf(item.asset_number),
                                    1
                                  );
                                } else if (
                                  !selected.includes(item.asset_number) &&
                                  selectedAll
                                ) {
                                  selected.push(item.asset_number);
                                }
                              }
                            });

                            this.setState({
                              selectedAll,
                              selected,
                            });
                            if (this.props.updateBarcodes) {
                              this.props.updateBarcodes(this.state.selected);
                            }
                          }}
                        />
                      )}
                    </div>
                  </th>
                ) : null}
                {this.state.fields.map((col: string) => {
                  if (col === "model") {
                    return [
                      <th className="header-cell">
                        <div className="header-text">
                          <span>model vendor</span>
                          {this.getScrollIcon("model__vendor")}
                        </div>
                      </th>,
                      <th className="header-cell">
                        <div className="header-text">
                          <span>model number</span>
                          {this.getScrollIcon("model__model_number")}
                        </div>
                      </th>,
                    ];
                  }
                  else if (col==="chassis"){
                    return                     <th className="header-cell">
                        <div className="header-text">
                          <span>Chassis</span>
                          {this.getScrollIcon("chassis__hostname")}
                        </div>
                      </th>
                  }
                  else if (this.props.type === ElementType.ASSET) {
                    if (AssetFieldsTable[col]) {
                      return (
                        <th className="header-cell">
                          <div className="header-text">
                            <span>{AssetFieldsTable[col]}</span>
                            {this.getScrollIcon(col)}
                          </div>
                        </th>
                      );
                    }
                    return null;
                  } else if (this.props.type === ElementType.MODEL) {
                    return (
                      <th className="header-cell">
                        <div className="header-text">
                          <span>{ModelFieldsTable[col]}</span>
                          {this.getScrollIcon(col)}
                        </div>
                      </th>
                    );
                  } else if (this.props.type === ElementType.USER) {
                    return (
                      <th className="header-cell">
                        <div className="header-text">
                          <span>{UserFieldsTable[col]}</span>
                          {this.getScrollIcon(col)}
                        </div>
                      </th>
                    );
                  } else if (
                    this.props.type === ElementType.DATACENTER ||
                    this.props.type === ElementType.OFFLINE_STORAGE_SITE
                  ) {
                    return (
                      <th className="header-cell">
                        <div className="header-text">
                          <span>{SiteFieldsTable[col]}</span>
                          {this.getScrollIcon(col)}
                        </div>
                      </th>
                    );
                  } else {
                    return (
                      <th className="header-cell">
                        <div className="header-text">
                          <span>{col}</span>
                          {this.getScrollIcon(col)}
                        </div>
                      </th>
                    );
                  }
                })}
                <th></th>
              </tr>
            </thead>

            {
              this.state.items && this.state.items.length > 0 ? (
                !this.state.getDataInProgress ? (
                  <tbody>
                    {this.state.items.map((item: ElementObjectType) => {
                      return (
                        <tr
                          key={item.id}
                          onClick={
                            this.props.type === ElementType.DATACENTER ||
                            this.props.type ===
                              ElementType.OFFLINE_STORAGE_SITE ||
                            this.props.type === ElementType.USER
                              ? () => {}
                              : () => {
                                  this.routeToDetailView(item);
                                }
                          }
                          style={getChangePlanRowStyle(item)}
                        >
                          {this.props.type === ElementType.ASSET &&
                          isAssetObject(item) &&
                          (isNullOrUndefined(this.props.data) ||
                            this.props.data.length === 0) ? (
                            <th
                              onClick={(event: any) => {
                                event.stopPropagation();
                              }}
                            >
                              {this.props.isDecommissioned ? null : (
                                <Checkbox
                                  disabled={isNullOrUndefined(
                                    item.asset_number
                                  )}
                                  checked={
                                    item.asset_number
                                      ? this.state.selected.includes(
                                          item.asset_number
                                        )
                                      : false
                                  }
                                  onClick={(event: any) => {
                                    const selected = this.state.selected;
                                    if (
                                      item.asset_number &&
                                      selected.includes(item.asset_number)
                                    ) {
                                      if (this.state.selectedAll) {
                                        this.setState({
                                          selectedAll: false,
                                        });
                                      }
                                      selected.splice(
                                        selected.indexOf(item.asset_number),
                                        1
                                      );
                                    } else if (item.asset_number) {
                                      selected.push(item.asset_number);
                                    }
                                    this.setState({
                                      selected,
                                    });
                                    if (this.props.updateBarcodes) {
                                      this.props.updateBarcodes(
                                        this.state.selected
                                      );
                                    }

                                    event.stopPropagation();
                                  }}
                                />
                              )}
                            </th>
                          ) : null}
                          {Object.entries(item).map(([col, value]) => {
                            if (isModelObject(value)) {
                              return [
                                <td style={getChangePlanRowStyle(item)}>
                                  {value.vendor}
                                </td>,
                                <td style={getChangePlanRowStyle(item)}>
                                  {value.model_number}
                                </td>,
                              ];
                            } else if (
                              col === "rack" &&
                              this.props.assetType !== AssetType.STORED
                            ) {
                              let rack_value = null;
                              if (isRackObject(value)) {
                                rack_value = value.row_letter + value.rack_num;
                              } else if (
                                isAssetObject(item) &&
                                item.chassis &&
                                item.chassis.rack
                              ) {
                                rack_value =
                                  item.chassis.rack.row_letter +
                                  item.chassis.rack.rack_num;
                              }

                              return (
                                <td style={getChangePlanRowStyle(item)}>
                                  {rack_value}
                                </td>
                              );
                            } else if (
                              isModelObject(item) &&
                              col === "display_color"
                            ) {
                              return (
                                <td
                                  style={{
                                    backgroundColor: value,
                                  }}
                                />
                              );
                            } else if (
                              isAssetObject(value) &&
                              col === "chassis"
                            ) {
                              return (
                                <td style={getChangePlanRowStyle(item)}>
                                  {value.hostname}
                                </td>
                              );
                            } else if (isDatacenterObject(value)) {
                              return (
                                <td style={getChangePlanRowStyle(item)}>
                                  {value.name}
                                </td>
                              );
                            } else if (this.shouldShowColumn(item, col)) {
                              return (
                                <td style={getChangePlanRowStyle(item)}>
                                  {value}
                                </td>
                              );
                            }

                            return null;
                          })}

                          <td
                            onClick={(event: any) => {
                              event.stopPropagation();
                            }}
                          >
                            {this.props.permissionState.admin &&
                            isUserObject(item) ? (
                              <div className="inline-buttons-user ">
                                {" "}
                                {this.renderPermissionsButton(item)}
                              </div>
                            ) : null}
                            <div className="inline-buttons">
                              {this.props.type !== ElementType.USER &&
                              !this.props.data &&
                              !this.props.isDecommissioned ? (
                                <AnchorButton
                                  className="button-table"
                                  intent="primary"
                                  minimal
                                  icon="edit"
                                  disabled={
                                    (this.props.changePlan &&
                                      this.props.type !== ElementType.ASSET) ||
                                    (this.props.type ===
                                      ElementType.CHANGEPLANS &&
                                      isChangePlanObject(item) &&
                                      item.execution_time)
                                      ? true
                                      : !(
                                          this.props.permissionState.admin ||
                                          (this.props.type ===
                                            ElementType.DATACENTER &&
                                            this.props.permissionState
                                              .asset_management) ||
                                          (this.props.type ===
                                            ElementType.OFFLINE_STORAGE_SITE &&
                                            this.props.permissionState
                                              .asset_management) ||
                                          (this.props.type ===
                                            ElementType.MODEL &&
                                            this.props.permissionState
                                              .model_management) ||
                                          (this.props.type ===
                                            ElementType.ASSET &&
                                            this.props.permissionState
                                              .asset_management) ||
                                          (this.props.type ===
                                            ElementType.ASSET &&
                                            isAssetObject(item) &&
                                            ((item.datacenter &&
                                              this.props.permissionState.site_permissions.includes(
                                                +item.datacenter.id
                                              )) ||
                                              (item.offline_storage_site &&
                                                this.props.permissionState.site_permissions.includes(
                                                  +item.offline_storage_site.id
                                                )))) ||
                                          (this.props.type ===
                                            ElementType.CHANGEPLANS &&
                                            (this.props.permissionState
                                              .asset_management ||
                                              this.props.permissionState
                                                .site_permissions.length > 0))
                                        )
                                  }
                                  onClick={(event: any) => {
                                    this.handleEditButtonClick(item);
                                    event.stopPropagation();
                                  }}
                                />
                              ) : null}
                              {!this.props.data &&
                              !this.props.isDecommissioned ? (
                                <Tooltip
                                  content={"Decommission"}
                                  position={Position.LEFT}
                                  disabled={
                                    this.props.type !== ElementType.ASSET ||
                                    this.shouldDisableDecommissionOrDeleteInline(
                                      item
                                    )
                                  }
                                >
                                  <AnchorButton
                                    className="button-table inline-button-inside-tooltip"
                                    intent="danger"
                                    minimal
                                    icon={
                                      this.props.type === ElementType.ASSET
                                        ? "remove"
                                        : "trash"
                                    }
                                    disabled={this.shouldDisableDecommissionOrDeleteInline(
                                      item
                                    )}
                                    onClick={
                                      this.props.type === ElementType.ASSET
                                        ? (event: any) => {
                                            this.handleDecommissionButtonClick(
                                              item
                                            );
                                            event.stopPropagation();
                                          }
                                        : (event: any) => {
                                            this.handleDeleteButtonClick(item);
                                            event.stopPropagation();
                                          }
                                    }
                                  />
                                </Tooltip>
                              ) : null}
                              {this.shouldShowPowerInline(item) ? (
                                <AnchorButton
                                  className="button-table"
                                  intent="warning"
                                  minimal
                                  icon="offline"
                                  disabled={this.shouldDisablePowerInline()}
                                  onClick={(event: any) => {
                                    this.handlePowerButtonClick(item);
                                    event.stopPropagation();
                                  }}
                                />
                              ) : null}
                            </div>{" "}
                            {/* TODO add logic for determining if isOwner for power button */}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ) : null
              ) : null
              // <Spinner
              //   className="table-spinner"
              //   size={Spinner.SIZE_STANDARD}
              // />
              // <h4 className="no-data-text">no {this.props.type} found </h4>
            }
          </table>

          {this.state.getDataInProgress ? (
            <Spinner className="table-spinner" size={Spinner.SIZE_STANDARD} />
          ) : null}
          {(!this.state.items || this.state.items.length === 0) &&
          !this.state.getDataInProgress ? (
            <Callout icon={IconNames.ERROR} title={"No " + this.props.type} />
          ) : null}
        </div>
      </div>
    );
  }
}
const mapStateToProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin,
    changePlan: state.changePlan,
    permissionState: state.permissionState,
    rackedAssetDataIsStale: state.rackedAssetDataIsStale,
    storedAssetDataIsStale: state.storedAssetDataIsStale,
    decommissionedAssetDataIsStale: state.decommissionedAssetDataIsStale,
    modelDataIsStale: state.modelDataIsStale,
  };
};

const mapDispatchToProps = (dispatch: any) => {
  return {
    updateChangePlans: (status: boolean) =>
      dispatch(actions.updateChangePlans(status)),
    markTableFresh: (freshTable: TableType) =>
      dispatch(actions.markTableFresh(freshTable)),
    markTablesStale: (staleTables: TableType[]) =>
      dispatch(actions.markTablesStale(staleTables)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ElementTable));
