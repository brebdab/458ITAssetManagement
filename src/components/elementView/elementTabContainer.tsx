import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Tabs, Tab } from "@blueprintjs/core";
import ElementTab from "./elementTab";
import { RouteComponentProps } from "react-router";
import "./elementView.scss";
import { connect } from "react-redux";
import { ElementType, DatacenterObject, getHeaders } from "../../utils/utils";
import RackTab from "./rackTab";
import { API_ROOT } from "../../utils/api-config";
import axios from "axios";

interface ElementTabContainerProps {
  isAdmin: boolean;
  token: string;
}
interface ElementTabContainerState {
  datacenters: Array<DatacenterObject>;
  currDatacenter: DatacenterObject;
}
export const ALL_DATACENTERS: DatacenterObject = {
  id: "",
  name: "All datacenters",
  abbreviation: "ALL"
};
var console: any = {};
console.log = function() {};

class ElementTabContainer extends React.Component<
  ElementTabContainerProps & RouteComponentProps,
  ElementTabContainerState
> {
  state = {
    datacenters: [],
    currDatacenter: ALL_DATACENTERS
  };

  onDatacenterSelect = (datacenter: DatacenterObject) => {
    this.setState({
      currDatacenter: datacenter
    });
  };
  getDatacenters = () => {
    const headers = getHeaders(this.props.token);
    // console.log(API_ROOT + "api/datacenters/get-all");
    axios
      .post(API_ROOT + "api/datacenters/get-many", {}, headers)
      .then(res => {
        console.log(res.data.datacenters);
        const datacenters = res.data.datacenters as Array<DatacenterObject>;
        datacenters.push(ALL_DATACENTERS);
        this.setState({
          datacenters
        });
      })
      .catch(err => {
        console.log(err);
      });
  };
  componentDidMount = () => {
    this.getDatacenters();
  };
  public render() {
    return (
      <Tabs
        className="element-view"
        animate={true}
        id="ElementViewer"
        key={"vertical"}
        renderActiveTabPanelOnly={false}
        vertical={true}
        large
      >
        <Tab
          className="tab"
          id="rack"
          title="Racks"
          panel={
            <RackTab
              datacenters={this.state.datacenters}
              currDatacenter={this.state.currDatacenter}
              onDatacenterSelect={this.onDatacenterSelect}
            />
          }
        />
        <Tab
          className="tab do-not-print"
          id="asset"
          title="Assets"
          panel={
            <ElementTab
              datacenters={this.state.datacenters}
              currDatacenter={this.state.currDatacenter}
              onDatacenterSelect={this.onDatacenterSelect}
              {...this.props}
              element={ElementType.ASSET}
            />
          }
        />

        <Tab
          className="tab do-not-print"
          id="model"
          title="Models"
          panel={<ElementTab {...this.props} element={ElementType.MODEL} />}
        />

        {this.props.isAdmin ? (
          <Tab
            className="tab do-not-print"
            id="datacenter"
            title="Datacenters"
            panel={
              <ElementTab
                {...this.props}
                updateDatacenters={this.getDatacenters}
                element={ElementType.DATACENTER}
              />
            }
          />
        ) : null}

        <Tabs.Expander />
      </Tabs>
    );
  }
}

const mapStateToProps = (state: any) => {
  return {
    isAdmin: state.admin,
    token: state.token
  };
};

export default connect(mapStateToProps)(ElementTabContainer);
