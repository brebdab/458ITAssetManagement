import { Classes, Dialog } from "@blueprintjs/core";
import * as React from "react";
import {
  ElementObjectType,
  ElementType,
  isAssetObject,
  isModelObject,
  FormObjectType,
  isDatacenterObject,
  DatacenterObject
} from "../utils/utils";
import { ALL_DATACENTERS } from "../components/elementView/elementTabContainer";
import RackSelectView from "../components/elementView/rackSelectView";
import AssetForm from "./assetForm";
import ModelForm from "./modelForm";
import DatacenterForm from "./datacenterForm";
import WrappedRegistrationForm from "./auth/register";
import { FormTypes } from "./formUtils";
interface FormPopupState {}
interface FormPopupProps {
  isOpen: boolean;
  type: FormTypes;
  datacenters?: Array<DatacenterObject>;
  currDatacenter?: DatacenterObject;
  initialValues?: ElementObjectType;
  elementName: ElementType;
  handleClose(): void;
  submitForm(element: FormObjectType, headers: any): Promise<any> | void;
}

class FormPopup extends React.Component<FormPopupProps, FormPopupState> {
  render() {
    return (
      <Dialog
        className={Classes.DARK}
        usePortal={true}
        enforceFocus={true}
        canEscapeKeyClose={true}
        canOutsideClickClose={true}
        isOpen={this.props.isOpen}
        onClose={this.props.handleClose}
        title={this.props.type + " " + this.props.elementName.slice(0, -1)}
      >
        {this.props.elementName === ElementType.MODEL ? (
          <ModelForm
            type={FormTypes.CREATE}
            submitForm={this.props.submitForm}
            initialValues={
              isModelObject(this.props.initialValues)
                ? this.props.initialValues
                : undefined
            }
          />
        ) : null}
        {this.props.elementName === ElementType.ASSET ? (
          <AssetForm
            datacenters={this.props.datacenters ? this.props.datacenters : []}
            currDatacenter={
              this.props.currDatacenter
                ? this.props.currDatacenter
                : ALL_DATACENTERS
            }
            type={FormTypes.CREATE}
            submitForm={this.props.submitForm}
            initialValues={
              isAssetObject(this.props.initialValues)
                ? this.props.initialValues
                : undefined
            }
          />
        ) : null}
        {this.props.elementName === ElementType.RACK ? (
          <RackSelectView submitForm={this.props.submitForm} />
        ) : null}
        {this.props.elementName === ElementType.USER ? (
          <WrappedRegistrationForm authSignup={this.props.submitForm} />
        ) : null}
        {this.props.elementName === ElementType.DATACENTER ? (
          <DatacenterForm
            type={FormTypes.CREATE}
            submitForm={this.props.submitForm}
            initialValues={
              isDatacenterObject(this.props.initialValues)
                ? this.props.initialValues
                : undefined
            }
          />
        ) : null}
      </Dialog>
    );
  }
}

export default FormPopup;
